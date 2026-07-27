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
  if (data.content_type === 'historical_digest') {
    const requiredFields = ['source_url', 'source_published', 'historical_period', 'collection_date'];
    const missing = requiredFields.filter((field) => !data[field]);
    if (missing.length || data.source_count !== 1 || !content.includes('## 来源与声明')) {
      console.error(`ERROR ${relative}: historical_digest requires one source, provenance metadata, and a source declaration`);
      errors++;
    }
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(data.historical_period))) {
      console.error(`ERROR ${relative}: historical_period must use YYYY-MM`);
      errors++;
    }
    if (Number.isNaN(new Date(data.source_published).getTime()) || Number.isNaN(new Date(data.collection_date).getTime())) {
      console.error(`ERROR ${relative}: source_published and collection_date must be valid dates`);
      errors++;
    }
    if (data.source_url && !/^https:\/\//.test(String(data.source_url))) {
      console.error(`ERROR ${relative}: source_url must use HTTPS`);
      errors++;
    }
    if (!content.includes('后期整理') || !content.includes('不代表当时即在本站发布')) {
      console.error(`ERROR ${relative}: historical_digest must disclose its retrospective collection status`);
      errors++;
    }
  }
  if (data.difficulty && !['beginner', 'intermediate', 'advanced'].includes(data.difficulty)) {
    console.error(`ERROR ${relative}: difficulty must be beginner, intermediate, or advanced`);
    errors++;
  }
  if (data.prerequisites && !Array.isArray(data.prerequisites)) {
    console.error(`ERROR ${relative}: prerequisites must be a list`);
    errors++;
  }
  if (data.last_verified && Number.isNaN(new Date(data.last_verified).getTime())) {
    console.error(`ERROR ${relative}: last_verified must be a valid date`);
    errors++;
  }
  if (data.translations && (Array.isArray(data.translations) || typeof data.translations !== 'object')) {
    console.error(`ERROR ${relative}: translations must map locale codes to article URLs`);
    errors++;
  }
}
console.log(`Validated ${entries.length} post(s): ${errors} error(s), ${warnings} warning(s).`);
process.exitCode = errors ? 1 : 0;
