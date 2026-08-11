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

    // ── Адрес получателя заявок. После активации на formsubmit.co
    //    можно заменить почту на зашифрованный alias. ──
    var FORM_TARGET = 'info@mto-smr.ru';
    var endpoint = 'https://formsubmit.co/ajax/' + FORM_TARGET;
    form.setAttribute('action', 'https://formsubmit.co/' + FORM_TARGET);

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
      var msg = document.getElementById('f-msg').value.trim();
      var cap = document.getElementById('f-captcha').value.trim();

      var firstBad = null;
      function check(ok, id, m) { if (!ok) { setErr(id, m); if (!firstBad) firstBad = id; } }
      check(name.length >= 2, 'f-name', 'Укажите ваше имя');
      check(validINN(inn), 'f-inn', 'Некорректный ИНН (10 или 12 цифр)');
      check(validPhone(phone), 'f-phone', 'Российский номер: 11 цифр, например +7 (846) 979-99-99');
      check(validEmail(email), 'f-email', 'Введите корректный e-mail, например name@company.ru');
      check(parseInt(cap, 10) === ca + cb, 'f-captcha', 'Неверный ответ на пример');

      if (firstBad) { document.getElementById(firstBad).focus(); return; }

      var payload = {
        name: name, inn: inn, phone: normPhone(phone), email: email, message: msg,
        _subject: 'Заявка с сайта МТО-Альянс', _template: 'table'
      };
      btn.disabled = true; btn.textContent = 'Отправляем…'; note.hidden = true;
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error();
          form.reset(); showNote('Спасибо! Заявка отправлена — мы свяжемся с вами.', false);
          btn.textContent = 'Отправлено';
        })
        .catch(function () {
          showNote('Не удалось отправить. Позвоните нам: 8 (846) 979-99-99 или напишите на info@mto-smr.ru', true);
          btn.disabled = false; btn.textContent = btnText;
        });
    });
  }
})();
