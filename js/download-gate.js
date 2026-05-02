/**
 * download-gate.js — PDFSign download click handler
 * Shared across index.html and all blog pages.
 *
 * Behaviour:
 *  - Intercepts ALL clicks on links to the /api/download endpoint
 *  - Always fires a fetch() so the API can log platform + geo for every click
 *  - Windows 10/11  → redirects to MS Store (ms-windows-store:// deep link)
 *  - Everything else → shows the "Windows only" modal instead of redirecting
 */
(function () {
  'use strict';

  var DOWNLOAD_API = 'https://pdfsigner-api.vercel.app/api/download';
  var STORE_URL    = 'ms-windows-store://pdp/?ProductId=9PBCQ9ZM5G2X';
  var MODAL_ID     = 'pdfsignNotWindowsModal';

  /* ── Inject modal once ── */
  function injectModal() {
    if (document.getElementById(MODAL_ID)) return;
    var el = document.createElement('div');
    el.id = MODAL_ID;
    el.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,.55)',
      'z-index:9999',
      'align-items:center',
      'justify-content:center',
      'padding:1rem',
    ].join(';');
    el.innerHTML = [
      '<div style="background:#fff;border-radius:20px;padding:2.5rem 2rem;max-width:440px;',
        'width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);">',
        '<div style="font-size:3rem;margin-bottom:1rem;">💻</div>',
        '<h2 style="font-family:\'DM Serif Display\',serif;font-size:1.5rem;color:#1B2A47;',
          'margin-bottom:.75rem;">PDFSign is a Windows App</h2>',
        '<p style="color:#64748b;font-size:.95rem;line-height:1.65;margin-bottom:1.5rem;">',
          'PDFSign runs on <strong>Windows 10 and 11</strong>. Please open ',
          '<strong>pdfsign.in</strong> on your Windows PC and click Download from there.',
        '</p>',
        '<div style="background:#f8fafc;border-radius:10px;padding:1rem 1.25rem;text-align:left;',
          'margin-bottom:1.5rem;font-size:.88rem;color:#475569;line-height:1.6;">',
          '<div style="margin-bottom:.4rem;">① Open <strong>pdfsign.in</strong> on your Windows PC</div>',
          '<div style="margin-bottom:.4rem;">② Click <strong>Download Free Trial</strong></div>',
          '<div>③ Install from the <strong>Microsoft Store</strong> — free, no card needed</div>',
        '</div>',
        '<button id="pdfsignModalClose" style="background:#16A34A;color:#fff;border:none;',
          'padding:.75rem 2rem;border-radius:8px;font-weight:600;cursor:pointer;',
          'font-size:.95rem;width:100%;">Got it</button>',
        '<div style="margin-top:1rem;font-size:.82rem;color:#94a3b8;">',
          'Questions? <a href="https://wa.me/917057413999" ',
          'style="color:#16A34A;">Chat on WhatsApp</a>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(el);

    /* Close on button click */
    document.getElementById('pdfsignModalClose').addEventListener('click', closeModal);
    /* Close on backdrop click */
    el.addEventListener('click', function (e) {
      if (e.target === el) closeModal();
    });
    /* Close on Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  function openModal()  { var m = document.getElementById(MODAL_ID); if (m) m.style.display = 'flex'; }
  function closeModal() { var m = document.getElementById(MODAL_ID); if (m) m.style.display = 'none'; }

  /* Expose globally so any legacy inline onclick still works */
  window.closeNotWindowsModal = closeModal;

  /* ── Platform detection ── */
  function isWindows() {
    return /Windows NT (10|11)\./i.test(navigator.userAgent) ||
           /Win(32|64)/i.test(navigator.platform || '');
  }

  /* ── Click handler ── */
  function handleDownloadClick(e) {
    e.preventDefault();

    /* Always log — fire and forget, never block the UX */
    try { fetch(DOWNLOAD_API); } catch (_) {}

    if (isWindows()) {
      window.location = STORE_URL;
    } else {
      openModal();
    }
  }

  /* ── Event delegation — catches every download link on the page ── */
  document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a');
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (href.indexOf('pdfsigner-api.vercel.app/api/download') !== -1) {
      handleDownloadClick(e);
    }
  });

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModal);
  } else {
    injectModal();
  }
})();
