// ===== МТО-Альянс · main.js =====
(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  // Sticky header solid on scroll
  var header = document.querySelector('.header');
  var onScroll = function () { header.classList.toggle('solid', window.scrollY > 20); };
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  });

  // Reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else { revealEls.forEach(function (el) { el.classList.add('in'); }); }

  // Count-up stats
  var counted = false;
  function animateCounts() {
    if (counted) return; counted = true;
    document.querySelectorAll('.stat b[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var dur = 1400, start = performance.now();
      function tick(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('ru-RU');
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  var statsSec = document.getElementById('stats');
  if ('IntersectionObserver' in window && statsSec) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCounts(); io2.disconnect(); } });
    }, { threshold: 0.4 });
    io2.observe(statsSec);
  } else { animateCounts(); }

  // Contact form → FormSubmit (без бэкенда) + валидация + антиспам
  var form = document.getElementById('form');
  if (form) {
    var note = document.getElementById('form-note');
    var btn = form.querySelector('button[type="submit"]');
    var btnText = btn.textContent;

    // ── Куда и как отправлять заявки ──────────────────────────────
    //  FORM_MODE:
    //   'formsubmit' — работает на статике / GitHub Pages (сервис FormSubmit)
    //   'php'        — свой серверный обработчик send.php (нужен PHP-хостинг)
    var FORM_MODE = 'formsubmit';
    var PHP_ENDPOINT = 'send.php';
    //  Адрес получателя (для режима formsubmit). ВРЕМЕННЫЙ — для проверки.
    //  После теста заменить на 'info@mto-smr.ru' (и переменную $TO в send.php).
    var FORM_TARGET = 'vasiliysidorenko63@yandex.ru';
    var endpoint = FORM_MODE === 'php'
      ? PHP_ENDPOINT
      : 'https://formsubmit.co/ajax/' + FORM_TARGET;
    if (FORM_MODE !== 'php') form.setAttribute('action', 'https://formsubmit.co/' + FORM_TARGET);

    // ── Антиспам: временная ловушка + математический вопрос ──
    var loadedAt = Date.now();
    var ca = 1 + Math.floor(Math.random() * 8), cb = 1 + Math.floor(Math.random() * 8);
    document.getElementById('captcha-label').textContent = 'Защита от ботов: сколько будет ' + ca + ' + ' + cb + '?';

    function fieldOf(id) { return document.getElementById(id).closest('.field'); }
    function setErr(id, msg) { var f = fieldOf(id); f.classList.add('invalid'); f.querySelector('.err').textContent = msg; }
    function clearErr(id) { fieldOf(id).classList.remove('invalid'); }

    // Проверка ИНН (10 или 12 цифр) по контрольным разрядам
    function validINN(v) {
      v = v.replace(/\D/g, '');
      if (v.length !== 10 && v.length !== 12) return false;
      var d = v.split('').map(Number);
      function ctrl(nums, k) { var s = 0; for (var i = 0; i < k.length; i++) s += k[i] * nums[i]; return (s % 11) % 10; }
      if (v.length === 10) return ctrl(d, [2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[9];
      var n11 = ctrl(d, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
      var n12 = ctrl(d, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
      return n11 === d[10] && n12 === d[11];
    }
    // Российский номер: 11 цифр, начинается с 7 или 8
    function normPhone(v) {
      var d = v.replace(/\D/g, '');
      if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
      return d;
    }
    function validPhone(v) { return /^7\d{10}$/.test(normPhone(v)); }
    function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

    // Маска телефона: +7 (XXX) XXX-XX-XX
    var phoneEl = document.getElementById('f-phone');
    phoneEl.addEventListener('input', function () {
      var d = phoneEl.value.replace(/\D/g, '');
      if (d && (d[0] === '8' || d[0] === '9')) d = (d[0] === '9' ? '7' + d : '7' + d.slice(1));
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 4) out += ') ' + d.slice(4, 7);
      if (d.length >= 7) out += '-' + d.slice(7, 9);
      if (d.length >= 9) out += '-' + d.slice(9, 11);
      phoneEl.value = d.length ? out : '';
    });
    // ИНН и капча — только цифры
    ['f-inn', 'f-captcha'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('input', function () { el.value = el.value.replace(/\D/g, ''); });
    });
    // Снимать ошибку при вводе
    ['f-name', 'f-inn', 'f-phone', 'f-email', 'f-captcha'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () { clearErr(id); });
    });

    // Файлы-вложения: до 10 шт., суммарно до 100 МБ
    var ALLOWED_EXT = ['pdf','doc','docx','xls','xlsx','ppt','pptx','odp','odt','ods','rtf','txt','csv','jpg','jpeg','png','tif','tiff','bmp','zip','rar','7z'];
    var MAX_FILES = 10;
    var MAX_TOTAL = 100 * 1024 * 1024; // 100 МБ
    var fileEl = document.getElementById('f-file');
    var fileDrop = document.getElementById('file-drop');
    var fileNameEl = document.getElementById('file-name');
    var fileListEl = document.getElementById('file-list');
    var fileDefault = fileNameEl.textContent;
    var selectedFiles = []; // собственный список — чтобы можно было удалять отдельные файлы
    function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ'; }
    function resetFileUI() { selectedFiles = []; renderFiles(); }
    function renderFiles() {
      fileListEl.innerHTML = '';
      if (!selectedFiles.length) { fileNameEl.textContent = fileDefault; fileDrop.classList.remove('has-file'); return; }
      var total = 0;
      selectedFiles.forEach(function (f, idx) {
        total += f.size;
        var li = document.createElement('li');
        var n = document.createElement('span'); n.className = 'fl-name'; n.textContent = f.name;
        var s = document.createElement('span'); s.className = 'fl-size'; s.textContent = fmtSize(f.size);
        var rm = document.createElement('button');
        rm.type = 'button'; rm.className = 'fl-remove'; rm.setAttribute('aria-label', 'Удалить файл'); rm.textContent = '×';
        rm.addEventListener('click', function () { selectedFiles.splice(idx, 1); clearErr('f-file'); renderFiles(); });
        li.appendChild(n); li.appendChild(s); li.appendChild(rm);
        fileListEl.appendChild(li);
      });
      fileNameEl.textContent = 'Выбрано файлов: ' + selectedFiles.length + ' · ' + fmtSize(total);
      fileDrop.classList.add('has-file');
    }
    function addFiles(list) {
      clearErr('f-file');
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        var dup = selectedFiles.some(function (x) { return x.name === f.name && x.size === f.size; });
        if (!dup) selectedFiles.push(f);
      }
      renderFiles();
    }
    fileEl.addEventListener('change', function () { addFiles(fileEl.files); fileEl.value = ''; });

    // Drag & drop
    ['dragenter', 'dragover'].forEach(function (ev) {
      fileDrop.addEventListener(ev, function (e) { e.preventDefault(); fileDrop.classList.add('dragover'); });
    });
    ['dragleave', 'dragend'].forEach(function (ev) {
      fileDrop.addEventListener(ev, function (e) { e.preventDefault(); fileDrop.classList.remove('dragover'); });
    });
    fileDrop.addEventListener('drop', function (e) {
      e.preventDefault(); fileDrop.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    // чтобы случайный промах не открыл файл в браузере
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });
    function fileError() {
      if (!selectedFiles.length) return null; // файлы необязательны
      if (selectedFiles.length > MAX_FILES) return 'Не более ' + MAX_FILES + ' файлов';
      var total = 0;
      for (var i = 0; i < selectedFiles.length; i++) {
        var ext = (selectedFiles[i].name.split('.').pop() || '').toLowerCase();
        if (ALLOWED_EXT.indexOf(ext) === -1) return 'Недопустимый тип файла: ' + selectedFiles[i].name;
        total += selectedFiles[i].size;
      }
      if (total > MAX_TOTAL) return 'Суммарный размер файлов больше 100 МБ';
      return null;
    }

    function showNote(msg, err) {
      note.textContent = msg; note.hidden = false;
      note.classList.toggle('form__note--error', !!err);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Антибот: honeypot заполнен или форма отправлена слишком быстро
      if (document.getElementById('f-honey').value || (Date.now() - loadedAt) < 3000) {
        showNote('Не удалось отправить. Повторите попытку через пару секунд.', true);
        return;
      }

      var name = document.getElementById('f-name').value.trim();
      var inn = document.getElementById('f-inn').value.trim();
      var phone = document.getElementById('f-phone').value.trim();
      var email = document.getElementById('f-email').value.trim();
      var cap = document.getElementById('f-captcha').value.trim();
      var honey = document.getElementById('f-honey').value;

      var firstBad = null;
      function check(ok, id, m) { if (!ok) { setErr(id, m); if (!firstBad) firstBad = id; } }
      check(name.length >= 2, 'f-name', 'Укажите ваше имя');
      check(validINN(inn), 'f-inn', 'Некорректный ИНН (10 или 12 цифр)');
      check(validPhone(phone), 'f-phone', 'Российский номер: 11 цифр, например +7 (846) 979-99-99');
      check(validEmail(email), 'f-email', 'Введите корректный e-mail, например name@company.ru');
      var fErr = fileError(); if (fErr) { setErr('f-file', fErr); if (!firstBad) firstBad = 'f-file'; }
      check(parseInt(cap, 10) === ca + cb, 'f-captcha', 'Неверный ответ на пример');

      if (firstBad) { document.getElementById(firstBad).focus(); return; }

      var files = selectedFiles;
      var reqOpts;
      if (files.length) {
        // с файлами — только multipart/form-data (браузер сам проставит Content-Type)
        var fd = new FormData();
        fd.append('name', name); fd.append('inn', inn); fd.append('phone', normPhone(phone));
        fd.append('email', email); fd.append('_honey', honey);
        fd.append('_subject', 'Заявка с сайта МТО-Альянс'); fd.append('_template', 'table');
        for (var fi = 0; fi < files.length; fi++) { fd.append('attachment[]', files[fi], files[fi].name); }
        reqOpts = { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd };
      } else {
        var payload = {
          name: name, inn: inn, phone: normPhone(phone), email: email,
          _honey: honey, _subject: 'Заявка с сайта МТО-Альянс', _template: 'table'
        };
        reqOpts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) };
      }

      btn.disabled = true; btn.textContent = 'Отправляем…'; note.hidden = true;
      fetch(endpoint, reqOpts)
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error();
          form.reset(); resetFileUI(); showNote('Спасибо! Заявка отправлена — мы свяжемся с вами.', false);
          btn.textContent = 'Отправлено';
        })
        .catch(function () {
          showNote('Не удалось отправить. Позвоните нам: 8 (846) 979-99-99 или напишите на info@mto-smr.ru', true);
          btn.disabled = false; btn.textContent = btnText;
        });
    });
  }

  // ===== Живая карта поставок =====
  (function initMap() {
    var svg = document.querySelector('.geomap__svg');
    if (!svg) return;
    var tip = document.getElementById('geomap-tip');
    var NS = 'http://www.w3.org/2000/svg';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var VW = 1500, VH = 882;

    var C = [
      { n: 'Москва', x: 225.2, y: 371.2 },
      { n: 'Санкт-Петербург', x: 253.1, y: 261.0 },
      { n: 'Мурманск', x: 419.6, y: 187.0 },
      { n: 'Краснодар', x: 66.4, y: 512.9 },
      { n: 'Самара', x: 283.6, y: 512.3, office: true },
      { n: 'Казань', x: 310.3, y: 466.4 },
      { n: 'Уфа', x: 355.2, y: 532.6 },
      { n: 'Екатеринбург', x: 421.5, y: 528.7 },
      { n: 'Тюмень', x: 469.8, y: 551.2 },
      { n: 'Сургут', x: 577.3, y: 512.5 },
      { n: 'Новый Уренгой', x: 639.3, y: 432.8 },
      { n: 'Новосибирск', x: 631.1, y: 662.1 },
      { n: 'Норильск', x: 739.9, y: 392.7 },
      { n: 'Красноярск', x: 744.0, y: 662.9 },
      { n: 'Иркутск', x: 874.9, y: 739.7 },
      { n: 'Хабаровск', x: 1267.6, y: 697.4 },
      { n: 'Владивосток', x: 1278.7, y: 810.9 }
    ];
    var routes = [
      { a: 7, b: 9, m: 'rail' }, { a: 0, b: 5, m: 'rail' }, { a: 11, b: 13, m: 'rail' },
      { a: 6, b: 8, m: 'rail' }, { a: 13, b: 14, m: 'rail' }, { a: 3, b: 0, m: 'rail' },
      { a: 5, b: 6, m: 'auto' }, { a: 7, b: 8, m: 'auto' }, { a: 1, b: 0, m: 'auto' },
      { a: 11, b: 7, m: 'auto' }, { a: 6, b: 4, m: 'auto' },
      { a: 0, b: 16, m: 'air' }, { a: 9, b: 10, m: 'air' }, { a: 11, b: 12, m: 'air' },
      { a: 0, b: 15, m: 'air' }, { a: 1, b: 13, m: 'air' }, { a: 2, b: 0, m: 'air' }, { a: 4, b: 14, m: 'air' }
    ];
    function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); return e; }

    var cargos = [];
    routes.forEach(function (r) {
      var a = C[r.a], b = C[r.b];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      var px = -dy / len, py = dx / len; if (py > 0) { px = -px; py = -py; } // выгиб вверх
      var k = (r.m === 'air') ? 0.28 : 0.12;
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
      if (c.office) { var lb = el('text', { x: c.x, y: c.y - 13, 'text-anchor': 'middle', 'class': 'node-label' }); lb.textContent = 'Самара'; svg.appendChild(lb); }
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
})();
