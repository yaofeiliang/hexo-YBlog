# 自动技术简报

此目录只处理允许使用的 RSS 元数据：标题、发布日期、来源名和原文链接。

- 不抓取或转载原文正文、图片。
- 脚本默认只预览；传入 `--write` 才会写入文章与去重状态。
- GitHub Actions 仅创建 PR，不会直接发布。
- 若要使用 AI 导读，必须先增加单独的审核与事实校验步骤；当前实现不依赖任何模型或 API Key。

本地预览：

```bash
npm run news:dry-run
npm run news:ingest
```
