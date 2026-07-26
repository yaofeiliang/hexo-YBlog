import { Hono } from 'hono';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  ADMIN_GITHUB_LOGINS?: string;
  OAUTH_REDIRECT_URI?: string;
  GITHUB_REPOSITORY: string;
  DEFAULT_BRANCH?: string;
  PUBLIC_SITE_ORIGIN?: string;
  COMMENTS_PROVIDER?: string;
}

type Bindings = { Bindings: Env };
type Session = {
  id: string;
  github_login: string;
  github_user_id: string;
  token_ciphertext: string;
  csrf_token: string;
  expires_at: string;
};

const app = new Hono<Bindings>();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }
function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function parseCookies(request: Request) {
  return Object.fromEntries((request.headers.get('Cookie') || '').split(';').map((item) => {
    const [key, ...value] = item.trim().split('=');
    return key ? [key, decodeURIComponent(value.join('='))] : [];
  }).filter((item) => item.length));
}
function cookie(name: string, value: string, request: Request, maxAge?: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const lifetime = maxAge === undefined ? '' : `; Max-Age=${maxAge}`;
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure}${lifetime}`;
}
function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
function safeList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12) : [];
}
function safeSlug(value: unknown) {
  const slug = String(value || '').trim().toLowerCase();
  return /^[a-z0-9]+(?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug) ? slug : null;
}
function frontMatterQuote(value: string) {
  return JSON.stringify(value.replace(/\r?\n/g, ' '));
}
function githubPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function keyFor(secret: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encrypt(value: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(secret);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value)));
  return `${encodeBase64(iv)}.${encodeBase64(encrypted)}`;
}
async function decrypt(value: string, secret: string) {
  const [rawIv, rawPayload] = value.split('.');
  if (!rawIv || !rawPayload) throw new Error('Invalid encrypted token');
  const key = await keyFor(secret);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(rawIv) }, key, decodeBase64(rawPayload));
  return decoder.decode(clear);
}

async function sessionFor(c: { req: { raw: Request }; env: Env }) {
  const sessionId = parseCookies(c.req.raw).admin_session;
  if (!sessionId) return null;
  const session = await c.env.DB.prepare(
    'SELECT id, github_login, github_user_id, token_ciphertext, csrf_token, expires_at FROM admin_sessions WHERE id = ? AND expires_at > ?'
  ).bind(sessionId, now()).first<Session>();
  return session || null;
}
async function requireSession(c: any) {
  const session = await sessionFor(c);
  if (!session) return { response: jsonError('请先登录管理平台', 401) as Response, session: null };
  return { response: null, session };
}
async function requireMutation(c: any) {
  const result = await requireSession(c);
  if (!result.session) return result;
  if (c.req.header('x-admin-csrf') !== result.session.csrf_token) {
    return { response: jsonError('CSRF 校验失败', 403) as Response, session: null };
  }
  return result;
}
async function github(c: any, session: Session, path: string, init: RequestInit = {}) {
  if (!c.env.TOKEN_ENCRYPTION_KEY) throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
  const token = await decrypt(session.token_ciphertext, c.env.TOKEN_ENCRYPTION_KEY);
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {})
    }
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return response;
}
async function audit(env: Env, actor: string, action: string, targetType: string, targetId: string, detail: Record<string, unknown> = {}) {
  await env.DB.prepare(
    'INSERT INTO audit_log (id, actor_login, action, target_type, target_id, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id(), actor, action, targetType, targetId, JSON.stringify(detail), now()).run();
}
function cors(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  return origin && origin === env.PUBLIC_SITE_ORIGIN ? {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  } : {};
}

app.get('/api/health', (c) => c.json({ status: 'ok', service: 'yblog-admin', time: now() }));

app.get('/auth/login', async (c) => {
  if (!c.env.GITHUB_CLIENT_ID || !c.env.OAUTH_REDIRECT_URI) return jsonError('GitHub OAuth 尚未配置', 503);
  const state = encodeBase64(crypto.getRandomValues(new Uint8Array(24)));
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', c.env.OAUTH_REDIRECT_URI);
  url.searchParams.set('scope', 'read:user public_repo');
  url.searchParams.set('state', state);
  return new Response(null, { status: 302, headers: { Location: url.toString(), 'Set-Cookie': cookie('oauth_state', state, c.req.raw, 600) } });
});

app.get('/auth/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const receivedState = parseCookies(c.req.raw).oauth_state;
  if (!code || !state || !receivedState || state !== receivedState) return jsonError('OAuth state 校验失败', 403);
  if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET || !c.env.OAUTH_REDIRECT_URI || !c.env.TOKEN_ENCRYPTION_KEY) {
    return jsonError('管理后台的 OAuth 密钥尚未配置', 503);
  }
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: new URLSearchParams({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: c.env.OAUTH_REDIRECT_URI
    })
  });
  const tokenData = await tokenResponse.json() as { access_token?: string };
  if (!tokenData.access_token) return jsonError('GitHub 未返回访问令牌', 401);
  const userResponse = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' } });
  if (!userResponse.ok) return jsonError('无法读取 GitHub 用户信息', 401);
  const user = await userResponse.json() as { login: string; id: number };
  const allowed = (c.env.ADMIN_GITHUB_LOGINS || '').split(',').map((login) => login.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.login.toLowerCase())) return jsonError('该 GitHub 账号没有管理权限', 403);
  const sessionId = id();
  const csrf = encodeBase64(crypto.getRandomValues(new Uint8Array(24)));
  const expiry = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await c.env.DB.prepare(
    'INSERT INTO admin_sessions (id, github_login, github_user_id, token_ciphertext, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(sessionId, user.login, String(user.id), await encrypt(tokenData.access_token, c.env.TOKEN_ENCRYPTION_KEY), csrf, now(), expiry).run();
  await audit(c.env, user.login, 'login', 'session', sessionId);
  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', cookie('admin_session', sessionId, c.req.raw, SESSION_TTL_MS / 1000));
  headers.append('Set-Cookie', cookie('oauth_state', '', c.req.raw, 0));
  return new Response(null, { status: 302, headers });
});

app.post('/auth/logout', async (c) => {
  const current = await sessionFor(c);
  if (current) {
    await c.env.DB.prepare('DELETE FROM admin_sessions WHERE id = ?').bind(current.id).run();
    await audit(c.env, current.github_login, 'logout', 'session', current.id);
  }
  return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie('admin_session', '', c.req.raw, 0) } });
});

app.get('/api/me', async (c) => {
  const session = await sessionFor(c);
  if (!session) return c.json({ authenticated: false });
  return c.json({ authenticated: true, login: session.github_login, csrfToken: session.csrf_token });
});

app.get('/api/dashboard', async (c) => {
  const { response, session } = await requireSession(c);
  if (response || !session) return response;
  const [drafts, review, views, auditRows] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM drafts WHERE status = 'draft'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM drafts WHERE status = 'review'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(views), 0) AS count FROM page_view_rollups WHERE day >= date('now', '-30 days')").first<{ count: number }>(),
    c.env.DB.prepare('SELECT action, target_type, target_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT 8').all()
  ]);
  let workflows: unknown[] = [];
  try {
    const runs = await github(c, session, `/repos/${c.env.GITHUB_REPOSITORY}/actions/runs?per_page=5`);
    workflows = ((await runs.json()) as { workflow_runs?: unknown[] }).workflow_runs || [];
  } catch { /* A dashboard remains usable when GitHub is temporarily unavailable. */ }
  return c.json({
    drafts: drafts?.count || 0,
    review: review?.count || 0,
    views30d: views?.count || 0,
    comments: { provider: c.env.COMMENTS_PROVIDER || 'livere', status: c.env.COMMENTS_PROVIDER === 'giscus' ? 'migration-required' : 'external-console' },
    workflowRuns: workflows,
    recentActivity: auditRows.results || []
  });
});

app.get('/api/posts', async (c) => {
  const { response, session } = await requireSession(c);
  if (response || !session) return response;
  const branch = c.env.DEFAULT_BRANCH || 'master';
  const tree = await github(c, session, `/repos/${c.env.GITHUB_REPOSITORY}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const payload = await tree.json() as { tree: Array<{ path: string; sha: string; type: string }> };
  const posts = payload.tree.filter((entry) => entry.type === 'blob' && entry.path.startsWith('source/_posts/') && entry.path.endsWith('.md'))
    .map((entry) => ({ path: entry.path, sha: entry.sha, slug: entry.path.split('/').pop()?.replace(/\.md$/, '') }))
    .sort((left, right) => (right.slug || '').localeCompare(left.slug || ''));
  return c.json({ posts });
});

app.get('/api/posts/*', async (c) => {
  const { response, session } = await requireSession(c);
  if (response || !session) return response;
  const path = c.req.path.replace('/api/posts/', '');
  if (!path.startsWith('source/_posts/') || !path.endsWith('.md')) return jsonError('非法文章路径', 400);
  const branch = c.env.DEFAULT_BRANCH || 'master';
  const file = await github(c, session, `/repos/${c.env.GITHUB_REPOSITORY}/contents/${githubPath(path)}?ref=${encodeURIComponent(branch)}`);
  const payload = await file.json() as { content: string; sha: string };
  return c.json({ path, sha: payload.sha, content: decoder.decode(decodeBase64(payload.content.replace(/\n/g, ''))) });
});

app.get('/api/drafts', async (c) => {
  const { response } = await requireSession(c);
  if (response) return response;
  const result = await c.env.DB.prepare('SELECT id, title, slug, description, categories_json, tags_json, status, author_login, pull_request_url, created_at, updated_at FROM drafts ORDER BY updated_at DESC').all();
  return c.json({ drafts: result.results || [] });
});

app.post('/api/drafts', async (c) => {
  const { response, session } = await requireMutation(c);
  if (response || !session) return response;
  const payload = await c.req.json<Record<string, unknown>>();
  const title = String(payload.title || '').trim();
  const slug = safeSlug(payload.slug);
  const description = String(payload.description || '').trim();
  const body = String(payload.body || '').trim();
  if (!title || !slug || !description || !body) return jsonError('标题、英文 slug、摘要和正文均为必填项');
  const draftId = id();
  const timestamp = now();
  await c.env.DB.prepare(
    'INSERT INTO drafts (id, title, slug, description, body, categories_json, tags_json, status, author_login, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(draftId, title, slug, description, body, JSON.stringify(safeList(payload.categories)), JSON.stringify(safeList(payload.tags)), 'draft', session.github_login, timestamp, timestamp).run();
  await audit(c.env, session.github_login, 'create', 'draft', draftId, { slug });
  return c.json({ id: draftId }, 201);
});

app.post('/api/drafts/:id/request-publication', async (c) => {
  const { response, session } = await requireMutation(c);
  if (response || !session) return response;
  const draft = await c.env.DB.prepare('SELECT * FROM drafts WHERE id = ? AND status = ?').bind(c.req.param('id'), 'draft').first<Record<string, string>>();
  if (!draft) return jsonError('未找到可提交审核的草稿', 404);
  const branch = c.env.DEFAULT_BRANCH || 'master';
  const newBranch = `admin/${draft.slug}-${draft.id.slice(0, 8)}`;
  const ref = await github(c, session, `/repos/${c.env.GITHUB_REPOSITORY}/git/ref/heads/${encodeURIComponent(branch)}`);
  const refPayload = await ref.json() as { object: { sha: string } };
  await github(c, session, `/repos/${c.env.GITHUB_REPOSITORY}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: refPayload.object.sha })
  });
  const categories = JSON.parse(draft.categories_json) as string[];
  const tags = JSON.parse(draft.tags_json) as string[];
  const markdown = `---\ntitle: ${frontMatterQuote(draft.title)}\ndate: ${now().replace('T', ' ').replace(/\.\d+Z$/, '')}\nupdated: ${now().replace('T', ' ').replace(/\.\d+Z$/, '')}\ndescription: ${frontMatterQuote(draft.description)}\ncategories:\n${categories.map((item) => `  - ${frontMatterQuote(item)}`).join('\n') || '  - article'}\ntags:\n${tags.map((item) => `  - ${frontMatterQuote(item)}`).join('\n') || '  - notes'}\ncatalog: true\nheader-img: /img/article_header/article_bg.jpg\n---\n\n${draft.body}\n`;
  const filePath = `source/_posts/${draft.slug}.md`;
  await github(c, session, `/repos/${c.env.GITHUB_REPOSITORY}/contents/${githubPath(filePath)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `content: draft ${draft.slug}`, branch: newBranch, content: encodeBase64(encoder.encode(markdown)) })
  });
  const pull = await github(c, session, `/repos/${c.env.GITHUB_REPOSITORY}/pulls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `content: ${draft.title}`, head: newBranch, base: branch, body: `由 Y Blog 管理平台创建的待审核文章草稿。\n\n- 摘要：${draft.description}\n- 后台草稿 ID：${draft.id}` })
  });
  const pullPayload = await pull.json() as { html_url: string };
  await c.env.DB.prepare("UPDATE drafts SET status = 'review', pull_request_url = ?, updated_at = ? WHERE id = ?").bind(pullPayload.html_url, now(), draft.id).run();
  await audit(c.env, session.github_login, 'request_publication', 'draft', draft.id, { pullRequest: pullPayload.html_url });
  return c.json({ pullRequestUrl: pullPayload.html_url });
});

app.get('/api/analytics', async (c) => {
  const { response } = await requireSession(c);
  if (response) return response;
  const [pages, referrers] = await Promise.all([
    c.env.DB.prepare("SELECT path, SUM(views) AS views FROM page_view_rollups WHERE day >= date('now', '-30 days') GROUP BY path ORDER BY views DESC LIMIT 12").all(),
    c.env.DB.prepare("SELECT referrer_host, SUM(views) AS views FROM page_view_rollups WHERE day >= date('now', '-30 days') AND referrer_host != '' GROUP BY referrer_host ORDER BY views DESC LIMIT 12").all()
  ]);
  return c.json({ pages: pages.results || [], referrers: referrers.results || [] });
});

app.options('/api/analytics/collect', (c) => new Response(null, { status: 204, headers: cors(c.env, c.req.raw) }));
app.post('/api/analytics/collect', async (c) => {
  const headers = cors(c.env, c.req.raw);
  if (!Object.keys(headers).length) return new Response(null, { status: 403 });
  const payload = await c.req.json<{ path?: unknown; referrer?: unknown; locale?: unknown }>();
  const path = String(payload.path || '');
  if (!path.startsWith('/') || path.length > 256) return new Response(null, { status: 400, headers });
  let referrerHost = '';
  try { referrerHost = payload.referrer ? new URL(String(payload.referrer)).hostname.slice(0, 120) : ''; } catch { /* Referrer is optional. */ }
  const locale = String(payload.locale || '').slice(0, 16);
  const day = now().slice(0, 10);
  await c.env.DB.prepare(
    'INSERT INTO page_view_rollups (day, path, referrer_host, locale, views) VALUES (?, ?, ?, ?, 1) ON CONFLICT(day, path, referrer_host, locale) DO UPDATE SET views = views + 1'
  ).bind(day, path, referrerHost, locale).run();
  return new Response(null, { status: 204, headers });
});

app.all('/api/*', () => jsonError('未找到管理 API', 404));
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
