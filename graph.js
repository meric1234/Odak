/* =====================================================================
   Odak Not — graph.js
   - Boş başlangıç durumu (otomatik örnek fonksiyon yok)
   - Çoklu fonksiyon çizimi, türev f'(x), kökler, ekstremum ve integral
   - Dokunmatik / S Pen kaydırma, yakınlaştırma ve koordinat okuma
   - PDF metin seçimi (#selMenu) ve Kement (#gizmoBar) entegrasyonu
   ===================================================================== */
'use strict';
(() => {
  const ON = window.ON || (window.ON = {});
  const $ = id => document.getElementById(id);
  const esc = ON.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  const COLORS = ['#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#FB7185'];

  /* ================= Matematik İfade Derleyici ================= */
  function compileExpr(rawInput) {
    let s = String(rawInput || '').trim();
    if (!s) return null;

    // "y = ..." veya "f(x) = ..." ön ekini temizle
    s = s.replace(/^[a-zA-Z]\s*\(\s*[xt]\s*\)\s*=\s*/i, '');
    s = s.replace(/^[yz]\s*=\s*/i, '');

    // Unicode üstleri ve sembolleri dönüştür
    const supMap = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => '^' + [...m].map(ch => supMap[ch] || '').join(''));
    s = s.replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    s = s.replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([a-zA-Z0-9.]+)/g, 'sqrt($1)');

    // Bağımsız değişken t ise x'e normalize et
    s = s.replace(/\bt\b/g, 'x');

    // Örtük çarpma: 3x -> 3*x, 2sin(x) -> 2*sin(x), )( -> )*(, x( -> x*(
    s = s.replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2');
    s = s.replace(/\)\s*\(/g, ')*(');
    s = s.replace(/\)\s*([a-zA-Z0-9])/g, ')*$1');
    s = s.replace(/\bx\s*\(/g, 'x*(');

    // Üs operatörü
    s = s.replace(/\^/g, '**');

    // Güvenlik kontrolü: yalnızca izin verilen karakter ve matematik fonksiyonları
    const cleanedForCheck = s.replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|abs|ln|log|exp|floor|ceil|round|sign|pi|e|x)\b/gi, '');
    if (/[^0-9+\-*/().,\s*]/.test(cleanedForCheck)) return null;

    const jsExpr = s
      .replace(/\bcot\s*\(/gi, '(1/Math.tan(')
      .replace(/\bsec\s*\(/gi, '(1/Math.cos(')
      .replace(/\bcsc\s*\(/gi, '(1/Math.sin(')
      .replace(/\bln\s*\(/gi, 'Math.log(')
      .replace(/\blog\s*\(/gi, 'Math.log10(')
      .replace(/\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|abs|exp|floor|ceil|round|sign)\s*\(/gi, (_, fn) => `Math.${fn.toLowerCase()}(`)
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');

    try {
      const fn = new Function('x', `"use strict"; try { const v = (${jsExpr}); return Number.isFinite(v) ? v : NaN; } catch { return NaN; }`);
      fn(1); // Sözdizimi doğrulaması
      return fn;
    } catch {
      return null;
    }
  }

  /* ================= Stiller ================= */
  function injectStyles() {
    if ($('on-graph-style')) return;
    const st = document.createElement('style');
    st.id = 'on-graph-style';
    st.textContent = `
      .gp-ibtn {
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.06);
        color: #E2E8F0;
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      .gp-ibtn:hover { background: rgba(96,165,250,.22); border-color: #60A5FA; }
      #onGraphWin {
        position: fixed;
        left: 16px;
        top: 62px;
        width: min(440px, calc(100vw - 24px));
        background: #0F141F;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 16px;
        box-shadow: 0 22px 54px rgba(0,0,0,.65);
        color: #F1F5F9;
        z-index: 9450;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      #onGraphWin[hidden] { display: none !important; }
      .gp-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 12px;
        background: rgba(255,255,255,.04);
        border-bottom: 1px solid rgba(255,255,255,.08);
        cursor: grab;
        user-select: none;
        touch-action: none;
      }
      .gp-head b { font-size: 13px; }
      .gp-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 82dvh; overflow-y: auto; }
      .gp-add-row { display: flex; gap: 6px; }
      .gp-add-row input {
        flex: 1;
        background: #090D16;
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 9px;
        padding: 7px 10px;
        color: #F8FAFC;
        font-size: 13px;
      }
      .gp-list { display: flex; flex-direction: column; gap: 5px; }
      .gp-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 9px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.08);
        font-size: 12.5px;
      }
      .gp-item.active { border-color: rgba(96,165,250,.6); background: rgba(59,130,246,.12); }
      .gp-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; cursor: pointer; }
      .gp-expr { flex: 1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
      .gp-cv-wrap {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.12);
        background: #080B12;
      }
      #onGraphCanvas {
        width: 100%;
        height: 255px;
        display: block;
        touch-action: none;
        cursor: crosshair;
      }
      .gp-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        align-items: center;
      }
      .gp-toolbar .btn { font-size: 11.5px; padding: 5px 8px; }
      .gp-info {
        font-size: 11.5px;
        color: #CBD5E1;
        background: rgba(255,255,255,.04);
        border-radius: 8px;
        padding: 6px 9px;
        line-height: 1.45;
        min-height: 28px;
      }
    `;
    document.head.appendChild(st);
  }

  /* ================= Grafik Motoru ================= */
  const GraphApp = {
    win: null,
    canvas: null,
    funcs: [], // Başlangıçta tamamen boş
    activeId: null,
    showDeriv: false,
    view: { cx: 0, cy: 0, scale: 42 }, // px per unit
    cursorWorld: null,
    cachedSel: '',

    init() {
      injectStyles();
      this._mountTopButton();
      this._buildWindow();
      this._hookExternalMenus();
    },

    _mountTopButton() {
      const topBar = $('top');
      if (!topBar || $('onGraphBtn')) return;
      const btn = document.createElement('button');
      btn.id = 'onGraphBtn';
      btn.type = 'button';
      btn.className = 'ico pro-top-btn';
      btn.title = 'Fonksiyon Grafiği Çizici';
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>`;
      btn.onclick = () => this.toggle();
      topBar.insertBefore(btn, $('onLockBtn') || $('studyBtn'));
    },

    _buildWindow() {
      if ($('onGraphWin')) return;
      const win = document.createElement('section');
      win.id = 'onGraphWin';
      win.dataset.ui = '1';
      win.hidden = true;
      win.innerHTML = `
        <div class="gp-head" id="gpDrag">
          <span>📈</span>
          <b>Fonksiyon Grafiği</b>
          <button type="button" class="gp-ibtn" id="gpClose" style="margin-left:auto">✕</button>
        </div>
        <div class="gp-body">
          <form class="gp-add-row" id="gpForm">
            <input id="gpInput" placeholder="f(x) gir (ör. sin(x), x^2 - 4, e^(-x)*cos(2x))" autocomplete="off" spellcheck="false">
            <button type="submit" class="btn pri">Çiz</button>
          </form>
          <div class="gp-list" id="gpList"></div>
          <div class="gp-cv-wrap">
            <canvas id="onGraphCanvas"></canvas>
          </div>
          <div class="gp-toolbar">
            <button type="button" class="btn" id="gpZoomIn" title="Yakınlaştır">+</button>
            <button type="button" class="btn" id="gpZoomOut" title="Uzaklaştır">−</button>
            <button type="button" class="btn" id="gpReset" title="Merkeze sıfırla">Merkez</button>
            <button type="button" class="btn" id="gpDerivBtn" title="Seçili fonksiyonun türevini göster">f'(x)</button>
            <button type="button" class="btn" id="gpAnalyzeBtn" title="Kök, tepe/çukur ve integral analizi">Analiz</button>
            <button type="button" class="btn" id="gpClearBtn" title="Tüm fonksiyonları temizle">Temizle</button>
            <button type="button" class="btn pri" id="gpPinBtn" style="margin-left:auto">📌 Tuvale Yapıştır</button>
          </div>
          <div class="gp-info" id="gpInfo">Grafik çizmek için yukarıya bir fonksiyon yaz veya PDF/kementten gönder.</div>
        </div>
      `;
      document.body.appendChild(win);
      this.win = win;
      this.canvas = $('onGraphCanvas');

      $('gpClose').onclick = () => {
        win.hidden = true;
        $('onGraphBtn')?.classList.remove('on');
      };

      $('gpForm').addEventListener('submit', e => {
        e.preventDefault();
        const inp = $('gpInput');
        const val = inp.value.trim();
        if (!val) return;
        if (this.addFunction(val)) inp.value = '';
      });

      $('gpZoomIn').onclick = () => { this.view.scale = Math.min(400, this.view.scale * 1.3); this.draw(); };
      $('gpZoomOut').onclick = () => { this.view.scale = Math.max(6, this.view.scale / 1.3); this.draw(); };
      $('gpReset').onclick = () => { this.view = { cx: 0, cy: 0, scale: 42 }; this.draw(); };
      $('gpDerivBtn').onclick = () => {
        this.showDeriv = !this.showDeriv;
        $('gpDerivBtn').classList.toggle('pri', this.showDeriv);
        this.draw();
      };
      $('gpAnalyzeBtn').onclick = () => this.analyzeActive();
      $('gpClearBtn').onclick = () => {
        this.funcs = [];
        this.activeId = null;
        this.showDeriv = false;
        $('gpDerivBtn')?.classList.remove('pri');
        $('gpInput').value = '';
        $('gpInfo').textContent = 'Grafik alanı temizlendi. Yeni fonksiyon girebilirsin.';
        this.renderList();
        this.draw();
      };
      $('gpPinBtn').onclick = () => this.pinToCanvas();

      this._initDrag();
      this._initCanvasInteractions();
    },

    toggle(forceOpen) {
      const open = typeof forceOpen === 'boolean' ? forceOpen : this.win.hidden;
      this.win.hidden = !open;
      $('onGraphBtn')?.classList.toggle('on', open);
      if (open) {
        this._resizeCanvas();
        this.renderList();
        this.draw();
        setTimeout(() => $('gpInput')?.focus(), 40);
      }
    },

    addFunction(raw) {
      const fn = compileExpr(raw);
      if (!fn) {
        ON.app?.toast?.('Geçersiz matematik ifadesi');
        return false;
      }
      const id = 'gf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const color = COLORS[this.funcs.length % COLORS.length];
      this.funcs.push({ id, raw: raw.trim(), fn, color, visible: true });
      this.activeId = id;
      this.renderList();
      this.draw();
      return true;
    },

    renderList() {
      const list = $('gpList');
      if (!list) return;
      if (!this.funcs.length) {
        list.innerHTML = '';
        return;
      }
      list.innerHTML = this.funcs.map((f, i) => `
        <div class="gp-item ${f.id === this.activeId ? 'active' : ''}" data-id="${f.id}">
          <span class="gp-dot" data-act="vis" style="background:${f.visible ? f.color : 'transparent'};border:2px solid ${f.color}" title="Göster/Gizle"></span>
          <span class="gp-expr" data-act="sel">f<sub>${i + 1}</sub>(x) = ${esc(f.raw)}</span>
          <button type="button" class="gp-ibtn" data-act="del" style="padding:2px 6px">✕</button>
        </div>
      `).join('');

      list.onclick = e => {
        const row = e.target.closest('.gp-item');
        if (!row) return;
        const id = row.dataset.id;
        const idx = this.funcs.findIndex(x => x.id === id);
        if (idx === -1) return;
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'del') {
          this.funcs.splice(idx, 1);
          if (this.activeId === id) this.activeId = this.funcs[0]?.id || null;
        } else if (act === 'vis') {
          this.funcs[idx].visible = !this.funcs[idx].visible;
        } else {
          this.activeId = id;
        }
        this.renderList();
        this.draw();
      };
    },

    _resizeCanvas() {
      if (!this.canvas) return;
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(280, Math.round((r.width || 400) * dpr));
      this.canvas.height = Math.max(200, Math.round((r.height || 255) * dpr));
    },

    draw(targetCanvas) {
      const cv = targetCanvas || this.canvas;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      const { cx, cy, scale } = this.view;

      ctx.fillStyle = '#080B12';
      ctx.fillRect(0, 0, W, H);

      const toScreenX = x => W / 2 + (x - cx) * scale;
      const toScreenY = y => H / 2 - (y - cy) * scale;
      const toWorldX = sx => cx + (sx - W / 2) / scale;
      const toWorldY = sy => cy - (sy - H / 2) / scale;

      // Uygun ızgara adımı
      const rawStep = 65 / scale;
      const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const norm = rawStep / mag;
      const step = norm < 1.5 ? mag : norm < 3.5 ? 2 * mag : norm < 7.5 ? 5 * mag : 10 * mag;

      const xMin = toWorldX(0), xMax = toWorldX(W);
      const yMin = toWorldY(H), yMax = toWorldY(0);

      // Izgara çizgileri
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.beginPath();
      for (let gx = Math.floor(xMin / step) * step; gx <= xMax; gx += step) {
        const sx = toScreenX(gx);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, H);
      }
      for (let gy = Math.floor(yMin / step) * step; gy <= yMax; gy += step) {
        const sy = toScreenY(gy);
        ctx.moveTo(0, sy);
        ctx.lineTo(W, sy);
      }
      ctx.stroke();

      // Ana eksenler
      const ox = toScreenX(0), oy = toScreenY(0);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (ox >= 0 && ox <= W) { ctx.moveTo(ox, 0); ctx.lineTo(ox, H); }
      if (oy >= 0 && oy <= H) { ctx.moveTo(0, oy); ctx.lineTo(W, oy); }
      ctx.stroke();

      // Sayı etiketleri
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = `${Math.max(10, Math.round(W / 38))}px Inter, sans-serif`;
      const fmtNum = n => Number(n.toFixed(4)).toString();
      for (let gx = Math.floor(xMin / step) * step; gx <= xMax; gx += step) {
        if (Math.abs(gx) < step * 0.1) continue;
        const sx = toScreenX(gx);
        const ly = Math.min(H - 6, Math.max(14, oy + 14));
        ctx.fillText(fmtNum(gx), sx + 3, ly);
      }
      for (let gy = Math.floor(yMin / step) * step; gy <= yMax; gy += step) {
        if (Math.abs(gy) < step * 0.1) continue;
        const sy = toScreenY(gy);
        const lx = Math.min(W - 34, Math.max(6, ox + 5));
        ctx.fillText(fmtNum(gy), lx, sy - 3);
      }

      // Fonksiyon eğrileri
      for (const f of this.funcs) {
        if (!f.visible) continue;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = f.id === this.activeId ? 2.6 : 1.9;
        ctx.beginPath();
        let penDown = false, prevSy = 0;
        for (let sx = 0; sx <= W; sx += 1.5) {
          const x = toWorldX(sx);
          const y = f.fn(x);
          if (!Number.isFinite(y)) { penDown = false; continue; }
          const sy = toScreenY(y);
          if (sy < -H * 2 || sy > H * 3) { penDown = false; continue; }
          if (!penDown || Math.abs(sy - prevSy) > H * 0.85) {
            ctx.moveTo(sx, sy);
            penDown = true;
          } else {
            ctx.lineTo(sx, sy);
          }
          prevSy = sy;
        }
        ctx.stroke();

        // Türev eğrisi f'(x)
        if (this.showDeriv && f.id === this.activeId) {
          const h = 1e-5;
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          let dDown = false, prevDy = 0;
          for (let sx = 0; sx <= W; sx += 2) {
            const x = toWorldX(sx);
            const dy = (f.fn(x + h) - f.fn(x - h)) / (2 * h);
            if (!Number.isFinite(dy)) { dDown = false; continue; }
            const sy = toScreenY(dy);
            if (sy < -H * 2 || sy > H * 3) { dDown = false; continue; }
            if (!dDown || Math.abs(sy - prevDy) > H * 0.85) {
              ctx.moveTo(sx, sy);
              dDown = true;
            } else {
              ctx.lineTo(sx, sy);
            }
            prevDy = sy;
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // İmleç / dokunma noktası hedefi
      if (!targetCanvas && this.cursorWorld) {
        const { x, y } = this.cursorWorld;
        const sx = toScreenX(x), sy = toScreenY(y);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, 0); ctx.lineTo(sx, H);
        ctx.moveTo(0, sy); ctx.lineTo(W, sy);
        ctx.stroke();
      }
    },

    analyzeActive() {
      const f = this.funcs.find(x => x.id === this.activeId) || this.funcs[0];
      if (!f) {
        $('gpInfo').textContent = 'Analiz için önce bir fonksiyon çizmelisin.';
        return;
      }
      const xMin = this.view.cx - (this.canvas.width / 2) / this.view.scale;
      const xMax = this.view.cx + (this.canvas.width / 2) / this.view.scale;
      const N = 400;
      const dx = (xMax - xMin) / N;
      const roots = [], extrema = [];
      const h = 1e-5;
      const deriv = x => (f.fn(x + h) - f.fn(x - h)) / (2 * h);

      let prevY = f.fn(xMin);
      let prevD = deriv(xMin);
      for (let i = 1; i <= N; i++) {
        const x = xMin + i * dx;
        const y = f.fn(x);
        const d = deriv(x);
        if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y <= 0 && Math.abs(y - prevY) < 50) {
          const rx = x - y * dx / (y - prevY || 1);
          if (!roots.some(r => Math.abs(r - rx) < dx * 2)) roots.push(rx);
        }
        if (Number.isFinite(prevD) && Number.isFinite(d) && prevD * d <= 0 && Math.abs(d - prevD) < 100) {
          const ex = x - d * dx / (d - prevD || 1);
          const ey = f.fn(ex);
          if (Number.isFinite(ey) && !extrema.some(e => Math.abs(e.x - ex) < dx * 2)) {
            extrema.push({ x: ex, y: ey });
          }
        }
        prevY = y;
        prevD = d;
      }

      // Simpson kuralı ile görünür aralıkta sayısal integral
      let area = 0;
      for (let i = 0; i < N; i++) {
        const a = xMin + i * dx, b = a + dx;
        const yA = f.fn(a), yM = f.fn((a + b) / 2), yB = f.fn(b);
        if (Number.isFinite(yA) && Number.isFinite(yM) && Number.isFinite(yB)) {
          area += (dx / 6) * (yA + 4 * yM + yB);
        }
      }

      const y0 = f.fn(0);
      const rootStr = roots.length ? roots.slice(0, 5).map(r => r.toFixed(3)).join(', ') : 'Görünür aralıkta yok';
      const extStr = extrema.length ? extrema.slice(0, 4).map(e => `(${e.x.toFixed(2)}, ${e.y.toFixed(2)})`).join(', ') : 'Yok';
      $('gpInfo').innerHTML = `
        <b>f(x) = ${esc(f.raw)}</b><br>
        • y-kesişimi f(0): <b>${Number.isFinite(y0) ? y0.toFixed(3) : 'Tanımsız'}</b><br>
        • Kökler (f(x)=0): <b>${rootStr}</b><br>
        • Ekstremum (f'(x)=0): <b>${extStr}</b><br>
        • ∫ f(x)dx [${xMin.toFixed(1)}, ${xMax.toFixed(1)}]: <b>${area.toFixed(3)}</b>
      `;
    },

    pinToCanvas() {
      const wt = $('worldTop');
      if (!wt) return;
      const exp = document.createElement('canvas');
      exp.width = 640;
      exp.height = 420;
      this.draw(exp);
      const dataUrl = exp.toDataURL('image/png');

      const anchor = ON.app?.viewAnchor ? ON.app.viewAnchor() : { x: 150, y: 150 };
      const card = document.createElement('div');
      card.className = 'on-witem sel';
      card.style.left = (anchor.x || 150) + 'px';
      card.style.top = (anchor.y || 150) + 'px';
      card.style.width = '320px';
      card.style.height = '210px';
      card.style.background = '#080B12';
      card.style.borderRadius = '12px';
      card.style.overflow = 'hidden';

      const title = this.funcs.length ? this.funcs.map(f => f.raw).join(' ; ') : 'Koordinat Sistemi';
      card.innerHTML = `
        <div class="on-witem-ctrls">
          <button type="button" data-act="del" style="color:#FCA5A5">✕</button>
        </div>
        <img src="${dataUrl}" alt="${esc(title)}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;display:block">
        <div class="on-witem-resize"></div>
      `;
      wt.appendChild(card);

      card.addEventListener('pointerdown', e => {
        e.stopPropagation();
        document.querySelectorAll('.on-witem.sel').forEach(x => x.classList.remove('sel'));
        card.classList.add('sel');
        if (e.target.closest('[data-act="del"]')) { card.remove(); return; }

        const isResize = e.target.classList.contains('on-witem-resize');
        card.setPointerCapture(e.pointerId);
        const r = wt.getBoundingClientRect();
        const sc = wt.offsetWidth > 20 ? r.width / wt.offsetWidth : 1;
        const sx = (e.clientX - r.left) / sc;
        const sy = (e.clientY - r.top) / sc;
        const ox = parseFloat(card.style.left) || 0;
        const oy = parseFloat(card.style.top) || 0;
        const ow = parseFloat(card.style.width) || 320;
        const oh = parseFloat(card.style.height) || 210;

        const mv = ev => {
          const cx = (ev.clientX - r.left) / sc;
          const cy = (ev.clientY - r.top) / sc;
          if (isResize) {
            card.style.width = Math.max(140, ow + (cx - sx)) + 'px';
            card.style.height = Math.max(100, oh + (cy - sy)) + 'px';
          } else {
            card.style.left = (ox + (cx - sx)) + 'px';
            card.style.top = (oy + (cy - sy)) + 'px';
          }
        };
        const up = () => { card.removeEventListener('pointermove', mv); card.removeEventListener('pointerup', up); };
        card.addEventListener('pointermove', mv);
        card.addEventListener('pointerup', up);
      });

      ON.app?.toast?.('Grafik defter sayfasına yapıştırıldı');
    },

    _initDrag() {
      const head = $('gpDrag');
      head.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        head.setPointerCapture(e.pointerId);
        const r = this.win.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, sl = r.left, st = r.top;
        const mv = ev => {
          this.win.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, sl + (ev.clientX - sx))) + 'px';
          this.win.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, st + (ev.clientY - sy))) + 'px';
        };
        const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); };
        head.addEventListener('pointermove', mv);
        head.addEventListener('pointerup', up);
      });
    },

    _initCanvasInteractions() {
      const cv = this.canvas;
      let dragging = false, lx = 0, ly = 0;

      cv.addEventListener('pointerdown', e => {
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        dragging = true;
        lx = e.clientX;
        ly = e.clientY;
      });

      cv.addEventListener('pointermove', e => {
        const r = cv.getBoundingClientRect();
        const dpr = cv.width / (r.width || 1);
        const sx = (e.clientX - r.left) * dpr;
        const sy = (e.clientY - r.top) * dpr;
        const wx = this.view.cx + (sx - cv.width / 2) / this.view.scale;
        const wy = this.view.cy - (sy - cv.height / 2) / this.view.scale;
        this.cursorWorld = { x: wx, y: wy };

        if (dragging) {
          const dx = (e.clientX - lx) * dpr;
          const dy = (e.clientY - ly) * dpr;
          this.view.cx -= dx / this.view.scale;
          this.view.cy += dy / this.view.scale;
          lx = e.clientX;
          ly = e.clientY;
        }

        const activeF = this.funcs.find(f => f.id === this.activeId && f.visible);
        if (activeF) {
          const fy = activeF.fn(wx);
          $('gpInfo').textContent = `x = ${wx.toFixed(3)}  |  f(x) = ${Number.isFinite(fy) ? fy.toFixed(4) : 'Tanımsız'}`;
        } else {
          $('gpInfo').textContent = `Koordinat: (${wx.toFixed(2)}, ${wy.toFixed(2)})`;
        }
        this.draw();
      });

      const stopDrag = () => { dragging = false; };
      cv.addEventListener('pointerup', stopDrag);
      cv.addEventListener('pointercancel', stopDrag);
      cv.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        this.view.scale = Math.max(6, Math.min(400, this.view.scale * factor));
        this.draw();
      }, { passive: false });
    },

    _hookExternalMenus() {
      document.addEventListener('selectionchange', () => {
        const t = window.getSelection()?.toString()?.trim();
        if (t) this.cachedSel = t;
      });

      // PDF Metin Seçimi -> "📈 Grafik Çiz"
      const selMenu = $('selMenu');
      if (selMenu && !$('selGraphBtn')) {
        const btn = document.createElement('button');
        btn.id = 'selGraphBtn';
        btn.type = 'button';
        btn.textContent = '📈 Grafik Çiz';
        btn.addEventListener('pointerdown', e => e.stopPropagation());
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const txt = (window.getSelection()?.toString()?.trim() || this.cachedSel || '').trim();
          selMenu.hidden = true;
          this.toggle(true);
          if (txt) {
            if (!this.addFunction(txt)) $('gpInput').value = txt;
          }
        });
        selMenu.insertBefore(btn, selMenu.firstChild);
      }

      // Kement Seçimi -> "📈 Grafik" (El yazısı denklemi Gemini ile okuyup çizer)
      const gizmoBar = $('gizmoBar');
      if (gizmoBar && !$('gzGraph')) {
        const gBtn = document.createElement('button');
        gBtn.id = 'gzGraph';
        gBtn.type = 'button';
        gBtn.textContent = '📈 Grafik';
        gBtn.addEventListener('click', async e => {
          e.preventDefault();
          e.stopPropagation();
          if (!ON.settings?.key) {
            ON.app?.toast?.('Önce Gemini API anahtarını ekle');
            ON.app?.openSettings?.();
            return;
          }
          const ctx = await ON.app?.contextImage?.();
          if (!ctx || !ctx.b64) {
            ON.app?.toast?.('Kement görüntüsü alınamadı');
            return;
          }
          ON.app?.toast?.('El yazısı denklem okunuyor…');
          try {
            const prompt = 'Bu el yazısı görüntüsündeki fonksiyonu yalnızca tek satır standart matematik ifadesi olarak yaz (ör: x^3 - 3*x veya sin(x) + 2). Açıklama veya $ işareti ekleme.';
            const res = await ON.gemini(ON.settings, [
              { inline_data: { mime_type: ctx.mime || 'image/jpeg', data: ctx.b64 } },
              { text: prompt }
            ]);
            const expr = String(res?.text || '').replace(/`/g, '').trim();
            this.toggle(true);
            if (expr && !this.addFunction(expr)) $('gpInput').value = expr;
          } catch (err) {
            ON.app?.toast?.('Okunamadı: ' + (err.message || err));
          }
        });
        gizmoBar.appendChild(gBtn);
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => GraphApp.init());
})();
