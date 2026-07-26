# 内容发布规范

Y Blog 的源内容是 Markdown；提交到 `master` 后会自动构建并发布。

## 新建文章

```bash
npx hexo new post "your-english-slug"
```

每篇新文章至少包含：

```yaml
---
title: "中文标题"
date: 2026-07-26 09:00:00
updated: 2026-07-26 09:00:00
description: "一句话说明文章解决的问题，建议 80–160 个中文字符。"
categories:
  - Kubernetes
tags:
  - Kubernetes
  - DevOps
catalog: true
header-img: /img/article_header/article_bg.jpg
series: "Kubernetes 实践"
difficulty: intermediate # beginner | intermediate | advanced
prerequisites:
  - Docker 基础
last_verified: 2026-07-26
---
```

- 文件名使用英文 kebab-case，标题可以使用中文。
- 图片放在同名文章资源目录；避免直接提交未经压缩的大图。
- 面向国际读者的图片不要把关键说明写死在图内；需要文字时提供 `*-zh-CN` 与 `*-en` 两个版本。
- 修改既有文章时更新 `updated`。
- 技术结论重新验证后更新 `last_verified`；不能确认有效性的旧文应明确保留其历史语境。
- 使用 `series`、`difficulty` 和 `prerequisites`，让文章可进入知识地图并支持连续学习。
- 外部转载必须取得授权；资讯类仅做简短导读并提供原文链接。
- 提交前运行：`npm run validate:content && npm run build`。

详见 [国际化策略](docs/INTERNATIONALIZATION.md)。

## 每日技术简报

自动化任务只读取来源白名单中的 RSS 元数据，默认创建 PR，不直接发布。

```bash
npm run news:dry-run
npm run news:ingest
```

来源和主题权重位于 `automation/config/`。调整来源前应确认其 RSS 使用条款。
