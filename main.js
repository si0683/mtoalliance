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

  // Contact form → FormSubmit (без бэкенда)
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

    function showNote(msg, err) {
      note.textContent = msg; note.hidden = false;
      note.classList.toggle('form__note--error', !!err);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var payload = {
        name: document.getElementById('f-name').value.trim(),
        company: document.getElementById('f-company').value.trim(),
        phone: document.getElementById('f-phone').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        message: document.getElementById('f-msg').value.trim(),
        _subject: 'Заявка с сайта МТО-Альянс',
        _template: 'table'
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
