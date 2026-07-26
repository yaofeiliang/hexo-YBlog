import fs from 'node:fs/promises';

const config = await fs.readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
const databaseId = config.match(/database_id\s*=\s*"([^"]+)"/)?.[1];

if (!databaseId || databaseId === '00000000-0000-0000-0000-000000000000') {
  console.error('ERROR: Replace the example D1 database_id in admin/wrangler.toml before deployment.');
  process.exit(1);
}

console.log('Admin deployment configuration has a non-placeholder D1 database ID.');
