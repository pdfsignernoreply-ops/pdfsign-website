/**
 * PDFSign — Microsoft Store install guidance modal
 * Single source of truth for all pages (index + all blog posts).
 * To update the modal: edit THIS file only. Changes apply everywhere automatically.
 *
 * What it does:
 *  1. Injects modal CSS into <head>
 *  2. Injects modal HTML into <body>
 *  3. Auto-wires every <a href="...api/download..."> on the page
 *  4. Adds download-button glow animation to .btn-primary, .btn-primary-lg, .btn-green, .nav-cta
 */
(function () {
  'use strict';

  var DOWNLOAD_URL = 'https://pdfsigner-api.vercel.app/api/download';

  /* ─── CSS ─────────────────────────────────────────────────────────────── */
  var CSS = [
    /* Button glow — works on all pages that use these classes */
    '@keyframes dl-glow {',
    '  0%,100% { box-shadow: 0 0 8px 2px rgba(22,163,74,0.45), 0 4px 16px rgba(22,163,74,0.25); }',
    '  50%      { box-shadow: 0 0 22px 6px rgba(22,163,74,0.75), 0 4px 24px rgba(22,163,74,0.45); }',
    '}',
    '.btn-primary,.btn-primary-lg,.btn-green,.nav-cta { animation: dl-glow 2.2s ease-in-out infinite; }',

    /* Overlay */
    '#ms-modal-overlay {',
    '  display:none; position:fixed; inset:0; z-index:9999;',
    '  background:rgba(10,15,25,0.72); backdrop-filter:blur(4px);',
    '  align-items:center; justify-content:center;',
    '}',
    '#ms-modal-overlay.visible { display:flex; }',

    /* Card */
    '#ms-modal {',
    '  background:#fff; border-radius:20px; padding:36px 40px 32px;',
    '  max-width:460px; width:90%; text-align:center;',
    '  box-shadow:0 24px 64px rgba(0,0,0,0.35);',
    '  animation:modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1);',
    '}',
    '@keyframes modal-in {',
    '  from { opacity:0; transform:scale(0.88) translateY(16px); }',
    '  to   { opacity:1; transform:scale(1) translateY(0); }',
    '}',
    '#ms-modal .modal-icon  { font-size:42px; margin-bottom:12px; }',
    '#ms-modal h2           { font-size:20px; font-weight:700; color:#1B2A47; margin:0 0 6px; }',
    '#ms-modal .modal-sub   { font-size:14px; color:#64748b; margin:0 0 24px; }',

    /* Steps */
    '#ms-modal .modal-steps { display:flex; flex-direction:column; gap:12px;',
    '  background:#f8fafc; border-radius:12px; padding:18px 20px; margin-bottom:24px; text-align:left; }',
    '#ms-modal .modal-step  { display:flex; align-items:center; gap:12px; }',
    '#ms-modal .step-num    { width:26px; height:26px; border-radius:50%; background:#1B2A47; color:#fff;',
    '  font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
    '#ms-modal .step-text   { font-size:14px; color:#334155; line-height:1.45; }',
    '#ms-modal .step-text strong { color:#1B2A47; }',
    '#ms-modal .fake-get    { display:inline-block; background:#0078d4; color:#fff;',
    '  font-size:12px; font-weight:700; padding:4px 14px; border-radius:4px; vertical-align:middle; }',

    /* Buttons */
    '#ms-modal .modal-btn   { display:block; width:100%; background:#16A34A; color:#fff;',
    '  border:none; border-radius:12px; padding:13px 0; font-size:15px; font-weight:700;',
    '  cursor:pointer; text-decoration:none; transition:background 0.2s; margin-bottom:10px; box-sizing:border-box; }',
    '#ms-modal .modal-btn:hover { background:#15803d; }',
    '#ms-modal .modal-dismiss { font-size:13px; color:#94a3b8; cursor:pointer; background:none; border:none; }',
    '#ms-modal .modal-dismiss:hover { color:#64748b; }',

    /* Timer pill */
    '#ms-modal .modal-timer { font-size:13px; color:#475569; margin-top:10px;',
    '  background:#f1f5f9; border-radius:8px; padding:8px 14px; display:inline-block; }',
    '#ms-modal .modal-timer #ms-count { font-size:17px; font-weight:800; color:#16A34A; }'
  ].join('\n');

  /* ─── HTML ────────────────────────────────────────────────────────────── */
  var HTML = [
    '<div id="ms-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ms-modal-title">',
    '  <div id="ms-modal">',
    '    <div class="modal-icon">🪟</div>',
    '    <h2 id="ms-modal-title">Microsoft Store is opening…</h2>',
    '    <p class="modal-sub">PDFSign is distributed through Microsoft Store.<br>Follow these 2 steps to install:</p>',
    '    <div class="modal-steps">',
    '      <div class="modal-step">',
    '        <div class="step-num">1</div>',
    '        <div class="step-text">In the Store window, click the blue <span class="fake-get">Get</span> button</div>',
    '      </div>',
    '      <div class="modal-step">',
    '        <div class="step-num">2</div>',
    '        <div class="step-text">Click <strong>Install</strong> — PDFSign will be ready in under a minute</div>',
    '      </div>',
    '    </div>',
    '    <a href="' + DOWNLOAD_URL + '" class="modal-btn" id="ms-modal-gotit">Got it — Open Microsoft Store →</a>',
    '    <div><button class="modal-dismiss" onclick="MSModal.close()">Maybe later</button></div>',
    '    <p class="modal-timer">Opening automatically in <span id="ms-count">5</span>s…</p>',
    '  </div>',
    '</div>'
  ].join('\n');

  /* ─── Logic ───────────────────────────────────────────────────────────── */
  var countdown = null;

  window.MSModal = {
    open: function (e) {
      if (e) e.preventDefault();
      document.getElementById('ms-modal-overlay').classList.add('visible');
      var count = 5;
      document.getElementById('ms-count').textContent = count;
      countdown = setInterval(function () {
        count--;
        var el = document.getElementById('ms-count');
        if (el) el.textContent = count;
        if (count <= 0) {
          clearInterval(countdown);
          window.location.href = DOWNLOAD_URL;
          MSModal.close();
        }
      }, 1000);
    },
    close: function () {
      clearInterval(countdown);
      var overlay = document.getElementById('ms-modal-overlay');
      if (overlay) overlay.classList.remove('visible');
    }
  };

  /* Wire "Got it" button to also clear the timer */
  function wireGotItButton() {
    var btn = document.getElementById('ms-modal-gotit');
    if (btn) {
      btn.addEventListener('click', function () {
        clearInterval(countdown);
        MSModal.close();
      });
    }
  }

  /* Auto-wire every download link on the page */
  function wireLinks() {
    var links = document.querySelectorAll('a[href*="api/download"]');
    links.forEach(function (link) {
      if (!link.dataset.msWired) {
        link.dataset.msWired = '1';
        link.addEventListener('click', MSModal.open);
      }
    });
    wireGotItButton();
  }

  /* Close on overlay click or Escape */
  function bindDismiss() {
    var overlay = document.getElementById('ms-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) MSModal.close();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') MSModal.close();
    });
  }

  /* ─── Boot ────────────────────────────────────────────────────────────── */
  function boot() {
    /* Inject CSS */
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    /* Inject HTML */
    var wrapper = document.createElement('div');
    wrapper.innerHTML = HTML;
    document.body.appendChild(wrapper);

    wireLinks();
    bindDismiss();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
