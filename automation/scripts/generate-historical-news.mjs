import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import {
  annotateOfficialLine,
  closingNote,
  hashSeed,
  humanBridge,
  pick,
  professionalTechDepth,
  sceneForTech
} from './lib/article-voice.mjs';

const ROOT = process.cwd();
const START = '2019-01';
const END = '2026-07';
const write = process.argv.includes('--write');
// v3 保留官方 Release 的原始 Markdown，供生成器提取完整条目而不是截断句子。
const cacheDir = path.join(ROOT, 'automation/state/historical-news-cache-v3');
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
    plainIntro: 'Next.js 可以把 React 页面做成网站或全栈应用。你可以把它理解为“帮 React 项目安排页面、打包代码，并决定页面什么时候生成”的工具：有的页面在服务器先生成，有的页面在浏览器打开后再补齐内容。',
    vocabulary: [
      ['SSR（服务端渲染）', '用户打开页面时，由服务器先把可见内容准备好，再交给浏览器继续运行。'],
      ['静态生成', '在发布网站前提前生成 HTML，访问时直接发送成品页面，通常更快也更省服务器。'],
      ['路由', '网址和页面之间的对应规则，例如访问 /about 时应该显示“关于”页面。']
    ],
    workflow: '把它当成一次“网站生产线”的检查：先安装新版本，再执行构建命令，最后用测试环境打开首页、列表页和动态详情页，确认页面内容、跳转和接口请求都正常。',
    concerns: ['渲染与路由行为是否变化', '构建产物和部署链路是否需要调整', '依赖版本与升级指南是否存在破坏性改动'],
    nextStep: '先在预发布环境运行构建与核心页面回归，再决定是否升级生产依赖。'
  },
  Kubernetes: {
    title: '云原生集群升级的版本信号',
    audience: '维护 Kubernetes 集群、控制平面或工作负载平台的工程团队',
    plainIntro: 'Kubernetes（常简称 K8s）是管理大量容器应用的平台。可以把它想成一个调度中心：开发者提交“我想运行几个服务”的需求，Kubernetes 负责把服务安排到机器上、发现故障后重新拉起，并让访问流量找到正确的服务。',
    vocabulary: [
      ['集群', '多台服务器组成的资源池，由同一套规则统一管理。'],
      ['控制平面', '负责下达和协调指令的核心组件，相当于调度中心的大脑。'],
      ['工作负载', '实际运行的应用，例如网站、接口服务或后台任务。']
    ],
    workflow: '升级前先记录集群版本、节点数量和关键业务状态；在非生产集群按相同顺序演练；升级后检查节点是否就绪、核心服务是否可用，再逐步观察业务指标。',
    concerns: ['版本偏差与升级顺序', 'API 弃用、组件兼容性和安全修复', '控制平面与节点的回滚预案'],
    nextStep: '对照版本偏差策略和弃用 API 清单，先在非生产集群完成升级演练。'
  },
  Angular: {
    title: '前端框架升级该关注什么',
    audience: '使用 Angular、Angular CLI 或相关构建工具链的前端团队',
    plainIntro: 'Angular 是用来制作网页和管理复杂前端界面的框架。它把页面拆成可复用的组件，并提供数据绑定、表单、路由和构建工具。即使你刚接触前端，也可以把它理解为一套“搭网页零件、让零件协同工作”的工具箱。',
    vocabulary: [
      ['组件', '网页中可以反复使用的一块界面，例如导航栏、搜索框或商品卡片。'],
      ['CLI', '命令行工具；通过输入命令创建项目、启动开发服务和打包发布。'],
      ['迁移', '升级框架时自动或手动修改旧代码、配置和依赖，使其符合新版本规则。']
    ],
    workflow: '先复制一个独立升级分支，保存当前锁文件；按官方工具提示升级；然后依次验证编译、单元测试、路由跳转、表单提交和正式打包。',
    concerns: ['框架、CLI 与 TypeScript 的兼容区间', '模板编译和构建流程是否变化', '依赖升级与迁移脚本的适用范围'],
    nextStep: '运行官方迁移工具前，先锁定依赖版本并为核心页面补齐构建和端到端测试。'
  },
  webpack: {
    title: '构建链路升级的风险检查表',
    audience: '维护 webpack 构建配置、Loader、Plugin 或前端发布流水线的开发者',
    plainIntro: 'webpack 是前端项目的“打包工厂”。开发时你写的是很多 JavaScript、样式和图片文件；webpack 会把它们分析、转换并打成浏览器能高效加载的文件。网站能否正常发布，常常取决于这条打包链路。',
    vocabulary: [
      ['构建', '把源代码转换为可部署文件的过程。'],
      ['Loader', '处理某类文件的转换器，例如把样式或 TypeScript 转成浏览器能识别的内容。'],
      ['Plugin', '在打包流程中扩展功能的插件，例如生成 HTML、压缩代码或复制资源。']
    ],
    workflow: '先保留旧版本构建产物作为对照；升级后比较构建是否成功、警告是否增加、文件体积是否异常，并在浏览器检查首页、懒加载页面和静态资源。',
    concerns: ['构建配置与插件兼容性', '产物体积、缓存策略和开发服务器行为', '升级后构建速度与错误信息的变化'],
    nextStep: '保留旧构建产物作对照，比较构建日志、包体积和关键页面的运行结果。'
  },
  Babel: {
    title: '编译工具链更新如何影响项目',
    audience: '依赖 Babel 转译、Polyfill 或多环境兼容策略的前端与全栈开发者',
    plainIntro: 'Babel 是 JavaScript 的“翻译器”。开发者可以使用较新的语法写代码，Babel 再把它转换为目标浏览器或旧环境也能理解的写法。它通常隐藏在构建工具背后，但会直接影响代码能在哪些设备上运行。',
    vocabulary: [
      ['转译', '不改变程序目的，只把一种写法转换成另一种兼容写法。'],
      ['预设', '一组常用转换规则的集合，用来决定要支持哪些语法和环境。'],
      ['Polyfill', '为旧环境补上缺失 API 的兼容代码。']
    ],
    workflow: '升级后不要只看构建成功；请在目标浏览器或自动化测试环境运行关键页面，比较转换后的代码、错误日志和兼容性测试结果。',
    concerns: ['预设、插件与目标浏览器配置', '转译结果和 Polyfill 注入策略', '锁文件与插件生态的兼容性'],
    nextStep: '在升级分支比较编译产物和测试覆盖，重点检查语法转换与浏览器兼容性。'
  },
  Rust: {
    title: '语言版本发布对工程实践的影响',
    audience: '使用 Rust 编写服务、命令行工具或基础设施组件的开发者',
    plainIntro: 'Rust 是一门强调性能和内存安全的编程语言。它常被用于命令行工具、网络服务和基础设施软件。对初学者来说，可以先把它理解为：在编译阶段尽量提前发现错误，减少程序运行后才暴露的问题。',
    vocabulary: [
      ['编译器', '把 Rust 源代码检查并转换为可执行程序的工具。'],
      ['标准库', '语言自带的基础功能集合，例如字符串、文件和网络处理能力。'],
      ['工具链', '编译器、包管理器和代码检查工具等一组配套工具。']
    ],
    workflow: '先在开发机安装目标工具链，不立即替换 CI；执行格式化、测试和静态检查，确认依赖都能编译，再将版本写入团队的构建配置。',
    concerns: ['稳定版语言与标准库变化', '编译器诊断和 lint 行为', '依赖、工具链与 CI 镜像版本'],
    nextStep: '固定 toolchain 后执行完整测试与 clippy 检查，再评估是否将版本升级写入 CI。'
  },
  TypeScript: {
    title: '类型系统升级前的兼容性提示',
    audience: '维护 TypeScript 应用、库或声明文件的开发者',
    plainIntro: 'TypeScript 是 JavaScript 的“带说明书版本”。它允许你给变量、函数参数和返回结果标注类型，在真正运行代码前先检查许多拼写、传参和数据形状错误。最终发布到浏览器或 Node.js 的仍然是 JavaScript。',
    vocabulary: [
      ['类型检查', '在执行程序前确认数据是否按约定被使用的过程。'],
      ['声明文件', '描述某个 JavaScript 库有哪些函数、参数和类型信息的文件。'],
      ['noEmit', '只做类型检查、不生成 JavaScript 文件的常用检查模式。']
    ],
    workflow: '先用 noEmit 执行类型检查，把新增报错单独记录；再检查测试和构建，最后才更新团队统一使用的 TypeScript 版本。',
    concerns: ['类型推断与严格检查带来的报错变化', '编译目标、模块解析和配置选项', '第三方声明文件与构建工具兼容性'],
    nextStep: '先以 noEmit 模式运行类型检查，集中处理新增报错后再更新正式构建配置。'
  },
  'Visual Studio Code': {
    title: '开发工具更新值得马上尝试吗',
    audience: '使用 Visual Studio Code 及其扩展生态的个人开发者和团队',
    plainIntro: 'Visual Studio Code（VS Code）是常用的代码编辑器。除编辑文本外，它还能通过扩展提供语言提示、调试、Git、远程开发等功能。编辑器更新通常不改变项目源码，但会影响日常开发流程和扩展兼容性。',
    vocabulary: [
      ['扩展', '安装到编辑器中的小功能模块，例如代码格式化、语言支持或 Git 工具。'],
      ['调试器', '帮助暂停程序、查看变量并定位问题的工具。'],
      ['远程开发', '在本地界面中连接远程服务器、容器或子系统进行开发。']
    ],
    workflow: '先在个人设备更新，打开一个常用项目验证格式化、调试、Git 与关键扩展；一段时间内无异常后，再建议团队统一升级。',
    concerns: ['编辑器功能与扩展兼容性', '远程开发、调试和语言服务体验', '团队设置同步与稳定性'],
    nextStep: '先在个人环境更新并验证关键扩展、调试器与远程开发流程，再推广到团队。'
  }
};
const cleanReleaseLine = (value = '') => value
  .replace(/!\[[^\]]*]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
  .replace(/[`*_]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function parseReleaseNotes(value = '') {
  const lines = value.replace(/\r/g, '').split('\n');
  const groups = [];
  let heading = '官方列出的改动';
  let entries = [];
  const flush = () => {
    if (entries.length) groups.push({ heading, entries: entries.splice(0, 10) });
  };

  for (const rawLine of lines) {
    if (/^#{1,6}\s+/.test(rawLine)) {
      flush();
      heading = cleanReleaseLine(rawLine.replace(/^#{1,6}\s+/, '')) || '官方列出的改动';
    } else if (/^\s*[-*+]\s+/.test(rawLine) || /^\s*\d+[.)]\s+/.test(rawLine)) {
      const entry = cleanReleaseLine(rawLine.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''));
      if (entry && entry.length >= 4) entries.push(entry);
    }
  }
  flush();

  if (!groups.length) {
    const sentences = cleanReleaseLine(value)
      .split(/(?<=[.!?。！？])\s+/)
      .filter((sentence) => sentence.length >= 12)
      .slice(0, 8);
    if (sentences.length) groups.push({ heading: '官方说明摘录', entries: sentences });
  }

  return groups.slice(0, 6);
}

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
      tagName: release.tag_name?.trim() || (release.name || '').trim(),
      url: release.html_url,
      publishedAt: release.published_at,
      period: periodOf(release.published_at),
      prerelease: Boolean(release.prerelease),
      releaseBody: release.body || ''
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

for (const [index, item] of selected.entries()) {
  const itemNumber = String((index % 3) + 1).padStart(2, '0');
  const year = item.period.slice(0, 4);
  const slug = slugify(`${item.repository.split('/').at(-1)}-${item.title}`);
  const profile = sourceProfiles[item.source];
  const seed = hashSeed(`${item.url}:${item.tagName}:${item.publishedAt}`);
  const published = dateOnly(item.publishedAt);
  const releaseNotes = parseReleaseNotes(item.releaseBody);
  const flatEntries = releaseNotes.flatMap((group) => group.entries).slice(0, 12);
  const releaseNotesMarkdown = releaseNotes.length
    ? releaseNotes.map((group) => {
      const rows = group.entries.slice(0, 8).map((entry) => `- **官方原文：** ${entry}\n  - **怎么读：** ${annotateOfficialLine(entry)}`).join('\n');
      return `### ${group.heading}\n\n${rows}`;
    }).join('\n\n')
    : '官方发布页没有提供可提取的结构化说明。本文不根据版本号推测功能；请直接打开发布页，按章节阅读变更、修复与兼容性说明。';
  const vocabularyMarkdown = profile.vocabulary.map(([term, explanation]) => `- **${term}：** ${explanation}`).join('\n');
  const prereleaseLabel = item.prerelease ? '是（候选版或预发布版本）' : '否（正式发布版本）';
  const subtitle = pick(seed, [
    profile.title,
    '别只看版本号，先看你会不会被影响',
    '把发布说明读成可执行的检查单',
    '给忙碌开发者的人话导读'
  ]);
  const opener = pick(seed, [
    `${item.source} 在 ${published} 放出了 ${item.title}。我建议你别急着点升级：先花两分钟搞清楚“它动到了哪一层”。`,
    `又一条值得记账的发布：${item.source} ${item.title}（${published}）。标题可以热闹，决策还是得冷静。`,
    `如果你的项目还在用 ${item.source}，${published} 这则 ${item.title} 至少该进待办，不该只进收藏夹。`
  ]);
  const whoCares = pick(seed, [
    `**更该认真看的人：** ${profile.audience}。\n\n**可以先略过的人：** 完全不依赖 ${item.source}、短期内也没有相关排期的同学——知道有这回事即可。`,
    `这不是人人都要半夜升级的警报。真正相关的是已经把 ${item.source} 写进构建、部署或日常开发链路的人；其他人把它当行业动态就好。`
  ]);
  const scene = sceneForTech(item.source, seed);
  const bridge = humanBridge(seed);
  const pro = professionalTechDepth(item.source, seed, item);
  const detailCount = flatEntries.length;
  const detailLead = detailCount
    ? `我从官方说明里抓出了 ${detailCount} 条相对完整的条目，并逐条补了“怎么读”。注意：注释是阅读方法，不是对隐藏功能的猜测。`
    : '这份发布说明偏短或结构松散，所以正文无法替你发明细节；这种时候，打开原文反而比读二手摘要更省事。';
  const relativePath = `source/_posts/news/${year}/${item.period}-${itemNumber}-${slug}.md`;
  const target = path.join(ROOT, relativePath);
  const markdown = `---
title: ${escapeYaml(`[技术观察] ${item.source} ${item.title}：${subtitle}`)}
date: ${published} 09:00:00
updated: ${published} 09:00:00
description: ${escapeYaml(`${item.source} 于 ${published} 发布 ${item.title}。结合官方条目、场景推演与升级检查，帮你判断要不要跟、怎么跟。`)}
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
source_published: ${published}
collection_date: ${collectionDate}
---

> 本文是对官方发布记录的**后期整理**。它帮助读者判断“这次更新和我有什么关系”，不代表当时即在本站发布，也不替代原始发布说明。

## 先用一句话说清

${opener}

${bridge} ${item.source} 的发布页是事实源头；我做的是把英文/术语密集的说明拆成可以讨论、可以排期、可以回滚的中文导读。带“官方”字样的内容来自发布页；场景和检查清单是通用工作方法，不表示某一条一定是本版本新增能力。

${whoCares}

一手入口在这里：<${item.url}>

## 这个工具是做什么的（通用背景）

${profile.plainIntro}

${scene}

在这个场景里，版本号本身几乎不提供信息；真正有用的是：渲染/构建/调度/类型检查/编辑体验里，哪一条链路可能被碰触。新手也不用一次学完所有名词——先建立“工具负责哪一段流水线”的地图，再回头看发布说明，效率会高很多。

另外请记住一个反直觉点：升级失败，经常不是因为新版本“坏了”，而是旧配置、旧插件、旧脚本还按去年的假设在工作。所以阅读发布说明时，要把眼睛分一半给“依赖我的东西”。

## 版本信息一览

| 项目 | 信息 |
| --- | --- |
| 工具 / 项目 | ${item.source} |
| 发布名称 | ${item.title} |
| 版本标签 | ${item.tagName} |
| 原始发布日期 | ${published} |
| 是否预发布 | ${prereleaseLabel} |
| 仓库 | ${item.repository} |
| 官方发布页 | [查看原文](${item.url}) |

关于预发布：可以把它理解成“正式开演前的联排”。适合想提前踩坑的人；是否用于生产，要看你们有没有完整测试与回滚能力。版本标签和日期均来自 GitHub Release 元数据，不来自二手新闻改写。

若你只想 30 秒决策：先看有没有 **security / breaking / deprecation**；有的话升优先级；都没有，再看它是否碰到你正在疼的那个模块。

## 官方 release 笔记要点

> 下列条目从官方 Markdown 说明中按标题与列表提取，并尽量保留原文。我不会把机翻腔冒充“官方中文版”。具体功能边界、影响范围与兼容性，请以发布页上下文为准。

${detailLead}

${releaseNotesMarkdown}

### 怎样读这些条目（可复用）

1. 先扫描标题：Features / Bug Fixes / Breaking Changes / Security 往往比段落叙述更醒目。
2. 再盯模块名：只有碰到你依赖的包、API、配置键，才值得立刻排期。
3. 最后才看形容词：更快、更好、更强，统统要落到你自己的基准测试或页面路径上。
4. 英文不好也不丢人：把关键词丢进翻译工具可以，但结论仍要回到官方段落核对。

如果某条提到 PR 编号或 issue，那是深挖线索，不是装饰。真正要升级时，点进去看讨论，常能提前知道坑在哪里。

## 专业深度：机制、约束与二阶效应

${pro.frameworkIntro}

对 ${item.source}（${item.title} / ${item.tagName}），建议按下列层面对齐阅读，而不是只扫版本号：

- **机制层（它可能触达的子系统）：** ${pro.layers}
- **约束层（最常见的工程风险）：** ${pro.risks}
- **证据层（升级后应用哪些指标说话）：** ${pro.metrics}

${pro.secondOrder}

进一步做深度拆解时，把官方条目映射到你们的**变更影响矩阵**：

| 维度 | 你要填写的内容 | 专业用途 |
| --- | --- | --- |
| 直接依赖 | 锁文件中的精确版本与传递依赖 | 判断“是否被点名” |
| 行为契约 | API/配置/默认值/错误语义 | 判断“会不会静默改变结果” |
| 验证资产 | 单测、集成、合成监测、手工路径 | 判断“有没有证据闭环” |
| 发布策略 | 金丝雀、双跑、特性开关、冻结窗口 | 判断“风险是否可收敛” |
| 回滚条件 | 谁触发、如何执行、RTO 目标 | 判断“失败是否可恢复” |

若矩阵填不全，结论不应是“看起来能升”，而应是“尚未完成专业评估”。预发布（${prereleaseLabel}）尤其如此：它提供的是信息期权，不是生产许可证。

## 专业广度：生态对照与选型含义

${pro.breadth}

把这次发布放进更宽的决策坐标系，至少对照五问：

1. **上游对齐：** 语言运行时、操作系统、容器基础镜像是否仍匹配？
2. **横向替代：** 若暂缓升级，有没有等价能力或兼容层可续命？
3. **下游冲击：** 内部平台用户、业务仓库、插件作者谁会收到间接账单？
4. **组织能力：** 你们的回归资产与 on-call 是否支撑该变更节奏？
5. **时机选择：** 是该跟随安全补丁窗口，还是并入下个迭代的有计划迁移？

${scene} 在这个场景中，广度分析的价值是防止“局部最优”：单个仓库升级成功，不代表系统级风险下降。专业团队看的是组合风险，而不是单点绿勾。

也可用组合拳表述你的立场（写进评审记录）：

- **立即跟：** 存在安全暴露或已复现的阻断缺陷，且回滚路径清晰。
- **计划跟：** 有明确收益，但需要迁移与回归预算。
- **明确不跟：** 收益不足以覆盖验证成本，或处于发布冻结期——并写明复查日期。

## 如果你刚接触，可以先知道这些

软件版本常见写法是“主版本.次版本.修订版本”。最后一位变化，很多项目用来修问题；中间一位可能带来可见的新能力；最前面一位变化，兼容性风险通常最大。但不同项目纪律不同——${item.source} 也不例外——所以数字只是线索，说明文字才是证据。

${pick(seed, [
  '我自己的习惯是：把升级当成可回退的小实验，而不是勇气考验。',
  '有个笨办法非常管用：先写“当前版本、目标版本、验证清单、失败如何回去”，再动手。',
  '团队里最贵的不是多等一天，而是所有人同时踩进同一个未验证的大版本。'
])}

单独分支或预发环境装新版本 → 跑构建与关键路径 → 没问题再合入主干。听起来慢，其实比线上紧急回滚快。

阅读 ${item.source} 时，这几个词会反复出现：

${vocabularyMarkdown}

再补一条心态建议：你不需要成为该工具的专家才能读发布说明。你只需要成为“自己项目”的专家——知道哪些页面、哪些流水线、哪些客户路径绝对不能坏。

## 升级前通用检查清单

以下清单是面向 ${item.source} 的**通用建议**，用来降低升级翻车概率；它不是对本版本功能的逐条断言：

${profile.concerns.map((concern, concernIndex) => `${concernIndex + 1}. ${concern} —— 请写成可勾选的验证步骤，而不是停留在口头提醒。`).join('\n')}

升级前我建议你强制回答四个问题（写下来）：

1. 当前生产/主干锁定的是哪个精确版本？
2. 升级成功的“最小证据”是什么（哪几个页面、哪几条测试、哪几个指标）？
3. 失败时回滚到哪里，需要多久？
4. 谁有权决定“今天跟”还是“下个迭代再跟”？

${scene} 把上面四个问题套进去，你会立刻知道自己缺的是信息、测试，还是决策人。

## 可以照着做的下一步

${profile.workflow}

${profile.nextStep}

实操上，我建议按半天能做完的粒度拆：

1. **30 分钟：** 通读发布页，标记 security / breaking / 与你模块相关的条目。
2. **1–2 小时：** 在独立分支升级依赖，记录锁文件变化与构建日志。
3. **再 1–2 小时：** 跑最小回归（构建、关键路径、冒烟测试），截图或保存日志。
4. **收尾 15 分钟：** 写下旧版本、目标版本、结果、遗留风险、回滚命令。

${closingNote(seed)} 下一回再遇到 ${item.source} 的发布，你就不是从零开始，而是在更新一张已经存在的风险地图。

## 原始来源与阅读入口

- 官方来源：${item.source}
- 仓库：${item.repository}
- 原始发布日期：${published}
- 收录月份：${item.period}
- 发布页：<${item.url}>

## 来源与声明

- 本文是对官方发布记录的后期整理，不代表姚飞亮在 ${item.period} 已在本站发表本文。
- 事实、版本说明和版权以原始来源为准；如发现链接或日期有误，请联系 <yaoadmin@sina.com>。
- 文中场景与检查清单用于帮助理解与执行，不构成对本版本未写明能力的承诺。
`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, markdown, 'utf8');
  console.log(`Created ${relativePath}`);
}

await fs.mkdir(path.join(ROOT, 'automation/state'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'automation/state/historical-news-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
console.log('Created automation/state/historical-news-provenance.json');
