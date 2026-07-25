import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Parser from 'rss-parser';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const maxArg = process.argv.find((arg) => arg.startsWith('--max-items='));
const dateArg = process.argv.find((arg) => arg.startsWith('--date='));
const today = dateArg ? dateArg.slice('--date='.length) : new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const file = (...parts) => path.join(ROOT, ...parts);
const readJson = async (relative) => JSON.parse(await fs.readFile(file(relative), 'utf8'));
const normalizeUrl = (url) => {
  const parsed = new URL(url);
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^utm_|^ref$|^source$/i.test(key)) parsed.searchParams.delete(key);
  }
  return parsed.toString();
};
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeYaml = (value = '') => JSON.stringify(String(value));
const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const [{ sources }, topics, state] = await Promise.all([
  readJson('automation/config/sources.json'),
  readJson('automation/config/topics.json'),
  readJson('automation/state/seen-urls.json')
]);
const requestedMax = maxArg ? Number(maxArg.slice('--max-items='.length)) : topics.dailyItemLimit;
const parser = new Parser({ timeout: 15_000, headers: { 'User-Agent': 'YBlog-NewsDigest/1.0 (+https://yaofeiliang.top)' } });
const now = new Date();

function scoreItem(item, source) {
  const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
  const topicMatches = Object.entries(topics.keywords).filter(([, words]) => words.some((word) => text.includes(word))).map(([topic]) => topic);
  const ageDays = item.publishedAt ? Math.max(0, (now - item.publishedAt) / 86_400_000) : 30;
  return {
    score: source.weight + topicMatches.length * 12 - Math.min(ageDays, 30),
    tags: [...new Set([...source.topics, ...topicMatches])]
  };
}

const fetched = await Promise.allSettled(sources.map(async (source) => {
  const feed = await parser.parseURL(source.url);
  return { source, items: (feed.items || []).slice(0, source.maxItems) };
}));

const failures = fetched.filter((result) => result.status === 'rejected');
for (const failure of failures) console.warn(`Source failed: ${failure.reason.message}`);

const candidates = [];
for (const result of fetched) {
  if (result.status !== 'fulfilled') continue;
  const { source, items } = result.value;
  for (const item of items) {
    if (!item.link || !item.title) continue;
    let url;
    try { url = normalizeUrl(item.link); } catch { continue; }
    const id = hash(url);
    if (state.items[id]) continue;
    const publishedAt = parseDate(item.isoDate || item.pubDate);
    const scored = scoreItem({ ...item, publishedAt }, source);
    if (scored.score < topics.minimumScore) continue;
    candidates.push({
      id, url, title: stripHtml(item.title), source: source.name,
      sourceId: source.id, publishedAt, score: scored.score, tags: scored.tags
    });
  }
}

const selected = candidates
  .sort((a, b) => b.score - a.score || (b.publishedAt || 0) - (a.publishedAt || 0))
  .slice(0, Math.max(1, requestedMax));

if (!selected.length) {
  console.log('No eligible unseen items. Nothing to publish.');
  process.exit(0);
}

const postRelative = `source/_posts/news/${today}-daily-tech-brief.md`;
const postPath = file(postRelative);
try {
  await fs.access(postPath);
  console.log(`Digest already exists: ${postRelative}`);
  process.exit(0);
} catch { /* expected */ }

const tags = [...new Set(['每日简报', ...selected.flatMap((item) => item.tags)])].slice(0, 8);
const markdown = `---
title: ${escapeYaml(`[每日技术简报] ${today}`)}
date: ${today} 09:00:00
updated: ${today} 09:00:00
description: ${escapeYaml(`精选 ${selected.length} 条来自官方技术来源的最新动态，涵盖 ${tags.slice(1, 4).join('、')}。`)}
categories:
  - 资讯
tags:
${tags.map((tag) => `  - ${escapeYaml(tag)}`).join('\n')}
catalog: false
header-img: /img/article_header/article_bg.jpg
content_type: digest
ai_generated: false
source_count: ${selected.length}
---

> 本期简报由自动化任务依据**官方 RSS 元数据**生成，仅提供标题与原文入口；不转载原文内容。请以原始来源为准。

## 今日动态

${selected.map((item, index) => `### ${index + 1}. ${item.title}\n\n- 来源：${item.source}\n- 原文：<${item.url}>\n${item.publishedAt ? `- 发布时间：${item.publishedAt.toISOString().slice(0, 10)}\n` : ''}- 入选原因：官方来源 / ${item.tags.join('、')}\n`).join('\n')}

---

## 来源与声明

- 本文是自动生成的链接简报，不代表本站立场，也不构成对原始内容的替代。
- 各条内容的版权归原作者及来源站点所有；如有问题，请联系 <${process.env.CONTACT_EMAIL || 'yaoadmin@sina.com'}>。
`;

console.log(`Selected ${selected.length} item(s) for ${today}:`);
selected.forEach((item) => console.log(`- [${Math.round(item.score)}] ${item.source}: ${item.title}`));
if (!write) {
  console.log('Dry run only. Re-run with --write to create a digest.');
  process.exit(0);
}

await fs.mkdir(path.dirname(postPath), { recursive: true });
await fs.writeFile(postPath, markdown, 'utf8');
for (const item of selected) state.items[item.id] = { url: item.url, title: item.title, firstSeen: now.toISOString(), source: item.sourceId };
await fs.writeFile(file('automation/state/seen-urls.json'), `${JSON.stringify(state, null, 2)}\n`);
console.log(`Created ${postRelative}`);
