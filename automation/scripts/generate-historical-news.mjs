import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';

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
    if (entries.length) groups.push({ heading, entries: entries.splice(0, 6) });
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
      .slice(0, 4);
    if (sentences.length) groups.push({ heading: '官方说明摘录', entries: sentences });
  }

  return groups.slice(0, 4);
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

const postsRoot = path.join(ROOT, 'source/_posts/news');
for (const [index, item] of selected.entries()) {
  const itemNumber = String((index % 3) + 1).padStart(2, '0');
  const year = item.period.slice(0, 4);
  const slug = slugify(`${item.repository.split('/').at(-1)}-${item.title}`);
  const profile = sourceProfiles[item.source];
  const releaseNotes = parseReleaseNotes(item.releaseBody);
  const releaseNotesMarkdown = releaseNotes.length
    ? releaseNotes.map((group) => `### ${group.heading}\n\n${group.entries.map((entry) => `- ${entry}`).join('\n')}`).join('\n\n')
    : '官方发布页没有提供可提取的结构化说明。本文不根据版本号推测功能，请直接阅读下方的官方发布页。';
  const vocabularyMarkdown = profile.vocabulary.map(([term, explanation]) => `- **${term}：** ${explanation}`).join('\n');
  const prereleaseLabel = item.prerelease ? '是（候选版或预发布版本）' : '否（正式发布版本）';
  const relativePath = `source/_posts/news/${year}/${item.period}-${itemNumber}-${slug}.md`;
  const target = path.join(ROOT, relativePath);
  const markdown = `---
title: ${escapeYaml(`[技术观察] ${item.source} ${item.title}：${profile.title}`)}
date: ${dateOnly(item.publishedAt)} 09:00:00
updated: ${dateOnly(item.publishedAt)} 09:00:00
description: ${escapeYaml(`${item.source} 于 ${dateOnly(item.publishedAt)} 发布 ${item.title}。用通俗语言梳理工具背景、官方发布说明与升级检查步骤。`)}
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

> 本文是对官方发布记录的**后期整理**。它帮助读者判断“这次更新和我有什么关系”，不代表当时即在本站发布，也不替代原始发布说明。

## 先用一句话说清

${item.source} 在 **${dateOnly(item.publishedAt)}** 发布了 **${item.title}**。如果你已经在项目里使用它，这条发布记录值得先收藏：它是判断“要不要升级、升级前该检查什么”的官方入口；如果你还没用过它，也可以把本文当作认识这项工具的一次入门阅读。

本文分成两层：带有“官方”字样的内容来自发布页；“通用背景”和“通用建议”是帮助初学者理解和执行检查的说明，不表示某一项功能必然在本版本中新增。

## 这个工具是做什么的（通用背景）

${profile.plainIntro}

对刚入门的人来说，不需要在第一次阅读时理解所有技术名词。先记住一件事：工具升级的目的通常是修复问题、补充能力或改善开发体验；而项目升级的风险，往往来自旧代码、旧配置或配套插件还没有跟上新规则。

## 版本信息一览

| 项目 | 信息 |
| --- | --- |
| 工具 / 项目 | ${item.source} |
| 发布名称 | ${item.title} |
| 版本标签 | ${item.tagName} |
| 原始发布日期 | ${dateOnly(item.publishedAt)} |
| 是否预发布 | ${prereleaseLabel} |
| 官方发布页 | [查看原文](${item.url}) |

“预发布”可以理解为正式版前供测试的版本，适合希望提前验证兼容性的人；正式项目是否采用，仍要看团队的测试能力和官方建议。无论是哪一种版本，版本标签和发布日期都来自官方 GitHub Release 记录。

## 官方 release 笔记要点

> 以下条目从官方发布页的 Markdown 说明中按标题和列表提取，并保留官方原文表述。由于原始说明主要使用英语，本文不把自动猜测当作“官方中文翻译”；涉及功能细节、影响范围和兼容性，请点击发布页核对上下文。

${releaseNotesMarkdown}

### 怎样读这些条目

看到 **fix / bug fix**，通常表示修复问题；看到 **feature / add**，通常表示增加能力；看到 **breaking change / deprecation**，要格外小心，因为旧用法可能需要改动。这里的解释只是阅读英文发布说明的通用方法，是否真的影响你的项目，要以条目对应的模块、配置和官方链接为准。

## 如果你刚接触，可以先知道这些

软件版本常见的写法是“主版本.次版本.修订版本”。例如最后一位变化，常用于小范围修复；中间一位变化，可能带来新能力；最前面一位变化，往往意味着更大的兼容性变化。不同项目的发布策略并不完全一样，所以不要只凭数字下结论，仍要阅读官方说明。

升级也不是“看到新版本就立刻点确认”。更稳妥的做法是把升级当成一次可回退的小实验：保留当前版本记录，在单独分支或测试环境安装新版本，运行构建和测试；确认没有问题后再合并到正式发布流程。这样即使出现异常，也知道该回到哪个版本。

下面是阅读 ${item.source} 发布记录时常会遇到的词：

${vocabularyMarkdown}

## 升级前通用检查清单

以下清单是面向 ${item.source} 的**通用建议**，不是对本次发布内容的推断：

${profile.concerns.map((concern, concernIndex) => `${concernIndex + 1}. ${concern}`).join('\n')}

开始前可以先回答三个简单问题：我现在项目使用的是什么版本？升级后最关键的功能怎样验证？如果失败，怎样恢复到原来的依赖和部署结果？把答案写进任务单，比凭印象升级可靠得多。

## 可以照着做的下一步

${profile.workflow}

${profile.nextStep}

完成后，建议在升级记录中写下“旧版本、目标版本、执行日期、验证项目、结果和回滚方式”。这份记录对未来的自己和团队成员都很有用：下次看到相近的发布，就不必从零判断风险。

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
