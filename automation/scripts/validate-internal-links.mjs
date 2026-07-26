import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const publicDir = path.join(ROOT, 'public');
const htmlFiles = [];

async function visit(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(target);
    else if (entry.name.endsWith('.html')) htmlFiles.push(target);
  }
}

function isIgnored(value) {
  return !value || value.startsWith('#') || /^(https?:)?\/\//i.test(value) ||
    /^(mailto:|tel:|data:|javascript:)/i.test(value);
}

function publicTarget(url, source) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.split('#')[0].split('?')[0]);
  } catch {
    return null;
  }
  if (!pathname) return null;
  const resolved = pathname.startsWith('/')
    ? path.join(publicDir, pathname)
    : path.resolve(path.dirname(source), pathname);
  if (path.extname(resolved)) return resolved;
  return path.join(resolved, 'index.html');
}

await visit(publicDir);
let errors = 0;
for (const source of htmlFiles) {
  const html = await fs.readFile(source, 'utf8');
  const pattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    const url = match[1];
    if (isIgnored(url)) continue;
    const target = publicTarget(url, source);
    if (!target) continue;
    try {
      await fs.access(target);
    } catch {
      console.error(`ERROR ${path.relative(ROOT, source)}: missing internal target ${url}`);
      errors++;
    }
  }
}

console.log(`Validated ${htmlFiles.length} generated page(s): ${errors} broken internal link(s).`);
process.exitCode = errors ? 1 : 0;
