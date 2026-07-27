(function () {
  'use strict';

  var STORAGE_KEY = 'yblog.locale';
  var SUPPORTED = ['zh-CN', 'en'];
  var translations = {
    'zh-CN': {
      'nav.home': '首页',
      'nav.about': '关于',
      'nav.tags': '标签',
      'nav.archive': '归档',
      'nav.topics': '知识地图',
      'nav.search': '搜索',
      'nav.rss': 'RSS',
      'nav.menu': '打开导航菜单',
      'locale.switch': 'English',
      'locale.switchAria': '切换至 English',
      'hero.subtitle': '我干了什么，究竟拿了时间换了什么',
      'pages.about': '关于我',
      'pages.tags': '标签',
      'pages.archive': '归档',
      'pages.search': '搜索',
      'pages.topics': '知识地图',
      'search.title': '搜索文章',
      'search.intro': '检索原创文章与每日技术简报。支持中英文关键词。',
      'search.placeholder': '输入关键词，例如 Kubernetes、Node.js、AI',
      'search.clear': '清除搜索',
      'search.loadMore': '加载更多结果',
      'search.label': '站内搜索',
      'search.filters': '筛选',
      'search.empty': '没有找到相关内容',
      'search.many': '[SEARCH_TERM] 的搜索结果（共 [COUNT] 条）',
      'search.one': '[SEARCH_TERM] 的搜索结果（共 1 条）',
      'post.previous': '← 上一篇',
      'post.next': '下一篇 →',
      'widget.featuredTags': '精选标签',
      'widget.friends': '友情链接',
      'widget.archives': '归档',
      'toc.title': '目录',
      'comments.load': '加载评论',
      'comments.loading': '评论加载中…',
      'footer.rights': '保留所有权利',
      'content.originalLanguage': '本文原始语言为中文。',
      'skip.main': '跳到正文',
      'knowledge.title': '阅读信息',
      'knowledge.series': '系列',
      'knowledge.difficulty': '难度',
      'knowledge.prerequisites': '前置知识',
      'knowledge.lastVerified': '最后验证',
      'knowledge.difficulty.beginner': '入门',
      'knowledge.difficulty.intermediate': '进阶',
      'knowledge.difficulty.advanced': '高级',
      'community.eyebrow': '一起完善这篇文章',
      'community.title': '参与讨论',
      'community.description': '欢迎补充实践经验、提出问题或指出过时内容。高质量反馈会帮助这篇文章持续变得更好。',
      'community.comment': '留言讨论',
      'community.guidelines': '交流原则',
      'community.commitment': '我会阅读每一条有建设性的留言，并尽力回复。',
      'subscribe.title': '持续关注',
      'subscribe.description': '订阅更新，把值得长期保存的技术实践带回你的阅读器。',
      'subscribe.rss': '订阅 RSS',
      'subscribe.github': '关注项目',
      'topics.eyebrow': '从问题到实践',
      'topics.title': '知识地图',
      'topics.description': '按主题浏览持续维护的技术笔记、实践文章与背景资料。',
      'topics.articles': '篇文章',
      'topics.explore': '浏览此主题 →'
    },
    en: {
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.tags': 'Topics',
      'nav.archive': 'Archive',
      'nav.topics': 'Knowledge map',
      'nav.search': 'Search',
      'nav.rss': 'RSS',
      'nav.menu': 'Open navigation menu',
      'locale.switch': '中文',
      'locale.switchAria': 'Switch to Chinese',
      'hero.subtitle': 'Build in public. Learn continuously.',
      'pages.about': 'About',
      'pages.tags': 'Topics',
      'pages.archive': 'Archive',
      'pages.search': 'Search',
      'pages.topics': 'Knowledge map',
      'search.title': 'Search articles',
      'search.intro': 'Search original writing and daily technology briefs.',
      'search.placeholder': 'Search Kubernetes, Node.js, AI…',
      'search.clear': 'Clear search',
      'search.loadMore': 'Load more results',
      'search.label': 'Site search',
      'search.filters': 'Filters',
      'search.empty': 'No matching content found',
      'search.many': '[COUNT] results for [SEARCH_TERM]',
      'search.one': '1 result for [SEARCH_TERM]',
      'post.previous': '← Previous',
      'post.next': 'Next →',
      'widget.featuredTags': 'Featured topics',
      'widget.friends': 'Links',
      'widget.archives': 'Archive',
      'toc.title': 'Contents',
      'comments.load': 'Load comments',
      'comments.loading': 'Loading comments…',
      'footer.rights': 'All rights reserved',
      'content.originalLanguage': 'This article was originally written in Chinese.',
      'skip.main': 'Skip to content',
      'knowledge.title': 'Reading details',
      'knowledge.series': 'Series',
      'knowledge.difficulty': 'Level',
      'knowledge.prerequisites': 'Prerequisites',
      'knowledge.lastVerified': 'Last verified',
      'knowledge.difficulty.beginner': 'Beginner',
      'knowledge.difficulty.intermediate': 'Intermediate',
      'knowledge.difficulty.advanced': 'Advanced',
      'community.eyebrow': 'Help improve this article',
      'community.title': 'Join the conversation',
      'community.description': 'Share practical experience, ask a question, or flag outdated guidance. Thoughtful feedback helps keep this article useful.',
      'community.comment': 'Leave a comment',
      'community.guidelines': 'Discussion principles',
      'community.commitment': 'I read constructive comments and do my best to reply.',
      'subscribe.title': 'Stay in the loop',
      'subscribe.description': 'Subscribe for technology practices worth keeping in your reading workflow.',
      'subscribe.rss': 'Subscribe via RSS',
      'subscribe.github': 'Follow the project',
      'topics.eyebrow': 'From questions to practice',
      'topics.title': 'Knowledge map',
      'topics.description': 'Explore continuously maintained technical notes, practical articles, and background material by topic.',
      'topics.articles': 'articles',
      'topics.explore': 'Explore this topic →'
    }
  };

  function storageGet() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }

  function storageSet(locale) {
    try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) { /* private mode */ }
  }

  function normalize(locale) {
    if (!locale) return null;
    return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  }

  function preferredLocale() {
    var query = new URLSearchParams(window.location.search).get('lang');
    var saved = normalize(query) || normalize(storageGet());
    if (saved) return saved;
    var languages = navigator.languages || [navigator.language || ''];
    return languages.some(function (language) { return /^zh/i.test(language); }) ? 'zh-CN' : 'en';
  }

  function t(key, locale) {
    var selected = locale || window.YBlogI18n.locale;
    return (translations[selected] && translations[selected][key]) || translations['zh-CN'][key] || key;
  }

  function imageSet(url) {
    if (!url) return '';
    var webp = url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    return 'image-set(url(\"' + webp + '\") type(\"image/webp\"), url(\"' + url + '\") type(\"image/jpeg\"))';
  }

  function applyImages(locale) {
    document.querySelectorAll('[data-i18n-image]').forEach(function (element) {
      var url = element.getAttribute(locale === 'en' ? 'data-image-en' : 'data-image-zh') ||
        element.getAttribute('data-image-zh');
      if (!url) return;
      if (element.tagName === 'IMG') element.src = url;
      else element.style.backgroundImage = imageSet(url);
    });
  }

  function apply(locale) {
    if (!SUPPORTED.includes(locale)) locale = 'zh-CN';
    window.YBlogI18n.locale = locale;
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      element.textContent = t(element.getAttribute('data-i18n'), locale);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (element) {
      element.title = t(element.getAttribute('data-i18n-title'), locale);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (element) {
      element.setAttribute('aria-label', t(element.getAttribute('data-i18n-aria'), locale));
    });
    document.querySelectorAll('[data-difficulty]').forEach(function (element) {
      element.textContent = t('knowledge.difficulty.' + element.getAttribute('data-difficulty'), locale);
    });
    applyImages(locale);
    document.dispatchEvent(new CustomEvent('yblog:localechange', { detail: { locale: locale } }));
  }

  function init() {
    var locale = preferredLocale();
    window.YBlogI18n = { locale: locale, t: t, setLocale: function (next) { storageSet(next); apply(next); } };
    apply(locale);
    document.querySelectorAll('[data-locale-switch]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.YBlogI18n.setLocale(window.YBlogI18n.locale === 'zh-CN' ? 'en' : 'zh-CN');
      });
    });
  }

  window.YBlogI18n = { locale: preferredLocale(), t: t, setLocale: function () {} };
  document.documentElement.lang = window.YBlogI18n.locale;
  document.documentElement.dataset.locale = window.YBlogI18n.locale;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
