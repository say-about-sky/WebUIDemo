/* webdemo-v8-api */
(function () {
  'use strict';

  var BUILD = 'v8-api';

  function $(id) { return document.getElementById(id); }

  function out(text) {
    var el = $('out');
    if (el) { el.textContent = String(text); }
    try { AOH3.log(String(text)); } catch (e) { /* ignore */ }
  }

  function status() {
    var el = $('status');
    try {
      el.textContent = AOH3.gameStatus();
    } catch (e) {
      el.textContent = 'AOH3.gameStatus: ' + e;
    }
  }

  function call(fn) {
    var r = '?';
    try { r = fn(); } catch (e) { r = 'err ' + e; }
    out(r);
    return r;
  }

  status();

  $('refresh').addEventListener('click', function () {
    status();
    out('status refreshed');
  });

  // 控制台：AOH3.game(cmd)
  $('gold').addEventListener('click', function () {
    call(function () { return AOH3.game('gold 100'); });
    setTimeout(status, 350);
  });

  $('send').addEventListener('click', function () {
    var c = $('cmd').value;
    if (!c) { return; }
    call(function () { return AOH3.game(c); });
    setTimeout(status, 350);
  });

  // 普通事件：AOH3.event(id, path)  path 相对插件 resources（可空）
  $('fire').addEventListener('click', function () {
    var id = $('eid').value;
    if (!id) { return; }
    call(function () { return AOH3.event(id, $('epath').value || ''); });
  });

  $('findev').addEventListener('click', function () {
    var id = $('eid').value;
    if (!id) { return; }
    call(function () { return AOH3.findEvent(id); });
  });

  // 任务事件：AOH3.missionsEvent(id, assetPath)  assetPath 可空（按 id 自动查找）
  $('mfire').addEventListener('click', function () {
    var id = $('mid').value;
    if (!id) { return; }
    call(function () { return AOH3.missionsEvent(id, $('mpath').value || ''); });
  });

  $('mfind').addEventListener('click', function () {
    var id = $('mid').value;
    if (!id) { return; }
    call(function () { return AOH3.findMissionsEvent(id); });
  });

  console.log('game.js loaded, BUILD=' + BUILD);
})();
