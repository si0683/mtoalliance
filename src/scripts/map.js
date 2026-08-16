// ===== МТО-Альянс · живая карта поставок =====
(function initMap() {
  'use strict';
  var svg = document.querySelector('.geomap__svg');
  if (!svg) return;
  var tip = document.getElementById('geomap-tip');
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VW = 1500, VH = 882;

  var C = [
    { n: 'Москва', x: 225.2, y: 371.2, lab: true },
    { n: 'Санкт-Петербург', x: 253.1, y: 261.0 },
    { n: 'Мурманск', x: 419.6, y: 187.0 },
    { n: 'Архангельск', x: 382.0, y: 285.8 },
    { n: 'Вологда', x: 295.1, y: 348.0 },
    { n: 'Нижний Новгород', x: 278.7, y: 418.4 },
    { n: 'Казань', x: 310.3, y: 466.4 },
    { n: 'Самара', x: 283.6, y: 512.3, office: true, lab: true },
    { n: 'Саратов', x: 224.6, y: 500.9 },
    { n: 'Волгоград', x: 170.6, y: 524.9 },
    { n: 'Воронеж', x: 171.6, y: 435.2 },
    { n: 'Ростов-на-Дону', x: 106.8, y: 494.5 },
    { n: 'Краснодар', x: 66.4, y: 512.9 },
    { n: 'Новороссийск', x: 51.0, y: 502.9 },
    { n: 'Уфа', x: 355.2, y: 532.6 },
    { n: 'Пермь', x: 397.4, y: 482.5 },
    { n: 'Екатеринбург', x: 421.5, y: 528.7 },
    { n: 'Челябинск', x: 410.3, y: 561.6 },
    { n: 'Курган', x: 451.1, y: 579.9 },
    { n: 'Тюмень', x: 469.8, y: 551.2 },
    { n: 'Сургут', x: 577.3, y: 512.5 },
    { n: 'Новый Уренгой', x: 639.3, y: 432.8 },
    { n: 'Омск', x: 528.3, y: 628.1 },
    { n: 'Новосибирск', x: 631.1, y: 662.1 },
    { n: 'Красноярск', x: 744.0, y: 662.9 },
    { n: 'Норильск', x: 739.9, y: 392.7 },
    { n: 'Тайшет', x: 800.5, y: 668.2 },
    { n: 'Иркутск', x: 874.9, y: 739.7 },
    { n: 'Улан-Удэ', x: 916.0, y: 745.2 },
    { n: 'Чита', x: 986.7, y: 729.9 },
    { n: 'Тында', x: 1096.2, y: 634.3 },
    { n: 'Якутск', x: 1088.3, y: 486.2 },
    { n: 'Комсомольск-на-Амуре', x: 1268.1, y: 649.3 },
    { n: 'Хабаровск', x: 1267.6, y: 697.4 },
    { n: 'Владивосток', x: 1278.7, y: 810.9, lab: true }
  ];
  var routes = [
    { a: 0, b: 5, m: 'rail' }, { a: 5, b: 15, m: 'rail' }, { a: 15, b: 16, m: 'rail' }, { a: 16, b: 19, m: 'rail' },
    { a: 19, b: 22, m: 'rail' }, { a: 22, b: 23, m: 'rail' }, { a: 23, b: 24, m: 'rail' }, { a: 24, b: 27, m: 'rail' },
    { a: 27, b: 28, m: 'rail' }, { a: 28, b: 29, m: 'rail' }, { a: 29, b: 33, m: 'rail' }, { a: 33, b: 34, m: 'rail' },
    { a: 24, b: 26, m: 'rail' }, { a: 26, b: 30, m: 'rail' }, { a: 30, b: 32, m: 'rail' }, { a: 0, b: 1, m: 'rail' },
    { a: 0, b: 4, m: 'rail' }, { a: 4, b: 3, m: 'rail' }, { a: 16, b: 17, m: 'rail' }, { a: 0, b: 5, m: 'auto' },
    { a: 5, b: 6, m: 'auto' }, { a: 6, b: 14, m: 'auto' }, { a: 0, b: 7, m: 'auto' }, { a: 7, b: 14, m: 'auto' },
    { a: 14, b: 17, m: 'auto' }, { a: 0, b: 10, m: 'auto' }, { a: 10, b: 11, m: 'auto' }, { a: 11, b: 12, m: 'auto' },
    { a: 12, b: 13, m: 'auto' }, { a: 17, b: 18, m: 'auto' }, { a: 18, b: 22, m: 'auto' }, { a: 7, b: 8, m: 'auto' },
    { a: 8, b: 9, m: 'auto' }, { a: 9, b: 11, m: 'auto' }, { a: 0, b: 34, m: 'air' }, { a: 0, b: 33, m: 'air' },
    { a: 0, b: 31, m: 'air' }, { a: 0, b: 2, m: 'air' }, { a: 0, b: 27, m: 'air' }, { a: 0, b: 20, m: 'air' },
    { a: 1, b: 16, m: 'air' }, { a: 23, b: 25, m: 'air' }, { a: 20, b: 21, m: 'air' }, { a: 23, b: 31, m: 'air' },
    { a: 0, b: 23, m: 'air' }
  ];
  function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); return e; }

  var cargos = [];
  routes.forEach(function (r) {
    var a = C[r.a], b = C[r.b];
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    var px = -dy / len, py = dx / len; if (py > 0) { px = -px; py = -py; } // по умолчанию выгиб вверх
    if (r.m === 'auto') { px = -px; py = -py; } // авто — выгиб вниз, чтобы не сливаться с ж/д
    var k = (r.m === 'air') ? 0.30 : 0.07;
    var cx = mx + px * len * k, cy = my + py * len * k;
    var path = el('path', { d: 'M' + a.x + ' ' + a.y + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + b.x + ' ' + b.y, 'class': 'route route--' + r.m });
    svg.appendChild(path);
    var cargo = el('circle', { r: 3.2, 'class': 'cargo' });
    svg.appendChild(cargo);
    r._path = path;
    cargos.push({ a: a, c: { x: cx, y: cy }, b: b, len: len, el: cargo, t: Math.random(), mode: r.m });
  });

  function showTip(c) { tip.hidden = false; tip.textContent = c.n + (c.office ? ' · центральный офис' : ''); tip.style.left = (c.x / VW * 100) + '%'; tip.style.top = (c.y / VH * 100) + '%'; }
  function hideTip() { tip.hidden = true; }

  C.forEach(function (c) {
    if (!reduce) svg.appendChild(el('circle', { cx: c.x, cy: c.y, r: c.office ? 6 : 4, 'class': 'pulse' }));
    var node = el('circle', { cx: c.x, cy: c.y, r: c.office ? 6.5 : 4.5, 'class': 'node' + (c.office ? ' node--office' : ''), tabindex: 0, role: 'img' });
    node.setAttribute('aria-label', c.n);
    var title = el('title', {}); title.textContent = c.n; node.appendChild(title);
    node.addEventListener('mouseenter', function () { showTip(c); });
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('focus', function () { showTip(c); });
    node.addEventListener('blur', hideTip);
    svg.appendChild(node);
    if (c.office || c.lab) { var lb = el('text', { x: c.x, y: c.y - 13, 'text-anchor': 'middle', 'class': 'node-label' }); lb.textContent = c.n; svg.appendChild(lb); }
  });

  var mode = 'all';
  function apply() {
    routes.forEach(function (r) { r._path.classList.toggle('dim', !(mode === 'all' || mode === r.m)); });
    cargos.forEach(function (cg) { cg.el.style.display = (mode === 'all' || mode === cg.mode) ? '' : 'none'; });
  }
  document.querySelectorAll('.geomap__mode').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.geomap__mode').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active'); mode = btn.getAttribute('data-mode'); apply();
    });
  });
  apply();

  function qbez(t, a, c, b) { var u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; }
  if (reduce) {
    cargos.forEach(function (cg) { var p = qbez(0.5, cg.a, cg.c, cg.b); cg.el.setAttribute('cx', p.x.toFixed(1)); cg.el.setAttribute('cy', p.y.toFixed(1)); });
    return;
  }
  var last = performance.now();
  function frame(now) {
    var dt = now - last; last = now;
    cargos.forEach(function (cg) {
      if (cg.el.style.display === 'none') return;
      cg.t += dt * 0.06 / cg.len; if (cg.t > 1) cg.t -= 1;
      var p = qbez(cg.t, cg.a, cg.c, cg.b);
      cg.el.setAttribute('cx', p.x.toFixed(1)); cg.el.setAttribute('cy', p.y.toFixed(1));
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
