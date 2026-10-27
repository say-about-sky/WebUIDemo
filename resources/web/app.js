/* webdemo-v7-pages */
(function () {
  'use strict';

  var BUILD = 'v7-pages';
  var TTL_COUNTER = 604800;   // 7 天
  var TTL_URL = 600;          // 10 分钟

  function $(id) { return document.getElementById(id); }

  function out(text) {
    var el = $('out');
    if (el) { el.textContent = String(text); }
    try { AOH3.log(String(text)); } catch (e) { /* ignore */ }
  }

  function toast(text) {
    try { AOH3.toast(text); } catch (e) { /* ignore */ }
  }

  function stats() {
    var el = $('stats');
    try {
      el.textContent = 'plugin=' + AOHCache.plugin() + ' ' + AOHCache.stats();
    } catch (e) {
      el.textContent = 'AOHCache unavailable: ' + e;
    }
  }

  // 开关文案必须跟着真实状态走（选择会被持久化到 <plugin>/webui.json）。
  function cacheLabel() {
    try {
      var on = AOHCache.enabled();
      $('toggle').textContent = '缓存：' + (on ? '开' : '关');
      return on;
    } catch (e) {
      return true;
    }
  }

  // 元素缓存：计数在页面重载/重启后仍然保留（存在插件自己的 resources/cache 下）。
  var n = 0, restored = false;
  try {
    var saved = AOHCache.get('demo:counter');
    if (saved !== null && saved !== '') {
      n = parseInt(saved, 10) || 0;
      restored = n > 0;
    }
  } catch (e) { /* no cache */ }

  function render() {
    var el = $('count');
    if (el) { el.textContent = '' + n; }
  }

  function save() {
    try { return AOHCache.putTtl('demo:counter', '' + n, TTL_COUNTER); } catch (e) { return false; }
  }

  render();
  stats();
  cacheLabel();
  if (restored) {
    out('restored from cache: n=' + n);
  }

  $('btn').addEventListener('click', function () {
    n++;
    render();
    var ok = save();
    toast('Clicked: ' + n);
    out('click n=' + n + ' cached=' + ok + ' has=' + has() + ' keys=[' + keys() + ']');
    stats();
  });

  function has() {
    try { return AOHCache.has('demo:counter'); } catch (e) { return false; }
  }

  function keys() {
    try { return String(AOHCache.keys()).replace(/\n/g, ', '); } catch (e) { return ''; }
  }

  // JS 决定是否缓存：关闭后 put/putUrl 都会被拒绝（get 仍可读）。
  $('toggle').addEventListener('click', function () {
    try {
      var on = !AOHCache.enabled();
      AOHCache.setEnabled(on);
      cacheLabel();
      out('cache=' + on);
      stats();
    } catch (e) {
      out('toggle: ' + e);
    }
  });

  // 页面/资源缓存：先把 URL 写进缓存（带 TTL），再由 shouldInterceptRequest 离线命中。
  $('url').addEventListener('click', function () {
    var url = 'https://webdemo.local/demo.json';
    var payload = JSON.stringify({ cachedAt: Date.now(), build: BUILD });
    var ok = false;
    try { ok = AOHCache.putUrlTtl(url, 'application/json', payload, TTL_URL); } catch (e) { /* ignore */ }
    var direct = '-';
    try { direct = String(AOHCache.getUrl(url)).slice(0, 40); } catch (e) { /* ignore */ }
    out('putUrlTtl=' + ok + ' ttl=' + TTL_URL + 's getUrl=' + direct + ' -> fetch ' + url);
    if (!ok) { out('putUrl failed (cache disabled?)'); return; }
    fetch(url).then(function (r) { return r.text(); }).then(function (t) {
      out('fetch OK: ' + t);
      toast('cache hit');
      stats();
    }).catch(function (e) {
      out('fetch FAIL: ' + e);
    });
  });

  // 页面快照：把当前 DOM 存成元素缓存（受 512KB/条目 + 4MB/插件上限约束）。
  $('snap').addEventListener('click', function () {
    try {
      var ok = AOHCache.put('page:index.html', document.documentElement.outerHTML);
      out('snapshot=' + ok);
      stats();
    } catch (e) {
      out('snapshot: ' + e);
    }
  });

  $('clear').addEventListener('click', function () {
    try {
      AOHCache.clear();
      out('cleared');
      stats();
    } catch (e) {
      out('clear: ' + e);
    }
  });

  console.log('app.js loaded, BUILD=' + BUILD);
})();
