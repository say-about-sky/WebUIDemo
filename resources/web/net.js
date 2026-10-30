/* WebUIDemo 网络自检：判断游戏内 WebView 的网络能力（HTTPS / 明文 HTTP / 回环 / DNS）。 */
(function () {
  'use strict';

  var TIMEOUT_MS = 8000;

  var SUITE = [
    { tag: 'HTTPS', kind: 'fetch', url: 'https://www.baidu.com/favicon.ico', name: 'HTTPS fetch · baidu' },
    { tag: 'HTTPS', kind: 'img', url: 'https://www.baidu.com/favicon.ico', name: 'HTTPS 图片 · baidu' },
    { tag: 'HTTP', kind: 'fetch', url: 'http://www.baidu.com/favicon.ico', name: '明文HTTP fetch · baidu' },
    { tag: 'HTTP', kind: 'img', url: 'http://www.baidu.com/favicon.ico', name: '明文HTTP 图片 · baidu' },
    { tag: 'HTTP', kind: 'fetch', url: 'http://neverssl.com/', name: '明文HTTP fetch · neverssl' },
    { tag: 'HTTPS', kind: 'fetch', url: 'https://example.com/', name: 'HTTPS fetch · example.com' },
    { tag: 'LOOP', kind: 'fetch', url: 'http://127.0.0.1:8787/api/ping', name: '回环 127.0.0.1:8787/api/ping' },
    { tag: 'DNS', kind: 'fetch', url: 'https://no-such-host-aoh3.invalid/', name: 'DNS 失败对照(.invalid)' },
    { tag: 'FILE', kind: 'fetch', url: 'net.html', name: 'file:// 自身读取(判断本地文件访问)' }
  ];

  var el = {
    rows: document.getElementById('rows'),
    summary: document.getElementById('summary'),
    verdict: document.getElementById('verdict'),
    report: document.getElementById('report'),
    env: document.getElementById('env'),
    run: document.getElementById('btn-run'),
    copy: document.getElementById('btn-copy'),
    url: document.getElementById('url'),
    fetch: document.getElementById('btn-fetch'),
    img: document.getElementById('btn-img'),
    frameBtn: document.getElementById('btn-frame'),
    frame: document.getElementById('frame')
  };

  var last = { report: '', results: [] };

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  function ms(t0) {
    return Math.round(now() - t0);
  }

  function withTimeout(promise, url) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; reject(new Error('timeout ' + TIMEOUT_MS + 'ms')); }
      }, TIMEOUT_MS);
      promise.then(function (v) {
        if (!done) { done = true; clearTimeout(timer); resolve(v); }
      }, function (e) {
        if (!done) { done = true; clearTimeout(timer); reject(e); }
      });
    });
  }

  function fetchProbe(url) {
    var t0 = now();
    var opts = { cache: 'no-store', mode: 'no-cors', credentials: 'omit' };
    return withTimeout(fetch(url, opts), url).then(function (res) {
      return { ok: true, ms: ms(t0), detail: 'opaque/ok type=' + (res && res.type) };
    }, function (e) {
      return { ok: false, ms: ms(t0), detail: e && e.name ? (e.name + ': ' + e.message) : String(e) };
    });
  }

  function imgProbe(url) {
    var t0 = now();
    return withTimeout(new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { reject(new Error('img onerror')); };
      img.src = url + (url.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now();
    }), url).then(function (info) {
      return { ok: true, ms: ms(t0), detail: 'naturalSize=' + info.w + 'x' + info.h };
    }, function (e) {
      return { ok: false, ms: ms(t0), detail: e && e.message ? e.message : String(e) };
    });
  }

  function probe(kind, url) {
    if (kind === 'img') { return imgProbe(url); }
    return fetchProbe(url);
  }

  function renderRow(i, name, res, tag) {
    var cls = res.ok ? 'ok' : 'bad';
    var text = res.ok ? 'OK' : 'FAIL';
    return '<tr>' +
      '<td class="muted">' + (i + 1) + '</td>' +
      '<td>' + name + '<div class="muted">' + tag + '</div></td>' +
      '<td class="st ' + cls + '">' + text + ' · ' + res.ms + 'ms</td>' +
      '<td class="muted">' + String(res.detail || '').replace(/</g, '&lt;') + '</td>' +
      '</tr>';
  }

  function setRows(html) {
    el.rows.innerHTML = html;
  }

  function envText() {
    var ua = navigator.userAgent || '';
    var lines = [];
    lines.push('UA: ' + ua);
    lines.push('location: ' + location.href);
    lines.push('origin: ' + location.origin + ' (file:// 页面 origin 为 "null" 属正常)');
    lines.push('online: ' + String(navigator.onLine));
    lines.push('AOH3 bridge: ' + (typeof window.AOH3 !== 'undefined'));
    try { lines.push('AOH3.version: ' + AOH3.version()); } catch (e) { lines.push('AOH3.version: (n/a)'); }
    lines.push('AOHCache bridge: ' + (typeof window.AOHCache !== 'undefined'));
    try { lines.push('AOHCache: ' + AOHCache.stats()); } catch (e) { lines.push('AOHCache: (n/a)'); }
    lines.push('WebAssembly: ' + (typeof WebAssembly !== 'undefined'));
    lines.push('WebGL2: ' + (function () {
      try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
    })());
    return lines.join('\n');
  }

  function verdictOf(results) {
    function okTag(tag) { return results.some(function (r) { return r.tag === tag && r.ok; }); }
    function failTag(tag) { return results.some(function (r) { return r.tag === tag && !r.ok; }); }
    var https = okTag('HTTPS');
    var http = okTag('HTTP');
    var loop = okTag('LOOP');
    var dns = failTag('DNS');
    var file = okTag('FILE');

    var msg = [];
    if (https && !http) {
      msg.push('<b>结论:WebView 能上网(HTTPS 正常),但<b>禁止明文 HTTP</b>。</b>');
      msg.push('对应错误码是 <code>net::ERR_CLEARTEXT_NOT_PERMITTED</code>:安卓 9(API 28)以上默认策略,' +
        '只要 manifest 没有 <code>android:usesCleartextTraffic="true"</code>(或 network-security-config 放行),' +
        '<code>http://127.0.0.1</code> 也会被拦。');
      msg.push('→ 本地调试服务请改用 <b>https</b> / WebView 拦截器,或直接用系统浏览器打开(同一地址可用)。');
    } else if (https && http) {
      msg.push('<b>结论:WebView 网络完全正常(HTTPS 与明文 HTTP 都通)。</b>');
      msg.push('那么 Army3DWeb 打不开就只剩:端口/服务未启动、或 iframe 被策略拦。看下面 LOOP 一行。');
    } else if (!https && !http) {
      msg.push('<b>结论:WebView 完全没有网络出口(HTTPS / HTTP 都失败)。</b>');
      msg.push('优先怀疑:APK 缺 <code>android.permission.INTERNET</code>、系统 WebView 被禁用/降级、或设备无网。');
      if (dns) { msg.push('DNS 对照项失败符合“完全没有网络出口”。'); }
    } else {
      msg.push('<b>结论:结果不典型</b>(HTTPS/HTTP 混合),请看逐项详情。');
    }
    if (!file) {
      msg.push('提示:<code>file://</code> 自身读取失败,说明本地文件访问被限制(会影响插件页读本地资源)。');
    }
    if (loop) {
      msg.push('LOOP 一行成功 = 本机 <code>127.0.0.1</code> 明文访问是通的(Army3DWeb 的服务当时在跑)。');
    } else {
      msg.push('LOOP 一行失败:要么 Army3DWeb 没启动,要么同样被明文策略拦(可与 HTTP 行对照)。');
    }
    return msg.join('<br>');
  }

  function buildReport(results, verdict) {
    var lines = [];
    lines.push('==== WebUIDemo 网络自检 ====');
    lines.push('time: ' + new Date().toString());
    lines.push('');
    lines.push(envText());
    lines.push('');
    lines.push('---- 结果 ----');
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      lines.push((i + 1) + '. [' + (r.ok ? 'OK  ' : 'FAIL') + '] ' + r.tag + ' ' + r.name +
        ' (' + r.ms + 'ms) ' + (r.detail || ''));
    }
    lines.push('');
    lines.push('---- 结论 ----');
    lines.push(verdict.replace(/<br>/g, '\n').replace(/<\/?b>/g, '').replace(/<\/?code>/g, ''));
    return lines.join('\n');
  }

  function runManual(which) {
    var url = (el.url.value || '').trim();
    if (!url) { return; }
    el.report.textContent = '测试中… ' + url;
    probe(which, url).then(function (r) {
      el.report.textContent = (r.ok ? 'OK  ' : 'FAIL') + ' ' + which + ' ' + url + ' (' + r.ms + 'ms)\n' + (r.detail || '');
      try { AOH3.log('manual ' + which + ' ' + url + ' -> ' + (r.ok ? 'OK' : 'FAIL') + ' ' + r.detail); } catch (e) { }
    });
    if (which === 'frame') {
      el.frame.src = url;
    }
  }

  function runSuite() {
    el.run.disabled = true;
    setRows('<tr><td colspan="4" class="muted">执行中…</td></tr>');
    el.summary.textContent = '执行中…';
    el.report.textContent = '执行中…';

    var results = [];
    var html = [];
    var chain = Promise.resolve();

    SUITE.forEach(function (t, i) {
      chain = chain.then(function () {
        html.push('<tr><td class="muted">' + (i + 1) + '</td><td>' + t.name + '</td>' +
          '<td class="st muted">…</td><td class="muted">' + t.tag + '</td></tr>');
        setRows(html.join(''));
        return probe(t.kind, t.url).then(function (r) {
          r.tag = t.tag;
          r.name = t.name;
          results.push(r);
          html[i] = renderRow(i, t.name, r, t.tag);
          setRows(html.join(''));
        });
      });
    });

    chain.then(function () {
      var verdict = verdictOf(results);
      el.verdict.innerHTML = verdict;
      var okCount = results.filter(function (r) { return r.ok; }).length;
      el.summary.textContent = okCount + '/' + results.length + ' 项成功';
      last.results = results;
      last.report = buildReport(results, verdict);
      el.report.textContent = last.report;
      try { AOHCache.put('net:report', last.report); } catch (e) { }
      try { AOH3.log('[net-report]\n' + last.report); } catch (e) { }
      try { AOH3.toast('网络自检完成: ' + okCount + '/' + results.length); } catch (e) { }
      el.run.disabled = false;
    });
  }

  function copyReport() {
    var text = last.report || el.report.textContent || '';
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        return;
      }
    } catch (e) { }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e2) { }
    try { AOH3.toast('报告已写入 AOHCache: net:report'); } catch (e3) { }
  }

  el.env.textContent = envText();
  el.run.addEventListener('click', runSuite);
  el.copy.addEventListener('click', copyReport);
  el.fetch.addEventListener('click', function () { runManual('fetch'); });
  el.img.addEventListener('click', function () { runManual('img'); });
  el.frameBtn.addEventListener('click', function () { runManual('frame'); });

  try { AOH3.log('net.html ready'); } catch (e) { }
})();
