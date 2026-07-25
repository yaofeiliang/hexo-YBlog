import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const postsDir = path.join(ROOT, 'source/_posts');
const entries = [];
async function visit(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await visit(target);
    else if (entry.name.endsWith('.md')) entries.push(target);
  }
}
await visit(postsDir);
let errors = 0;
let warnings = 0;
for (const target of entries) {
  const relative = path.relative(ROOT, target);
  const { data, content } = matter(await fs.readFile(target, 'utf8'));
  if (!data.title || !data.date) {
    console.error(`ERROR ${relative}: title and date are required`);
    errors++;
  }
  if (!data.description && content.replace(/[#>*`\s]/g, '').length > 0) {
    console.warn(`WARN  ${relative}: add description for stronger SEO`);
    warnings++;
  }
  if (data.content_type === 'digest' && (!data.source_count || !content.includes('## 来源与声明'))) {
    console.error(`ERROR ${relative}: digest must declare sources and source_count`);
    errors++;
  }
}
console.log(`Validated ${entries.length} post(s): ${errors} error(s), ${warnings} warning(s).`);
process.exitCode = errors ? 1 : 0;
