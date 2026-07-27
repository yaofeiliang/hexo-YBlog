import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const START = '2019-01';
const END = '2026-07';
const write = process.argv.includes('--write');
const cacheDir = path.join(ROOT, 'automation/state/historical-news-cache');
const collectionDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const sources = [
  { repo: 'vercel/next.js', name: 'Next.js', topic: 'next-js', reason: 'React 应用框架的正式版本发布与维护信息。' },
  { repo: 'kubernetes/kubernetes', name: 'Kubernetes', topic: 'kubernetes', reason: '云原生编排平台的正式版本发布与维护信息。' },
  { repo: 'angular/angular', name: 'Angular', topic: 'angular', reason: 'Web 应用框架的正式版本发布与维护信息。' },
  { repo: 'webpack/webpack', name: 'webpack', topic: 'webpack', reason: '前端构建工具的正式版本发布与维护信息。' },
  { repo: 'babel/babel', name: 'Babel', topic: 'babel', reason: 'JavaScript 编译工具链的正式版本发布与维护信息。' },
  { repo: 'rust-lang/rust', name: 'Rust', topic: 'rust', reason: 'Rust 编程语言的正式版本发布信息。' },
  { repo: 'microsoft/TypeScript', name: 'TypeScript', topic: 'typescript', includePrerelease: true, reason: 'TypeScript 语言与工具链的正式版本或候选版本发布信息。' },
  { repo: 'microsoft/vscode', name: 'Visual Studio Code', topic: 'vscode', reason: '开发工具的正式版本发布信息。' }
];

const months = [];
for (let year = 2019; year <= 2026; year++) {
  for (let month = 1; month <= 12; month++) {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    if (period >= START && period <= END) months.push(period);
  }
}

const escapeYaml = (value) => JSON.stringify(String(value));
const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);
const periodOf = (value) => dateOnly(value).slice(0, 7);
const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 72) || 'release';

const getJson = (url) => new Promise((resolve, reject) => {
  const request = https.get(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'YBlog-HistoricalNews/1.0'
    }
  }, (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      if (response.statusCode !== 200) {
        reject(new Error(`${url}: GitHub API returned ${response.statusCode}`));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`${url}: invalid JSON response (${error.message})`));
      }
    });
  });
  request.setTimeout(60_000, () => request.destroy(new Error(`${url}: request timed out`)));
  request.on('error', reject);
});

async function fetchReleases(source) {
  const cachePath = path.join(cacheDir, `${source.repo.replace('/', '__')}.json`);
  try {
    return JSON.parse(await fs.readFile(cachePath, 'utf8'));
  } catch { /* cache miss */ }
  const releases = [];
  for (let page = 1; page <= 4; page++) {
    const url = `https://api.github.com/repos/${source.repo}/releases?per_page=100&page=${page}`;
    let pageItems;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        pageItems = await getJson(url);
        break;
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    releases.push(...pageItems);
    const oldest = pageItems.at(-1)?.published_at;
    if (oldest && periodOf(oldest) < START) break;
  }
  const verified = releases
    .filter((release) => !release.draft && (!release.prerelease || source.includePrerelease) && release.published_at && release.html_url && (release.name || release.tag_name))
    .filter((release) => {
      const period = periodOf(release.published_at);
      return period >= START && period <= END;
    })
    .map((release) => ({
      source: source.name,
      repository: source.repo,
      topic: source.topic,
      reason: source.reason,
      title: (release.name || release.tag_name).trim(),
      url: release.html_url,
      publishedAt: release.published_at,
      period: periodOf(release.published_at)
    }));
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(verified, null, 2)}\n`);
  return verified;
}

const bySource = [];
for (const source of sources) {
  const releases = await fetchReleases(source);
  console.log(`${source.name}: ${releases.length} verified releases`);
  bySource.push(releases);
}

const selected = [];
const gaps = [];
for (const period of months) {
  const candidates = bySource
    .map((releases) => releases.filter((release) => release.period === period).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)))
    .filter((releases) => releases.length > 0);
  const monthly = [];
  let index = 0;
  while (monthly.length < 3 && candidates.some((releases) => releases.length > index)) {
    for (const releases of candidates) {
      if (monthly.length === 3) break;
      if (releases[index]) monthly.push(releases[index]);
    }
    index++;
  }
  if (monthly.length !== 3) {
    gaps.push(`${period} (${monthly.length}/3)`);
    continue;
  }
  selected.push(...monthly);
}
if (gaps.length) {
  throw new Error(`Missing verifiable monthly coverage: ${gaps.join(', ')}. Refusing to fabricate filler items.`);
}

const duplicateUrls = selected.filter((item, index) => selected.findIndex((candidate) => candidate.url === item.url) !== index);
if (duplicateUrls.length) throw new Error(`Duplicate release URLs selected: ${duplicateUrls.map((item) => item.url).join(', ')}`);

const provenance = {
  schemaVersion: 1,
  collectedAt: `${collectionDate}T09:00:00+08:00`,
  policy: 'Each item is a retrospective index of a verified official release. It is not represented as an article originally published by this site on the source date.',
  items: selected.map((item) => ({
    historicalPeriod: item.period,
    source: item.source,
    repository: item.repository,
    title: item.title,
    sourceUrl: item.url,
    sourcePublished: item.publishedAt,
    topic: item.topic,
    selectionReason: item.reason
  }))
};

console.log(`Selected ${selected.length} releases across ${months.length} months.`);
if (!write) {
  console.log('Dry run only. Re-run with --write to create provenance and Markdown files.');
  process.exit(0);
}

const postsRoot = path.join(ROOT, 'source/_posts/news');
for (const [index, item] of selected.entries()) {
  const itemNumber = String((index % 3) + 1).padStart(2, '0');
  const year = item.period.slice(0, 4);
  const slug = slugify(`${item.repository.split('/').at(-1)}-${item.title}`);
  const relativePath = `source/_posts/news/${year}/${item.period}-${itemNumber}-${slug}.md`;
  const target = path.join(ROOT, relativePath);
  const markdown = `---
title: ${escapeYaml(`[技术资讯] ${item.title}`)}
date: ${collectionDate} 09:00:00
updated: ${collectionDate} 09:00:00
description: ${escapeYaml(`${item.source} 于 ${dateOnly(item.publishedAt)} 发布的正式版本记录，由姚飞亮于 ${collectionDate} 后期整理。`)}
author: 姚飞亮整理
permalink: news/${year}/${slug}/
categories:
  - 资讯
tags:
  - 技术资讯
  - ${item.topic}
catalog: false
header-img: /img/article_header/article_bg.jpg
content_type: historical_digest
ai_generated: false
source_count: 1
historical_period: ${item.period}
source_url: ${item.url}
source_published: ${dateOnly(item.publishedAt)}
collection_date: ${collectionDate}
---

> 本文由姚飞亮于 ${collectionDate} **后期整理**，用于建立技术动态索引；不代表当时即在本站发布，也不替代原始发布说明。

## 资讯摘要

${item.source} 于 ${dateOnly(item.publishedAt)} 发布了「${item.title}」。本文仅收录该官方发布记录的标题、时间与入口，不转载原始内容。

- 官方来源：${item.source}
- 原始发布日期：${dateOnly(item.publishedAt)}
- 收录月份：${item.period}
- 收录理由：${item.reason}

## 原始来源

- 发布页：<${item.url}>

## 来源与声明

- 本文是对官方发布记录的后期整理，不代表姚飞亮在 ${item.period} 已在本站发表本文。
- 事实、版本说明和版权以原始来源为准；如发现链接或日期有误，请联系 <yaoadmin@sina.com>。
`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, markdown, 'utf8');
  console.log(`Created ${relativePath}`);
}

await fs.mkdir(path.join(ROOT, 'automation/state'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'automation/state/historical-news-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
console.log('Created automation/state/historical-news-provenance.json');
