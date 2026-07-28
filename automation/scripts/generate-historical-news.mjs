import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const START = '2019-01';
const END = '2026-07';
const write = process.argv.includes('--write');
const cacheDir = path.join(ROOT, 'automation/state/historical-news-cache-v2');
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
const sourceProfiles = {
  'Next.js': {
    title: '应用框架升级前要看的三件事',
    audience: '使用 React、SSR、静态生成或全栈路由的应用团队',
    concerns: ['渲染与路由行为是否变化', '构建产物和部署链路是否需要调整', '依赖版本与升级指南是否存在破坏性改动'],
    nextStep: '先在预发布环境运行构建与核心页面回归，再决定是否升级生产依赖。'
  },
  Kubernetes: {
    title: '云原生集群升级的版本信号',
    audience: '维护 Kubernetes 集群、控制平面或工作负载平台的工程团队',
    concerns: ['版本偏差与升级顺序', 'API 弃用、组件兼容性和安全修复', '控制平面与节点的回滚预案'],
    nextStep: '对照版本偏差策略和弃用 API 清单，先在非生产集群完成升级演练。'
  },
  Angular: {
    title: '前端框架升级该关注什么',
    audience: '使用 Angular、Angular CLI 或相关构建工具链的前端团队',
    concerns: ['框架、CLI 与 TypeScript 的兼容区间', '模板编译和构建流程是否变化', '依赖升级与迁移脚本的适用范围'],
    nextStep: '运行官方迁移工具前，先锁定依赖版本并为核心页面补齐构建和端到端测试。'
  },
  webpack: {
    title: '构建链路升级的风险检查表',
    audience: '维护 webpack 构建配置、Loader、Plugin 或前端发布流水线的开发者',
    concerns: ['构建配置与插件兼容性', '产物体积、缓存策略和开发服务器行为', '升级后构建速度与错误信息的变化'],
    nextStep: '保留旧构建产物作对照，比较构建日志、包体积和关键页面的运行结果。'
  },
  Babel: {
    title: '编译工具链更新如何影响项目',
    audience: '依赖 Babel 转译、Polyfill 或多环境兼容策略的前端与全栈开发者',
    concerns: ['预设、插件与目标浏览器配置', '转译结果和 Polyfill 注入策略', '锁文件与插件生态的兼容性'],
    nextStep: '在升级分支比较编译产物和测试覆盖，重点检查语法转换与浏览器兼容性。'
  },
  Rust: {
    title: '语言版本发布对工程实践的影响',
    audience: '使用 Rust 编写服务、命令行工具或基础设施组件的开发者',
    concerns: ['稳定版语言与标准库变化', '编译器诊断和 lint 行为', '依赖、工具链与 CI 镜像版本'],
    nextStep: '固定 toolchain 后执行完整测试与 clippy 检查，再评估是否将版本升级写入 CI。'
  },
  TypeScript: {
    title: '类型系统升级前的兼容性提示',
    audience: '维护 TypeScript 应用、库或声明文件的开发者',
    concerns: ['类型推断与严格检查带来的报错变化', '编译目标、模块解析和配置选项', '第三方声明文件与构建工具兼容性'],
    nextStep: '先以 noEmit 模式运行类型检查，集中处理新增报错后再更新正式构建配置。'
  },
  'Visual Studio Code': {
    title: '开发工具更新值得马上尝试吗',
    audience: '使用 Visual Studio Code 及其扩展生态的个人开发者和团队',
    concerns: ['编辑器功能与扩展兼容性', '远程开发、调试和语言服务体验', '团队设置同步与稳定性'],
    nextStep: '先在个人环境更新并验证关键扩展、调试器与远程开发流程，再推广到团队。'
  }
};
const summarizeSource = (value = '') => value
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
  .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
  .replace(/[#>*_`]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 560);

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
      period: periodOf(release.published_at),
      sourceSummary: summarizeSource(release.body)
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
  const profile = sourceProfiles[item.source];
  const sourceSummary = item.sourceSummary || '官方发布页未提供可提取的摘要，请直接阅读原始发布说明了解具体新增功能与修复。';
  const relativePath = `source/_posts/news/${year}/${item.period}-${itemNumber}-${slug}.md`;
  const target = path.join(ROOT, relativePath);
  const markdown = `---
title: ${escapeYaml(`[技术观察] ${item.source} ${item.title}：${profile.title}`)}
date: ${dateOnly(item.publishedAt)} 09:00:00
updated: ${dateOnly(item.publishedAt)} 09:00:00
description: ${escapeYaml(`${item.source} 于 ${dateOnly(item.publishedAt)} 发布 ${item.title}。本文提炼升级关注点、官方说明摘要与实践检查项。`)}
permalink: /news/${year}/${slug}/
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

> 本文是对官方发布记录的**后期整理**。它帮助读者判断“这次更新和我有什么关系”，不代表当时即在本站发布，也不替代原始发布说明。

## 一分钟看懂

${item.source} 于 ${dateOnly(item.publishedAt)} 发布「${item.title}」。这类版本发布通常不只是“更新一个版本号”：它会影响 ${profile.audience} 的依赖选择、升级节奏与验证成本。

- **适合谁看：** ${profile.audience}
- **为什么值得关注：** ${item.reason}
- **技术发布时间：** ${dateOnly(item.publishedAt)}

## 这次更新该关注什么

不要只看版本号。打开官方说明时，建议优先核对以下问题：

${profile.concerns.map((concern) => `- ${concern}`).join('\n')}

这些检查项并不声称是该版本新增功能；它们是评估 ${item.source} 发布记录时最容易影响实际项目的维度。

## 官方发布说明摘要

> 以下内容根据官方发布页提取，用于帮助定位原始说明；具体功能、修复范围与兼容性结论请以原文为准。

${sourceSummary}

## 给项目的实用建议

${profile.nextStep}

如果你的项目依赖该工具链，建议把发布页加入升级任务：记录当前版本、目标版本、验证结果和回滚方式。这样下次遇到类似发布时，团队能更快判断是否值得跟进。

## 原始来源与阅读入口

- 官方来源：${item.source}
- 原始发布日期：${dateOnly(item.publishedAt)}
- 收录月份：${item.period}
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
