/* =============================================================================
   Trình chiếu proposal Redsun (dùng chung cho mọi bộ proposal)
   - <body data-mode="internal">: bản nội bộ, có ghi chú người thuyết trình (phím N / nút Ghi chú)
   - <body data-mode="client">  : bản gửi khách, file HTML không chứa ghi chú
   - Thông tin điền sẵn ([data-field]): window.RS_FIELDS (máy chủ chèn) hoặc tham số đường dẫn
     kh = tên khách hàng, tv = chuyên viên, cv = chức danh, sdt = điện thoại, email = email
   - window.RS.exportPdf(): xuất PDF (luôn bỏ ghi chú) – dùng trong tool và trên trang gửi khách
   ============================================================================= */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  var body = document.body, mode = body.getAttribute('data-mode') || 'client';
  var internal = mode === 'internal';
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var deck = document.getElementById('deck'), count = document.getElementById('count'), notes = document.getElementById('notes');
  var q = new URLSearchParams(location.search);
  var embedded = q.get('embed') === '1';
  var locked = !!window.RS_LOCKED;
  var i = 0;

  /* ---------- Thông tin điền sẵn ---------- */
  var given = window.RS_FIELDS || {};
  [].forEach.call(document.querySelectorAll('[data-field]'), function (el) {
    var k = el.getAttribute('data-field');
    var v = given[k] != null && given[k] !== '' ? given[k] : q.get(k);
    if (v) el.textContent = String(v).slice(0, 200);
    if (el.hasAttribute('data-hide-empty') && !el.textContent.trim()) { el.style.display = 'none'; return; }
    if (!locked && !embedded) {
      el.contentEditable = 'true'; el.spellcheck = false; el.title = 'Bấm để sửa';
      el.addEventListener('click', function (e) { e.stopPropagation(); });
    }
  });
  if (!locked && !embedded) body.classList.add('rs-edit');

  /* ---------- Mã QR gọi điện: <img data-qr="sdt"> lấy số trong [data-field="sdt"] ---------- */
  function drawQr() {
    if (typeof window.qrcode !== 'function') return;
    [].forEach.call(document.querySelectorAll('img[data-qr]'), function (img) {
      var src = document.querySelector('[data-field="' + img.getAttribute('data-qr') + '"]');
      var num = src ? src.textContent.replace(/[^\d+]/g, '') : '';
      if (num.length < 8) { img.style.visibility = 'hidden'; return; }
      try {
        var qr = window.qrcode(0, 'M'); qr.addData('tel:' + num); qr.make();
        img.src = qr.createDataURL(10, 2); img.alt = 'Mã QR gọi ' + num; img.style.visibility = '';
      } catch (e) { img.style.visibility = 'hidden'; }
    });
  }
  drawQr();
  [].forEach.call(document.querySelectorAll('[data-field="sdt"]'), function (el) { el.addEventListener('blur', drawQr); });

  /* ---------- Điều hướng ---------- */
  function fit() { var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080); deck.style.transform = 'scale(' + s + ')'; }
  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (el, k) { el.classList.toggle('active', k === i); });
    if (count) count.textContent = (i + 1) + ' / ' + slides.length;
    if (notes) { var a = slides[i].querySelector('aside'); notes.innerHTML = '<b>GHI CHÚ – TRANG ' + (i + 1) + '</b>'; notes.appendChild(document.createTextNode(a ? a.textContent : '(Không có ghi chú)')); }
    if (!embedded && location.hash !== '#' + (i + 1)) history.replaceState(null, '', location.pathname + location.search + '#' + (i + 1));
  }
  function go(d) { show(i + d); }
  function toggleNotes() {
    if (!internal) return;
    body.classList.toggle('show-notes');
    var b = document.getElementById('notesBtn'); if (b) b.classList.toggle('on', body.classList.contains('show-notes'));
  }
  function fs() { if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
  function bind(id, fn) { var el = document.getElementById(id); if (el) el.onclick = fn; }
  bind('prev', function () { go(-1); }); bind('next', function () { go(1); });
  bind('notesBtn', toggleNotes); bind('fsBtn', fs);
  bind('pdfBtn', function () { downloadPdf(); });
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.isContentEditable) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.target.blur(); } return; }
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].indexOf(e.key) >= 0) { e.preventDefault(); go(1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].indexOf(e.key) >= 0) { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') show(0); else if (e.key === 'End') show(slides.length - 1);
    else if (e.key === 'n' || e.key === 'N') toggleNotes();
    else if (e.key === 'f' || e.key === 'F') fs();
  });
  document.getElementById('stage').addEventListener('click', function (e) { if (e.clientX > window.innerWidth / 2) go(1); else go(-1); });
  var tx = null;
  document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function (e) { if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); tx = null; });
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function () { var n = parseInt(location.hash.slice(1), 10); if (n) show(n - 1); });

  /* ---------- Xuất PDF (bỏ ghi chú) ---------- */
  function loadScript(src) {
    return new Promise(function (ok, fail) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { fail(new Error('Không tải được thư viện ' + src)); }; document.head.appendChild(s); });
  }
  var libs = null;
  function loadLibs() {
    if (!libs) libs = Promise.all([
      window.htmlToImage ? 1 : loadScript(BASE + 'vendor/html-to-image.js'),
      window.jspdf ? 1 : loadScript(BASE + 'vendor/jspdf.umd.min.js')
    ]);
    return libs;
  }
  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function pdfName() {
    var base = body.getAttribute('data-pdf-name') || 'Redsun-Proposal';
    var kh = document.querySelector('[data-field="kh"]'), def = kh && kh.getAttribute('data-default');
    var who = kh && kh.textContent.trim() !== def ? slug(kh.textContent) : '';
    return base + (who ? '-' + who : '') + '.pdf';
  }
  async function exportPdf(onProgress) {
    await loadLibs();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var hti = window.htmlToImage, JsPDF = window.jspdf.jsPDF;
    var hold = document.getElementById('rs-hold');
    if (!hold) { hold = document.createElement('div'); hold.id = 'rs-hold'; hold.setAttribute('aria-hidden', 'true'); deck.appendChild(hold); }
    hold.innerHTML = '';
    var pdf = new JsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080], hotfixes: ['px_scaling'], compress: true });
    var fontCSS = null;
    try {
      for (var k = 0; k < slides.length; k++) {
        if (onProgress) onProgress(k, slides.length);
        var c = slides[k].cloneNode(true);
        [].forEach.call(c.querySelectorAll('aside'), function (a) { a.remove(); });
        [].forEach.call(c.querySelectorAll('[contenteditable]'), function (a) { a.removeAttribute('contenteditable'); });
        c.classList.add('active', 'rs-cap'); c.removeAttribute('id');
        hold.innerHTML = ''; hold.appendChild(c);
        if (fontCSS === null) fontCSS = await hti.getFontEmbedCSS(c);
        var url = await hti.toJpeg(c, { width: 1920, height: 1080, pixelRatio: 1, quality: 0.86, fontEmbedCSS: fontCSS, cacheBust: false });
        if (k) pdf.addPage([1920, 1080], 'landscape');
        pdf.addImage(url, 'JPEG', 0, 0, 1920, 1080, undefined, 'FAST');
      }
    } finally { hold.innerHTML = ''; }
    if (onProgress) onProgress(slides.length, slides.length);
    pdf.setProperties({ title: document.title, creator: 'Redsun' });
    return pdf.output('blob');
  }
  async function downloadPdf() {
    var b = document.getElementById('pdfBtn'), label = b ? b.textContent : '';
    body.classList.add('rs-busy');
    if (b) b.disabled = true;
    try {
      var blob = await exportPdf(function (k, n) { if (b) b.textContent = 'Đang tạo PDF ' + Math.min(k + 1, n) + '/' + n; });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = pdfName();
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    } catch (e) { alert('Không tạo được PDF: ' + (e && e.message || e) + '\nCó thể dùng Ctrl/Cmd + P → Lưu thành PDF.'); }
    finally { if (b) { b.disabled = false; b.textContent = label; } body.classList.remove('rs-busy'); }
  }
  window.RS = { exportPdf: exportPdf, downloadPdf: downloadPdf, pdfName: pdfName, count: slides.length, show: show };

  fit();
  var h = parseInt(location.hash.slice(1), 10); show(h ? h - 1 : 0);
})();
