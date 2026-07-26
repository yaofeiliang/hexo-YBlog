(function () {
  'use strict';
  var endpoint = document.documentElement.dataset.analyticsEndpoint;
  if (!endpoint || !navigator.sendBeacon) return;
  var payload = JSON.stringify({
    path: window.location.pathname,
    referrer: document.referrer || '',
    locale: document.documentElement.lang || ''
  });
  navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
})();
