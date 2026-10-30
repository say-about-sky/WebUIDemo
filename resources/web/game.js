/* webdemo-v9-events */
(function () {
  'use strict';

  var BUILD = 'v9-events';

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

  // 全局：所有 event 目录（含插件 resources/event）
  $('ev').addEventListener('click', function () {
    var id = $('eid').value;
    if (id) { call(function () { return AOH3.event(id); }); }
  });

  // 指定目录下的 event 目录
  $('fev').addEventListener('click', function () {
    var id = $('eid').value;
    if (id) { call(function () { return AOH3.findEvent(id, $('epath').value || ''); }); }
  });

  // 全局：所有 MissionsEvent 目录（含插件 resources/missions/missionsEvents）
  $('mev').addEventListener('click', function () {
    var id = $('mid').value;
    if (id) { call(function () { return AOH3.missionsEvent(id); }); }
  });

  // 指定目录下的 MissionsEvent 目录
  $('fmev').addEventListener('click', function () {
    var id = $('mid').value;
    if (id) { call(function () { return AOH3.findMissionsEvent(id, $('mpath').value || ''); }); }
  });

  console.log('game.js loaded, BUILD=' + BUILD);
})();
