# Y Blog 管理平台

公开站点继续使用 Hexo 与 GitHub Pages；`admin/` 是独立的 Cloudflare Worker 管理平台。它不会把密码、GitHub token 或数据库凭据放入此仓库。

## 已包含的能力

- GitHub OAuth 白名单登录与 HttpOnly 会话。
- 内容草稿、编辑队列和“创建待审核 Pull Request”发布路径。
- GitHub Actions 运行状态和管理操作审计日志。
- 可选的隐私优先页面访问聚合：仅保存日期、路径、来源域名与界面语言，不保存 IP、账号或广告标识。
- 评论迁移状态：当前 LiveRe 继续工作；启用 GitHub Discussions 和 Giscus 后可切换。

## 首次部署

1. 创建 Cloudflare D1 数据库：

   ```bash
   npx wrangler d1 create yblog-admin
   ```

2. 将返回的数据库 ID 写入 `admin/wrangler.toml` 的 `database_id`，然后初始化表：

   ```bash
   npm run admin:db:local
   npx wrangler d1 execute yblog-admin --remote --file admin/schema.sql --config admin/wrangler.toml
   ```

3. 在 GitHub 创建 OAuth App，回调地址为：

   ```text
   https://admin.你的域名/auth/callback
   ```

4. 配置 Worker secrets；`ADMIN_GITHUB_LOGINS` 只填写被允许管理站点的 GitHub 用户名：

   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID --config admin/wrangler.toml
   npx wrangler secret put GITHUB_CLIENT_SECRET --config admin/wrangler.toml
   npx wrangler secret put TOKEN_ENCRYPTION_KEY --config admin/wrangler.toml
   npx wrangler secret put ADMIN_GITHUB_LOGINS --config admin/wrangler.toml
   npx wrangler secret put OAUTH_REDIRECT_URI --config admin/wrangler.toml
   ```

   `TOKEN_ENCRYPTION_KEY` 使用 `openssl rand -base64 48` 生成。不要复用其他密码。

5. 部署：

   ```bash
   npm run admin:deploy
   ```

   该命令会拒绝使用仓库中的示例 D1 ID 部署，避免后台意外连接到错误数据库。

6. 将 Worker 绑定到 `admin.你的域名`。部署成功后，将公开站 `_config.yml` 的 `admin_analytics_endpoint` 设为：

   ```text
   https://admin.你的域名/api/analytics/collect
   ```

   然后重新构建 Hexo 站点。

## 评论迁移到 Giscus

1. 在 GitHub 仓库 Settings 启用 **Discussions**。
2. 创建一个讨论分类，例如 `General`。
3. 在 [giscus.app](https://giscus.app/) 安装 GitHub App，并获取 `repo_id` 与 `category_id`。
4. 将 `_config.yml` 中 `comments_provider` 改为 `giscus`，并填写 `giscus` 的四项值。
5. 构建并检查文章页。旧 LiveRe 评论不会自动迁移；高价值旧讨论应手工归档到文章更新记录或 GitHub Discussion。

## 安全边界

- 后台发布只创建 PR，不会直接合并或绕过现有构建校验。
- GitHub OAuth token 以 AES-GCM 加密后保存在 D1；会话为 12 小时 HttpOnly cookie。
- API 变更请求要求 CSRF token，并写入审计日志。
- `/api/analytics/collect` 仅接受 `PUBLIC_SITE_ORIGIN` 指定的公开站点来源。
- 生产部署前应在 Cloudflare 为管理域名启用 HTTPS，并在 GitHub 账号启用双重验证。
