/* Proposal tải lên (PDF): hiển thị trang PDF + in chữ vào các ô thông tin, và tạo bản PDF đã điền để tải về.
   Dùng chung cho: trang khách (/p/<mã>/), trình chiếu nội bộ, trình đặt ô trong tab Proposal.
   window.RSPDF = { open, renderPage, overlay, fill, fit, buildPdf, pageSize } */
(function () {
  'use strict';
  var src = (document.currentScript && document.currentScript.src) || '';
  var BASE = src ? src.replace(/[^/]*$/, '') : '/proposal/_shared/';
  var PDFJS = /\/p\/_shared\/$/.test(new URL(BASE, location.href).pathname) ? '/p/_pdfjs/' : '/vendor/pdfjs/';
  var FONT = "'Be Vietnam Pro', Arial, sans-serif";
  var ASC = 1.0, DSC = 0.265;                 // số đo font Be Vietnam Pro (tỉ lệ cỡ chữ)
  var MIN_SHRINK = 0.4;                       // chữ dài: thu nhỏ tối đa còn 40% để vừa ô
  var lib = null;

  function pdfjs() {
    if (lib) return Promise.resolve(lib);
    return import(PDFJS + 'pdf.min.mjs').then(function (m) { m.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs'; lib = m; return m; });
  }
  function open(data) {
    return pdfjs().then(function (L) {
      return L.getDocument({ data: data, cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', isEvalSupported: false, enableXfa: false }).promise;
    });
  }
  // Kích thước trang (đơn vị pt, đúng chiều hiển thị)
  function pageSize(page) { var v = page.getViewport({ scale: 1 }); return { w: v.width, h: v.height, rotate: page.rotate || 0 }; }
  // Vẽ trang vào canvas theo bề rộng hiển thị (px CSS)
  function renderPage(page, canvas, cssWidth) {
    var v1 = page.getViewport({ scale: 1 });
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var scale = Math.max(0.2, cssWidth / v1.width) * dpr;
    var vp = page.getViewport({ scale: scale });
    canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
    var task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
    return task.promise;
  }

  // Điền nội dung ô: "{kh}" → giá trị; ô chỉ có trường trống thì để trống
  function fill(tpl, f) {
    f = f || {};
    var hasKey = false, any = false, miss = false;
    var s = String(tpl || '').replace(/\{(\w+)\}/g, function (_, k) {
      hasKey = true; var v = f[k];
      if (v != null && String(v).trim()) { any = true; return String(v).trim(); }
      miss = true; return '';
    });
    if (hasKey && !any) return '';
    s = s.replace(/\s+/g, ' ').trim();
    if (miss) s = s.replace(/^[\s\-–—·,|:;/]+|[\s\-–—·,|;/]+$/g, '').replace(/([\-–—·,|/])\s*[\-–—·,|/]+/g, '$1').trim();
    return s;
  }
  // Cỡ chữ vừa ô: giữ cỡ đặt sẵn, thu nhỏ khi chữ dài hơn bề rộng ô
  function fit(width, size, boxW) {
    if (!width || width <= boxW) return size;
    return Math.max(size * MIN_SHRINK, size * boxW / width);
  }
  var mctx = null;
  function measure(text, size, weight) {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT;
    return mctx.measureText(text).width;
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([400, 600, 700].map(function (w) { return document.fonts.load(w + ' 16px "Be Vietnam Pro"', 'Đá'); })).catch(function () {});
  }

  /* Lớp chữ chồng lên một trang: layer = phần tử phủ đúng trang (position:relative/absolute, kích thước = trang hiển thị).
     sizePt = {w,h} kích thước trang pt; boxes = các ô thuộc trang này; f = dữ liệu điền. */
  function overlay(layer, sizePt, boxes, f) {
    var W = layer.clientWidth || 1, k = W / sizePt.w;
    layer.innerHTML = '';
    boxes.forEach(function (b) {
      var text = fill(b.text, f);
      if (!text) return;
      var bw = b.w * sizePt.w, sz = fit(measure(text, b.size, b.weight), b.size, bw);
      var d = document.createElement('div');
      d.className = 'rs-pf';
      d.style.cssText = 'position:absolute;display:flex;align-items:center;overflow:visible;white-space:nowrap;line-height:1;pointer-events:none;'
        + 'left:' + (b.x * 100) + '%;top:' + (b.y * 100) + '%;width:' + (b.w * 100) + '%;height:' + (b.h * 100) + '%;'
        + 'justify-content:' + (b.align === 'center' ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start') + ';'
        + 'font-family:' + FONT + ';font-weight:' + b.weight + ';color:' + b.color + ';font-size:' + (sz * k) + 'px';
      d.textContent = text;
      layer.appendChild(d);
    });
  }

  /* Tạo PDF đã điền: in chữ thật (chọn/copy được) lên file gốc bằng pdf-lib + font Be Vietnam Pro */
  var libsP = null;
  function loadScript(u) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = function () { rej(new Error('Không tải được ' + u)); }; document.head.appendChild(s); });
  }
  function pdfLibs() {
    if (!libsP) libsP = Promise.all([window.PDFLib ? 1 : loadScript(BASE + 'vendor/pdf-lib.min.js'), window.fontkit ? 1 : loadScript(BASE + 'vendor/fontkit.umd.min.js')]);
    return libsP;
  }
  var TTF = { 400: 'BeVietnamPro_400Regular.ttf', 600: 'BeVietnamPro_600SemiBold.ttf', 700: 'BeVietnamPro_700Bold.ttf' };
  function hexRgb(h) { var n = parseInt(String(h || '#0f172a').slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  function buildPdf(bytes, layout, f, onProgress) {
    return pdfLibs().then(function () {
      var P = window.PDFLib;
      return P.PDFDocument.load(bytes, { ignoreEncryption: true }).then(function (doc) {
        doc.registerFontkit(window.fontkit);
        var pages = doc.getPages(), cache = {};
        function font(w) {
          if (!cache[w]) cache[w] = fetch(BASE + 'fonts/ttf/' + TTF[w]).then(function (r) { if (!r.ok) throw new Error('Không tải được font.'); return r.arrayBuffer(); })
            .then(function (b) { return doc.embedFont(b, { subset: true }); });
          return cache[w];
        }
        var jobs = [];
        pages.forEach(function (pg, i) {
          (layout || []).forEach(function (b) {
            if (b.page !== 0 && b.page !== i + 1) return;
            var text = fill(b.text, f);
            if (text) jobs.push({ pg: pg, b: b, text: text });
          });
        });
        var k = 0;
        return jobs.reduce(function (pr, j) {
          return pr.then(function () {
            return font(j.b.weight).then(function (fnt) {
              var pg = j.pg, b = j.b, rot = ((pg.getRotation().angle % 360) + 360) % 360;
              var box = pg.getCropBox();
              var vw = rot % 180 ? box.height : box.width, vh = rot % 180 ? box.width : box.height;   // kích thước đúng chiều hiển thị
              var bw = b.w * vw, sz = fit(fnt.widthOfTextAtSize(j.text, b.size), b.size, bw);
              var tw = fnt.widthOfTextAtSize(j.text, sz);
              var x = b.x * vw + (b.align === 'center' ? (bw - tw) / 2 : b.align === 'right' ? bw - tw : 0);
              var yTop = (b.y + b.h / 2) * vh + (ASC - DSC) / 2 * sz;      // đường chân chữ, tính từ mép trên
              var c = hexRgb(b.color), opt = { size: sz, font: fnt, color: P.rgb(c[0], c[1], c[2]) };
              // đổi tọa độ hiển thị → tọa độ trang gốc theo góc xoay
              if (rot === 0) { opt.x = box.x + x; opt.y = box.y + vh - yTop; }
              else if (rot === 90) { opt.x = box.x + yTop; opt.y = box.y + x; opt.rotate = P.degrees(90); }
              else if (rot === 180) { opt.x = box.x + vw - x; opt.y = box.y + yTop; opt.rotate = P.degrees(180); }
              else { opt.x = box.x + vh - yTop; opt.y = box.y + vw - x; opt.rotate = P.degrees(270); }
              pg.drawText(j.text, opt);
              if (onProgress) onProgress(++k, jobs.length);
            });
          });
        }, Promise.resolve()).then(function () { return doc.save(); });
      });
    });
  }

  window.RSPDF = { open: open, renderPage: renderPage, pageSize: pageSize, overlay: overlay, fill: fill, fit: fit, measure: measure,
    fontsReady: fontsReady, buildPdf: buildPdf, BASE: BASE };
})();
