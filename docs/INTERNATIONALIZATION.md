# 国际化策略

## 当前能力

- 首次访问根据浏览器 `navigator.languages` 自动选择中文或英文界面。
- 用户可通过导航中的语言按钮切换；选择保存于浏览器本地，不会每次跳转。
- 站点 UI、导航、搜索、评论操作、目录、文章分页和辅助功能文案均支持中英文。
- 首页、文章页、平板、手机与横屏设备共享响应式布局；Hero 区保留自适应曲线过渡。
- Hero 支持语言专属图片，缺省时自动回退为默认图片。

## 文章翻译原则

界面翻译不等于内容翻译。旧文章正文保持其原始语言，不能用浏览器偏好或机器翻译直接替换。

为每个高价值文章创建经过人工审核的译文，并用 front matter 互相链接：

```yaml
# 中文原文
translations:
  en: /en/kubernetes/deployment-guide/
header-img-en: /img/article_header/deployment-en.jpg

# 英文译文
translations:
  zh-CN: /kubernetes/deployment-guide/
header-img: /img/article_header/deployment-en.jpg
```

`header-img-en` 可选。未提供时站点会使用原始 Hero 图，保证任何语言下都有图片回退。

## 新图片要求

- 照片型 Hero 不应内嵌文字，方便在所有语言环境复用。
- 含文字的图片应提供语言版本，例如 `architecture-zh-CN.webp` 与 `architecture-en.webp`。
- 在文章中使用 `<picture>` 或相邻双图，并添加明确的 `alt` 文本；不要依赖机器识别翻译图内文字。
- 新图片继续遵守 WebP/JPEG 压缩与响应式尺寸规范。

## SEO 说明

当前阶段是「界面国际化」。当英文译文达到稳定数量后，再生成 `/en/` 内容路由、`hreflang` 和独立英文 sitemap，避免向搜索引擎声明不存在的翻译页面。
