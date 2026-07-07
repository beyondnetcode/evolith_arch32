#!/usr/bin/env node
// Builds a self-contained interactive pan/zoom viewer for master-view.svg.
// Usage: node build-viewer.mjs <svg-in> <html-out>
import fs from 'fs';

const svgIn = process.argv[2] || 'reference/core/sdlc/assets/master-view.svg';
const htmlOut = process.argv[3] || 'master-view.html';
const svg = fs.readFileSync(svgIn, 'utf8').trim();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Evolith — E2E Product Vision (interactive)</title>
<meta name="description" content="Interactive pan & zoom view of the Evolith E2E Product Vision architecture diagram.">
<style>
  :root { color-scheme: dark light; }
  * { box-sizing: border-box; }
  html, body { margin:0; height:100%; overflow:hidden; background:#0e141b;
    font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  #stage { position:fixed; inset:0; cursor:grab; touch-action:none; overflow:hidden;
    background:
      radial-gradient(1200px 600px at 50% -10%, #17222e 0%, #0e141b 60%),
      #0e141b; }
  #stage.grabbing { cursor:grabbing; }
  #pz { position:absolute; top:0; left:0; transform-origin:0 0; will-change:transform; }
  #pz svg { display:block; border-radius:10px; box-shadow:0 10px 40px rgba(0,0,0,.45); background:#fff; }
  .bar { position:fixed; top:14px; left:50%; transform:translateX(-50%); z-index:10;
    display:flex; gap:4px; align-items:center; padding:6px;
    background:rgba(18,26,35,.9); border:1px solid rgba(255,255,255,.12); border-radius:12px;
    box-shadow:0 6px 24px rgba(0,0,0,.45); backdrop-filter:blur(8px); }
  .bar button { width:38px; height:38px; border:none; border-radius:9px; cursor:pointer;
    background:rgba(255,255,255,.07); color:#e8eef5; font-size:17px; line-height:1;
    display:flex; align-items:center; justify-content:center; transition:background .12s; }
  .bar button:hover { background:rgba(255,255,255,.18); }
  .bar button:active { background:rgba(255,255,255,.28); }
  .bar .z { min-width:60px; text-align:center; color:#c7d3df; font-size:13px; font-variant-numeric:tabular-nums; }
  .bar .sep { width:1px; height:24px; background:rgba(255,255,255,.14); margin:0 3px; }
  .bar button.dl { width:auto; padding:0 11px; font-size:12px; font-weight:700; letter-spacing:.4px; }
  .bar button.dl:disabled { opacity:.5; cursor:default; }
  .caption { position:fixed; bottom:12px; left:14px; z-index:10; color:#9fb0c0; font-size:12px; }
  .caption b { color:#cfe0ee; font-weight:600; }
  .hint { position:fixed; bottom:12px; right:14px; z-index:10; color:#66788a; font-size:11px; }
  @media (prefers-color-scheme: light) {
    html, body { background:#eef2f7; }
    #stage { background: radial-gradient(1200px 600px at 50% -10%, #ffffff 0%, #e9eef4 60%), #e9eef4; }
    .caption { color:#4a5b6b; } .caption b { color:#1c2b3a; } .hint { color:#8496a6; }
  }
</style>
</head>
<body>
<div id="stage"><div id="pz">${svg}</div></div>

<div class="bar" role="toolbar" aria-label="Diagram controls">
  <button data-a="out" title="Zoom out (−)" aria-label="Zoom out">−</button>
  <div class="z" id="z">100%</div>
  <button data-a="in" title="Zoom in (+)" aria-label="Zoom in">+</button>
  <span class="sep"></span>
  <button data-a="fit" title="Fit to screen (0)" aria-label="Fit to screen">⤢</button>
  <button data-a="full" title="Fullscreen (F)" aria-label="Fullscreen">⛶</button>
  <span class="sep"></span>
  <button data-a="png" class="dl" title="Download PNG (2×)" aria-label="Download PNG">PNG</button>
  <button data-a="jpg" class="dl" title="Download JPG (2×)" aria-label="Download JPG">JPG</button>
</div>
<div class="caption">Evolith · E2E Product Vision — <b>drag</b> to pan · <b>scroll</b> to zoom</div>
<div class="hint">+ / −  zoom · 0 fit · F fullscreen · PNG / JPG to save</div>

<script>
(function () {
  var stage = document.getElementById('stage');
  var pz = document.getElementById('pz');
  var svg = pz.querySelector('svg');
  var zl = document.getElementById('z');
  var vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { width: 1600, height: 1240 };
  var W = vb.width || 1600, H = vb.height || 1240;
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.style.width = W + 'px'; svg.style.height = H + 'px';

  var scale = 1, tx = 0, ty = 0, MIN = 0.08, MAX = 16;
  function apply() { pz.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; zl.textContent = Math.round(scale * 100) + '%'; }
  function rect() { return stage.getBoundingClientRect(); }
  function fit() { var r = rect(); var s = Math.min(r.width / W, r.height / H) * 0.94; scale = s; tx = (r.width - W * s) / 2; ty = (r.height - H * s) / 2; apply(); }
  function zoomAt(cx, cy, f) { var ns = Math.max(MIN, Math.min(MAX, scale * f)); var k = ns / scale; tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; scale = ns; apply(); }

  stage.addEventListener('wheel', function (e) { e.preventDefault(); var r = rect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });

  var pts = new Map(), drag = false, pinch = 0;
  stage.addEventListener('pointerdown', function (e) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { stage.setPointerCapture(e.pointerId); } catch (x) {} if (pts.size === 1) { drag = true; stage.classList.add('grabbing'); } });
  stage.addEventListener('pointermove', function (e) {
    if (!pts.has(e.pointerId)) return;
    var prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var r = rect();
    if (pts.size === 2) {
      var v = Array.from(pts.values()), d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
      var mx = (v[0].x + v[1].x) / 2 - r.left, my = (v[0].y + v[1].y) / 2 - r.top;
      if (pinch) zoomAt(mx, my, d / pinch);
      pinch = d;
    } else if (drag) { tx += e.clientX - prev.x; ty += e.clientY - prev.y; apply(); }
  });
  function end(e) { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (pts.size === 0) { drag = false; stage.classList.remove('grabbing'); } }
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('dblclick', function (e) { var r = rect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1.6); });

  function full() { if (!document.fullscreenElement) { (document.documentElement.requestFullscreen || function () {}).call(document.documentElement); } else { document.exitFullscreen(); } }

  function exportRaster(mime, ext, scale) {
    scale = scale || 2;
    var btns = document.querySelectorAll('.bar button.dl');
    function reset() { btns.forEach(function (b) { b.disabled = false; }); }
    btns.forEach(function (b) { b.disabled = true; });
    var clone = svg.cloneNode(true);
    clone.style.width = ''; clone.style.height = '';
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    clone.setAttribute('width', W * scale);
    clone.setAttribute('height', H * scale);
    var data = new XMLSerializer().serializeToString(clone);
    var url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (blob) {
        if (!blob) { alert('Export failed.'); reset(); return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'evolith-e2e-product-vision.' + ext;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        reset();
      }, mime, mime === 'image/jpeg' ? 0.95 : undefined);
    };
    img.onerror = function () { URL.revokeObjectURL(url); alert('Could not render the image for export.'); reset(); };
    img.src = url;
  }

  document.querySelector('.bar').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var a = b.dataset.a, r = rect();
    if (a === 'in') zoomAt(r.width / 2, r.height / 2, 1.25);
    else if (a === 'out') zoomAt(r.width / 2, r.height / 2, 1 / 1.25);
    else if (a === 'fit') fit();
    else if (a === 'full') full();
    else if (a === 'png') exportRaster('image/png', 'png');
    else if (a === 'jpg') exportRaster('image/jpeg', 'jpg');
  });
  window.addEventListener('keydown', function (e) {
    var r = rect();
    if (e.key === '+' || e.key === '=') zoomAt(r.width / 2, r.height / 2, 1.25);
    else if (e.key === '-' || e.key === '_') zoomAt(r.width / 2, r.height / 2, 1 / 1.25);
    else if (e.key === '0') fit();
    else if (e.key === 'f' || e.key === 'F') full();
  });

  fit();
})();
</script>
</body>
</html>
`;

fs.writeFileSync(htmlOut, html);
console.log('wrote', htmlOut, html.length, 'bytes (svg', svg.length, 'bytes)');
