(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function wrapTables() {
    document.querySelectorAll('.post-container table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('table-responsive')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-responsive';
      table.classList.add('table');
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function wrapVideos() {
    document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="vimeo.com"]').forEach(function (frame) {
      if (frame.parentElement && frame.parentElement.classList.contains('embed-responsive')) return;
      var wrap = document.createElement('div');
      wrap.className = 'embed-responsive';
      frame.classList.add('embed-responsive-item');
      frame.parentNode.insertBefore(wrap, frame);
      wrap.appendChild(frame);
    });
  }

  function navScroll() {
    var nav = document.querySelector('.navbar-custom');
    if (!nav || window.innerWidth <= 1170) return;
    var headerHeight = nav.offsetHeight || 60;
    var previousTop = 0;
    window.addEventListener('scroll', function () {
      var currentTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (currentTop < previousTop) {
        if (currentTop > 0 && nav.classList.contains('is-fixed')) nav.classList.add('is-visible');
        else nav.classList.remove('is-visible', 'is-fixed');
      } else {
        nav.classList.remove('is-visible');
        if (currentTop > headerHeight && !nav.classList.contains('is-fixed')) nav.classList.add('is-fixed');
      }
      previousTop = currentTop;
    }, { passive: true });
  }

  function rocket() {
    var el = document.getElementById('rocket');
    if (!el) return;
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y > window.innerHeight * 0.5) el.classList.add('show');
      else el.classList.remove('show');
    }, { passive: true });
    el.addEventListener('click', function (e) {
      e.preventDefault();
      el.classList.add('launch');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(function () { el.classList.remove('show', 'launch'); }, 800);
    });
  }

  function tocFixed() {
    var toc = document.getElementById('toc');
    if (!toc) return;
    var tocPosition = toc.offsetTop;
    window.addEventListener('scroll', function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (scrollTop > tocPosition - 60) toc.classList.add('toc-fixed');
      else toc.classList.remove('toc-fixed');
    }, { passive: true });
  }

  function tagCloud() {
    var cloud = document.getElementById('tag_cloud');
    if (!cloud) return;
    var links = Array.prototype.slice.call(cloud.querySelectorAll('a'));
    if (!links.length) return;
    var weights = links.map(function (a) { return parseInt(a.getAttribute('rel'), 10) || 1; });
    var min = Math.min.apply(null, weights);
    var max = Math.max.apply(null, weights);
    function mix(t) {
      var s = [154, 163, 173], e = [0, 133, 161];
      return 'rgb(' + [0, 1, 2].map(function (i) {
        return Math.round(s[i] + (e[i] - s[i]) * t);
      }).join(',') + ')';
    }
    links.forEach(function (a, i) {
      var t = max === min ? 0.5 : (weights[i] - min) / (max - min);
      a.style.backgroundColor = mix(t);
      a.style.color = '#fff';
    });
  }

  onReady(function () {
    wrapTables();
    wrapVideos();
    navScroll();
    rocket();
    tocFixed();
    tagCloud();
  });
})();
