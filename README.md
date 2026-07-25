# YBlog
> This Y Blog theme created by [YaoFeiliang](http://www.yaofeiliang.com/) modified from the original Porter Hux.

## Professional content workflow

- `npm run validate:content` validates article metadata.
- `npm run build` builds the site and the static Pagefind search index.
- `npm run news:dry-run` previews eligible official RSS items.
- `npm run news:ingest` writes a daily technical-brief draft locally.

See [CONTRIBUTING.md](CONTRIBUTING.md), [automation/README.md](automation/README.md), and [docs/ROADMAP.md](docs/ROADMAP.md) for publication and automation rules.

# Live Demo

Yao Feiliang Blog : [www.yaofeiliang.com](http://www.yaofeiliang.com/)

![Theme YaoFeiliang](https://github.com/yaofeiliang/hexo-YBlog/blob/master/source/img/y.png?raw=true)

# Install Hexo

Requires **Node.js >= 20.19** (Hexo 8) and Git.

```shell
# For Mac
brew install node
brew install git
```

Install dependencies (Hexo CLI is available via `npx` after install):

```shell
npm install

# Optional global CLI: npm install hexo-cli -g
# Docs: https://hexo.io/zh-cn/index.html
```

# Theme Usage

## Init

---
```bash
git clone https://github.com/yaofeiliang/hexo-YBlog.git ./yaofeiliang
cd yaofeiliang
npm install
```

## Modify
---
Modify `_config.yml` file with your own info.
Especially the section:
### Deployment
Replace to your own repo!
```yml
deploy:
  type: git
  repo: https://github.com/<yourAccount>/<repo>
  branch: <your-branch>
```

### Sidebar settings
Copy your avatar image to `<root>/img/` and modify the `_config.yml`:
```yml
sidebar: true    # whether or not using Sidebar.
sidebar-about-description: "<your description>"
sidebar-avatar: img/<your avatar path>
```
and activate your personal widget you like
```yml
widgets:         # here are widget you can use, you can comment out
- featured-tags
- short-about
- recent-posts
- friends-blog
- archive
- category
```
if you want to add sidebar widget, please add at `layout/_widget`.
### Signature Setup
Copy your signature image to `<root>/img/signature` and modify the `_config.yml`:
```yml
signature: true   # show signature
signature-img: img/signature/<your-signature-ID>
```
### Go to top icon Setup
My icon is using iron man, you can change to your own icon at `css/image`.

### Post tag
You can decide to show post tags or not.
```yml
home_posts_tag: true
```
![home_posts_tag-true](https://github.com/yaofeiliang/hexo-YBlog/blob/master/source/img/article/tag.png)
### Markdown render
My markdown render engine plugin is [hexo-renderer-markdown-it](https://github.com/celsomiranda/hexo-renderer-markdown-it).
```yml
# Markdown-it config
## Docs: https://github.com/celsomiranda/hexo-renderer-markdown-it/wiki
markdown:
  render:
    html: true
    xhtmlOut: false
    breaks: true
    linkify: true
    typographer: true
    quotes: '“”‘’'
```
and if you want to change the header anchor 'ℬ', you can go to `layout/post.ejs` to change it.
```javascript
async("https://cdn.bootcss.com/anchor-js/1.1.1/anchor.min.js",function(){
        anchors.options = {
          visible: 'hover',
          placement: 'left',
          icon: ℬ // this is the header anchor "unicode" icon
        };
```

## Hexo Basics
---
Some hexo command:
```bash
npm run server                 # local preview (http://localhost:4000)
npm run clean && npm run build # clean + generate static files
npm run deploy                 # deploy to the configured git branch
npx hexo new post "<post name>"
```

# Have fun ^_^ 
---
