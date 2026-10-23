/* ig-dm-funnel.js - кнопки тарифов -> Instagram Direct (@ecm.systems)
 * 1) копирует готовый текст заявки в буфер обмена,
 * 2) показывает минималистичный toast,
 * 3) мобильные: пробует открыть приложение (instagram://), через 1.5 с запасной вариант - веб;
 *    десктоп: профиль в новой вкладке.
 * Подключение: <script src="ig-dm-funnel.js" defer></script> перед </body>.
 * Стили и тост создаются скриптом, разметку страницы менять не нужно.
 */
(function () {
  'use strict';

  var CFG = {
    handle: 'ecm.systems',
    pilotDays: 14,            // оффер на сайте и в постах: 14 дней. Если станет 7, поменяйте здесь.
    openDelayMs: 350,         // пауза, чтобы toast успел показаться
    fallbackMs: 1500,         // таймаут запасного перехода в веб
    toastMs: 3200,
    messages: {
      pilot: "Hi! I'd like to start the {days}-day Pilot ($149) for my Shopify store: ",
      full: "Hi! I'd like to start the Full Setup ($499) for my Shopify store: ",
      suite: "Hi! I'd like to start the Full Suite ($999) for my Shopify store: "
    },
    // Кнопки находятся по data-testid. Либо добавьте на любую кнопку data-ig="pilot|full|suite".
    testids: {
      'roi-pilot-btn': 'pilot',
      'plan-pilot-btn': 'pilot',
      'plan-pro-btn': 'full',
      'plan-flagship-btn': 'suite'
    }
  };

  var WEB_URL = 'https://instagram.com/' + CFG.handle + '/';
  // Вариант, который сразу открывает диалог (проверьте на своём аккаунте): https://ig.me/m/ecm.systems
  var APP_URL = 'instagram://user?username=' + CFG.handle;

  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isMobile = isIOS || isAndroid;
  var inInstagram = /Instagram/i.test(ua);   // страница открыта внутри браузера Instagram

  /* ---------- стили тоста (шрифт наследуется от страницы) ---------- */
  var css = '#ecm-toast{position:fixed;left:50%;bottom:max(24px,env(safe-area-inset-bottom));' +
    'transform:translate(-50%,16px);opacity:0;pointer-events:none;z-index:2147483000;' +
    'display:flex;align-items:center;gap:12px;max-width:min(92vw,440px);padding:13px 18px;' +
    'border-radius:14px;background:rgba(12,14,19,.92);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
    'border:1px solid rgba(138,153,181,.28);box-shadow:0 18px 40px -12px rgba(0,0,0,.7);' +
    'color:#F1F5F9;font-family:inherit;font-size:14px;line-height:1.4;font-weight:500;' +
    'transition:opacity .25s ease,transform .25s ease}' +
    '#ecm-toast.show{opacity:1;transform:translate(-50%,0)}' +
    '#ecm-toast .ecm-dot{flex:none;width:8px;height:8px;border-radius:50%;background:#34D399;box-shadow:0 0 0 4px rgba(52,211,153,.15)}' +
    '#ecm-toast .ecm-sub{display:block;margin-top:2px;font-size:12px;font-weight:400;color:#94A3B8;word-break:break-word}' +
    '@media (prefers-reduced-motion:reduce){#ecm-toast{transition:none}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var toastEl, toastTimer;
  function toast(title, sub, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'ecm-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = '';
    var dot = document.createElement('span');
    dot.className = 'ecm-dot';
    var box = document.createElement('span');
    var b = document.createElement('span');
    b.textContent = title;
    box.appendChild(b);
    if (sub) {
      var s = document.createElement('span');
      s.className = 'ecm-sub';
      s.textContent = sub;
      box.appendChild(s);
    }
    toastEl.appendChild(dot);
    toastEl.appendChild(box);
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || CFG.toastMs);
  }

  /* ---------- копирование: сначала синхронный способ (надёжнее на iOS), затем Clipboard API ---------- */
  function execCopy(text) {
    var ok = false;
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) { ok = false; }
    return ok;
  }

  function copy(text, done) {
    if (execCopy(text)) { done(true); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  }

  /* ---------- открытие Instagram ---------- */
  var left = false;   // страница ушла в фон, значит приложение открылось
  document.addEventListener('visibilitychange', function () { if (document.hidden) left = true; });
  window.addEventListener('pagehide', function () { left = true; });
  window.addEventListener('blur', function () { left = true; });

  function openInstagram(popup) {
    setTimeout(function () {
      if (isMobile && !inInstagram) {
        left = false;
        window.location.href = APP_URL;
        setTimeout(function () {
          if (!left && !document.hidden) window.location.href = WEB_URL;
        }, CFG.fallbackMs);
      } else if (isMobile) {
        window.location.href = WEB_URL;
      } else if (popup && !popup.closed) {
        try { popup.opener = null; } catch (e) { /* ignore */ }
        popup.location.href = WEB_URL;
      } else {
        window.location.href = WEB_URL;   // всплывающее окно заблокировано
      }
    }, CFG.openDelayMs);
  }

  function buildMessage(type) {
    return (CFG.messages[type] || CFG.messages.pilot).replace('{days}', CFG.pilotDays);
  }

  function start(type) {
    var text = buildMessage(type);
    // На десктопе окно открываем сразу в клике, иначе его блокирует браузер.
    var popup = isMobile ? null : window.open('', '_blank');
    copy(text, function (ok) {
      if (ok) {
        toast('Message copied to clipboard!', 'Opening Instagram Direct…');
      } else {
        toast('Could not copy automatically', 'Paste this in the chat: ' + text, 7000);
      }
    });
    openInstagram(popup);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var el = e.target.closest ? e.target.closest('[data-ig],[data-testid]') : null;
    if (!el) return;
    var type = el.getAttribute('data-ig') || CFG.testids[el.getAttribute('data-testid')];
    if (!type) return;
    e.preventDefault();   // href="mailto:..." остаётся запасным вариантом, если JS не загрузился
    start(type);
  });

  window.ECM_IG = { buildMessage: buildMessage, config: CFG };
})();
