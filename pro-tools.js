/* =====================================================================
   Odak Not — pro-tools.js
   1. Tuval Kilidi (Zoom/Pan Lock - S Pen öncelikli)
   2. Mühendislik Devre & Matematik Damgaları + Akıllı Şekil Düzeltici
   3. Örtü Bandı (Active Recall Tape)
   4. Köşeye Sabit Referans Penceresi (Pin-to-Corner PiP)
   5. El Yazısı -> KaTeX Formül Kartı (#gizmoBar)
   6. Adım Adım Çözüm & SI Birim Analizi (#gizmoBar)
   7. İngilizce Teknik Terim & Flashcard Destesi (#selMenu + #studyDlg)
   ===================================================================== */
'use strict';
(() => {
  const ON = window.ON || (window.ON = {});
  const $ = id => document.getElementById(id);
  const esc = ON.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  /* ================= Yardımcı: Ekran -> Tuval Koordinat Dönüşümü ================= */
  function clientToWorld(clientX, clientY) {
    const wt = $('worldTop') || $('world');
    if (!wt) return { x: 120, y: 120, scale: 1 };
    const r = wt.getBoundingClientRect();
    const tr = getComputedStyle(wt).transform;
    let scale = 1;
    if (tr && tr !== 'none') {
      try {
        const m = new DOMMatrixReadOnly(tr);
        if (m.a && Math.abs(m.a) > 0.01) scale = m.a;
      } catch {}
    } else if (wt.offsetWidth > 20) {
      scale = r.width / wt.offsetWidth;
    }
    return {
      x: (clientX - r.left) / scale,
      y: (clientY - r.top) / scale,
      scale
    };
  }

  function getAnchorWorld() {
    if (ON.app?.viewAnchor) {
      const a = ON.app.viewAnchor();
      if (a && Number.isFinite(a.x) && Number.isFinite(a.y)) return a;
    }
    const stage = $('stage');
    if (stage) {
      const r = stage.getBoundingClientRect();
      return clientToWorld(r.left + r.width * 0.45, r.top + r.height * 0.35);
    }
    return { x: 160, y: 160 };
  }

  function currentPenColor() {
    const sw = document.querySelector('#swatches .on');
    if (sw?.dataset?.color) return sw.dataset.color;
    const pick = $('colorPick');
    return pick?.value || '#60A5FA';
  }

  /* ================= Kement Görüntüsünü Güvenli Yakalama ================= */
  function captureLassoImage() {
    return new Promise(resolve => {
      if (ON.AI?.ctx && !ON.AI.ctx.text && ON.AI.ctx.b64) {
        resolve(ON.AI.ctx);
        return;
      }
      const gzAi = $('gzAi');
      if (!gzAi || !ON.AI) {
        ON.app?.contextImage?.().then(resolve).catch(() => resolve(null));
        return;
      }
      const origRun = ON.AI.runImage.bind(ON.AI);
      const origOpen = ON.AI.open.bind(ON.AI);
      let captured = null;
      ON.AI.open = () => {};
      ON.AI.runImage = async function () {
        captured = this.ctx && !this.ctx.text ? this.ctx : null;
      };
      gzAi.click();
      setTimeout(async () => {
        ON.AI.runImage = origRun;
        ON.AI.open = origOpen;
        const res = captured || (ON.AI.ctx && !ON.AI.ctx.text ? ON.AI.ctx : null) || (await ON.app?.contextImage?.());
        resolve(res && res.b64 ? res : null);
      }, 35);
    });
  }

  /* ================= Görünür Tuvali Tek Karede Yakalama (PiP İçin) ================= */
  function captureViewportSnapshot() {
    const stage = $('stage');
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (w < 20 || h < 20) return null;

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#0F141F';
    ctx.fillRect(0, 0, w, h);

    const canvases = stage.querySelectorAll('canvas');
    canvases.forEach(cv => {
      if (cv.id === 'minimap' || cv.width === 0 || cv.height === 0) return;
      const cr = cv.getBoundingClientRect();
      try {
        ctx.drawImage(cv, cr.left - r.left, cr.top - r.top, cr.width, cr.height);
      } catch {}
    });
    return out.toDataURL('image/png');
  }

  /* ================= Stiller ================= */
  function injectProStyles() {
    if ($('on-pro-style')) return;
    const st = document.createElement('style');
    st.id = 'on-pro-style';
    st.textContent = `
      .pro-top-btn.on {
        color: #60A5FA !important;
        background: rgba(59, 130, 246, 0.2) !important;
        box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.55);
      }
      #onLockBanner {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.9);
        color: #fff;
        font-size: 11.5px;
        font-weight: 600;
        z-index: 900;
        pointer-events: none;
        box-shadow: 0 4px 16px rgba(0,0,0,.35);
      }
      #onLockBanner[hidden] { display: none !important; }

      /* Mühendislik Damga & Akıllı Şekil Penceresi */
      #onStampWin {
        position: fixed;
        right: 16px;
        top: 62px;
        width: min(340px, calc(100vw - 24px));
        background: #101520;
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,.6);
        color: #F1F5F9;
        z-index: 9400;
        overflow: hidden;
      }
      #onStampWin[hidden] { display: none !important; }
      .st-head {
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
      .st-head b { font-size: 13px; }
      .st-body { padding: 10px; display: flex; flex-direction: column; gap: 10px; max-height: 75dvh; overflow-y: auto; }
      .st-sec-lbl { font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: .04em; }
      .st-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      .st-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 7px 4px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1);
        background: rgba(255,255,255,.04);
        color: #E2E8F0;
        font-size: 10.5px;
        cursor: pointer;
      }
      .st-item:hover { background: rgba(59,130,246,.22); border-color: #60A5FA; }
      .st-item svg { width: 34px; height: 24px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .st-pad-wrap {
        border: 1px dashed rgba(96,165,250,.45);
        border-radius: 12px;
        background: #090D16;
        padding: 6px;
      }
      #onShapePad {
        width: 100%;
        height: 135px;
        display: block;
        touch-action: none;
        cursor: crosshair;
        border-radius: 8px;
      }

      /* Tuval Üzeri Etkileşimli Damga & Şekil Öğeleri */
      .on-witem {
        position: absolute;
        touch-action: none;
        user-select: none;
        border: 1.5px solid transparent;
        border-radius: 8px;
        padding: 4px;
        cursor: move;
        z-index: 30;
      }
      .on-witem.sel, .on-witem:hover {
        border-color: rgba(96, 165, 250, 0.75);
        background: rgba(59, 130, 246, 0.06);
      }
      .on-witem svg { width: 100%; height: 100%; display: block; overflow: visible; pointer-events: none; }
      .on-witem-lbl {
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 5px;
        background: rgba(15, 23, 42, 0.85);
        color: #F8FAFC;
        white-space: nowrap;
        cursor: text;
      }
      .on-witem-ctrls {
        position: absolute;
        top: -26px;
        right: 0;
        display: none;
        gap: 3px;
        background: #101520;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 7px;
        padding: 2px 4px;
      }
      .on-witem.sel .on-witem-ctrls { display: flex; }
      .on-witem-ctrls button {
        border: none;
        background: transparent;
        color: #E2E8F0;
        font-size: 11px;
        padding: 2px 5px;
        cursor: pointer;
      }
      .on-witem-resize {
        position: absolute;
        right: -6px;
        bottom: -6px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #3B82F6;
        border: 2px solid #fff;
        display: none;
        cursor: nwse-resize;
      }
      .on-witem.sel .on-witem-resize { display: block; }

      /* Örtü Bandı (Active Recall Tape) */
      .on-tape {
        position: absolute;
        border-radius: 7px;
        background: repeating-linear-gradient(
          -45deg,
          rgba(37, 99, 235, 0.92),
          rgba(37, 99, 235, 0.92) 10px,
          rgba(29, 78, 216, 0.95) 10px,
          rgba(29, 78, 216, 0.95) 20px
        );
        border: 1.5px solid #93C5FD;
        box-shadow: 0 4px 12px rgba(0,0,0,.35);
        cursor: pointer;
        z-index: 45;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        transition: opacity .18s, background .18s;
      }
      .on-tape.revealed {
        background: rgba(59, 130, 246, 0.12);
        border-style: dashed;
        color: transparent;
      }
      .on-tape .tape-del {
        position: absolute;
        top: -9px;
        right: -9px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.3);
        background: #EF4444;
        color: #fff;
        font-size: 11px;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      body.on-tape-mode .on-tape .tape-del { display: flex; }
      #onTapeOverlay {
        position: absolute;
        inset: 0;
        z-index: 850;
        cursor: crosshair;
        touch-action: none;
        background: rgba(37, 99, 235, 0.04);
      }
      #onTapeOverlay[hidden] { display: none !important; }
      #onTapeGhost {
        position: absolute;
        border: 2px dashed #60A5FA;
        background: rgba(59, 130, 246, 0.25);
        border-radius: 6px;
        pointer-events: none;
      }

      /* Köşeye Sabit Referans Penceresi (PiP) */
      #onRefPip {
        position: fixed;
        right: 16px;
        top: 64px;
        width: 270px;
        background: #0F141F;
        border: 1px solid rgba(96, 165, 250, 0.45);
        border-radius: 14px;
        box-shadow: 0 18px 44px rgba(0,0,0,.6);
        z-index: 9300;
        overflow: hidden;
      }
      #onRefPip[hidden] { display: none !important; }
      .pip-head {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: rgba(37, 99, 235, 0.18);
        font-size: 11.5px;
        font-weight: 600;
        color: #E2E8F0;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }
      .pip-body { padding: 6px; display: flex; flex-direction: column; gap: 6px; }
      .pip-body img { width: 100%; max-height: 220px; object-fit: contain; border-radius: 8px; background: #090D16; }
      .pip-ctrls { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94A3B8; }
      .pip-ctrls input { flex: 1; accent-color: #60A5FA; }

      /* Flashcard Modalı */
      #onFcModal {
        position: fixed;
        inset: 0;
        background: rgba(5, 8, 15, 0.78);
        backdrop-filter: blur(6px);
        z-index: 9700;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      #onFcModal[hidden] { display: none !important; }
      .fc-box {
        width: min(500px, 100%);
        background: #101520;
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 18px;
        padding: 16px;
        color: #F1F5F9;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 24px 60px rgba(0,0,0,.65);
      }
      .fc-card {
        min-height: 210px;
        border-radius: 14px;
        border: 1px solid rgba(96, 165, 250, 0.35);
        background: linear-gradient(145deg, rgba(30,41,59,.7), rgba(15,23,42,.95));
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        cursor: pointer;
        gap: 10px;
      }
      .fc-term { font-size: 22px; font-weight: 600; color: #93C5FD; }
      .fc-tr { font-size: 17px; font-weight: 600; color: #34D399; }
      .fc-formula { padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,.06); font-size: 15px; }
      .fc-ctx { font-size: 13px; color: #CBD5E1; line-height: 1.45; }
      .fc-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .fc-row .btn { flex: 1; justify-content: center; }
    `;
    document.head.appendChild(st);
  }

  /* ================= 1. TUVAL KİLİDİ (Zoom / Pan Lock) ================= */
  const CanvasLock = {
    locked: false,
    banner: null,
    init(topBar) {
      const stage = $('stage');
      if (!stage) return;

      const banner = document.createElement('div');
      banner.id = 'onLockBanner';
      banner.hidden = true;
      banner.textContent = '🔒 Tuval Kilitli — Yalnızca S Pen çizimi aktif';
      stage.appendChild(banner);
      this.banner = banner;

      const btn = document.createElement('button');
      btn.id = 'onLockBtn';
      btn.type = 'button';
      btn.className = 'ico pro-top-btn';
      btn.title = 'Tuvali Kilitle (Parmakla kaydırmayı kapat, S Pen aktif kalsın)';
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
      btn.onclick = () => {
        this.locked = !this.locked;
        btn.classList.toggle('on', this.locked);
        banner.hidden = !this.locked;
        ON.app?.toast?.(this.locked ? 'Tuval kilitlendi (Parmak kaydırma kapalı)' : 'Tuval kilidi açıldı');
      };
      topBar.insertBefore(btn, $('studyBtn'));

      const blockTouchNav = e => {
        if (!this.locked) return;
        if (e.target.closest('[data-ui], .on-witem, .on-tape, button, input, textarea')) return;
        if (e.type === 'wheel') {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (e.pointerType === 'touch') {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };

      stage.addEventListener('wheel', blockTouchNav, { capture: true, passive: false });
      stage.addEventListener('pointerdown', blockTouchNav, { capture: true });
      stage.addEventListener('pointermove', blockTouchNav, { capture: true });
      stage.addEventListener('touchmove', e => {
        if (!this.locked) return;
        if (e.target.closest('[data-ui], .on-witem, .on-tape')) return;
        e.preventDefault();
      }, { capture: true, passive: false });
    }
  };

  /* ================= 2. MÜHENDİSLİK DAMGALARI & AKILLI ŞEKİL DÜZELTİCİ ================= */
  const STAMPS = [
    {
      id: 'resistor', name: 'Direnç (R)', label: 'R = 1kΩ', w: 130, h: 52,
      svg: c => `<svg viewBox="0 0 120 40" stroke="${c}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="20" x2="26" y2="20"/><polyline points="26,20 32,8 42,32 52,8 62,32 72,8 82,32 88,20"/><line x1="88" y1="20" x2="118" y2="20"/></svg>`
    },
    {
      id: 'capacitor', name: 'Kondansatör', label: 'C = 10µF', w: 110, h: 64,
      svg: c => `<svg viewBox="0 0 100 56" stroke="${c}" fill="none" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="28" x2="43" y2="28"/><line x1="43" y1="8" x2="43" y2="48"/><line x1="57" y1="8" x2="57" y2="48"/><line x1="57" y1="28" x2="96" y2="28"/></svg>`
    },
    {
      id: 'inductor', name: 'Bobin (L)', label: 'L = 10mH', w: 130, h: 52,
      svg: c => `<svg viewBox="0 0 120 40" stroke="${c}" fill="none" stroke-width="2.4" stroke-linecap="round"><line x1="2" y1="26" x2="22" y2="26"/><path d="M22,26 C22,10 38,10 38,26 C38,10 54,10 54,26 C54,10 70,10 70,26 C70,10 86,10 86,26"/><line x1="86" y1="26" x2="118" y2="26"/></svg>`
    },
    {
      id: 'vsource', name: 'DC Kaynak', label: 'V = 12V', w: 96, h: 96,
      svg: c => `<svg viewBox="0 0 80 80" stroke="${c}" fill="none" stroke-width="2.4" stroke-linecap="round"><line x1="40" y1="2" x2="40" y2="18"/><circle cx="40" cy="40" r="22"/><line x1="40" y1="26" x2="40" y2="36"/><line x1="35" y1="31" x2="45" y2="31"/><line x1="35" y1="50" x2="45" y2="50"/><line x1="40" y1="62" x2="40" y2="78"/></svg>`
    },
    {
      id: 'acsource', name: 'AC Kaynak', label: 'V(t)', w: 96, h: 96,
      svg: c => `<svg viewBox="0 0 80 80" stroke="${c}" fill="none" stroke-width="2.4" stroke-linecap="round"><line x1="40" y1="2" x2="40" y2="18"/><circle cx="40" cy="40" r="22"/><path d="M29,40 Q34.5,29 40,40 T51,40"/><line x1="40" y1="62" x2="40" y2="78"/></svg>`
    },
    {
      id: 'ground', name: 'Toprak (GND)', label: 'GND', w: 76, h: 76,
      svg: c => `<svg viewBox="0 0 60 60" stroke="${c}" fill="none" stroke-width="2.5" stroke-linecap="round"><line x1="30" y1="4" x2="30" y2="30"/><line x1="10" y1="30" x2="50" y2="30"/><line x1="17" y1="40" x2="43" y2="40"/><line x1="24" y1="50" x2="36" y2="50"/></svg>`
    },
    {
      id: 'diode', name: 'Diyot', label: 'D1', w: 116, h: 56,
      svg: c => `<svg viewBox="0 0 100 48" stroke="${c}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="24" x2="34" y2="24"/><polygon points="34,10 34,38 64,24"/><line x1="64" y1="10" x2="64" y2="38"/><line x1="64" y1="24" x2="96" y2="24"/></svg>`
    },
    {
      id: 'opamp', name: 'Op-Amp', label: 'Op-Amp', w: 130, h: 92,
      svg: c => `<svg viewBox="0 0 120 84" stroke="${c}" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="26" x2="28" y2="26"/><line x1="4" y1="58" x2="28" y2="58"/><polygon points="28,10 28,74 92,42"/><line x1="35" y1="26" x2="43" y2="26"/><line x1="35" y1="58" x2="43" y2="58"/><line x1="39" y1="54" x2="39" y2="62"/><line x1="92" y1="42" x2="116" y2="42"/></svg>`
    },
    {
      id: 'axes2d', name: '2B Eksen', label: '', w: 180, h: 180,
      svg: c => `<svg viewBox="0 0 160 160" stroke="${c}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="80" x2="148" y2="80"/><polyline points="141,75 148,80 141,85"/><line x1="80" y1="148" x2="80" y2="12"/><polyline points="75,19 80,12 85,19"/><text x="142" y="96" fill="${c}" stroke="none" font-size="13" font-family="sans-serif">x</text><text x="88" y="20" fill="${c}" stroke="none" font-size="13" font-family="sans-serif">y</text></svg>`
    },
    {
      id: 'unitcircle', name: 'Birim Çember', label: 'r = 1', w: 170, h: 170,
      svg: c => `<svg viewBox="0 0 160 160" stroke="${c}" fill="none" stroke-width="1.9" stroke-linecap="round"><line x1="10" y1="80" x2="150" y2="80" opacity=".6"/><line x1="80" y1="150" x2="80" y2="10" opacity=".6"/><circle cx="80" cy="80" r="52"/><line x1="80" y1="80" x2="117" y2="43" stroke-dasharray="4 3"/></svg>`
    },
    {
      id: 'vector', name: 'Vektör Oku', label: 'F⃗', w: 140, h: 60,
      svg: c => `<svg viewBox="0 0 130 50" stroke="${c}" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="36" x2="118" y2="14"/><polyline points="107,10 118,14 110,22"/></svg>`
    },
    {
      id: 'triangle', name: 'Dik Üçgen', label: 'θ', w: 140, h: 110,
      svg: c => `<svg viewBox="0 0 130 100" stroke="${c}" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="16,84 114,84 16,16"/><polyline points="16,70 30,70 30,84"/></svg>`
    }
  ];

  const ShapeStamps = {
    win: null,
    init(topBar) {
      const btn = document.createElement('button');
      btn.id = 'onStampBtn';
      btn.type = 'button';
      btn.className = 'ico pro-top-btn';
      btn.title = 'Mühendislik Devre Damgaları & Akıllı Şekil Çizici';
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
      btn.onclick = () => this.toggle();
      topBar.insertBefore(btn, $('studyBtn'));

      const win = document.createElement('section');
      win.id = 'onStampWin';
      win.dataset.ui = '1';
      win.hidden = true;
      win.innerHTML = `
        <div class="st-head" id="stDrag">
          <span>📐</span>
          <b>Devre Damgaları &amp; Şekil</b>
          <button type="button" class="gp-ibtn" id="stClose" style="margin-left:auto">✕</button>
        </div>
        <div class="st-body">
          <div class="st-sec-lbl">Tek Dokunuşla Tuvale Yapıştır</div>
          <div class="st-grid" id="stGrid">
            ${STAMPS.map(s => `
              <button type="button" class="st-item" data-stamp="${s.id}">
                ${s.svg('currentColor')}
                <span>${s.name}</span>
              </button>
            `).join('')}
          </div>
          <div class="st-sec-lbl">Akıllı Şekil Tanıyıcı (S Pen ile çiz, otomatik düzelsin)</div>
          <div class="st-pad-wrap">
            <canvas id="onShapePad"></canvas>
          </div>
        </div>
      `;
      document.body.appendChild(win);
      this.win = win;

      $('stClose').onclick = () => { win.hidden = true; btn.classList.remove('on'); };

      // Sürüklenebilir başlık
      const head = $('stDrag');
      head.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        head.setPointerCapture(e.pointerId);
        const r = win.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, sl = r.left, st = r.top;
        const mv = ev => {
          win.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, sl + (ev.clientX - sx))) + 'px';
          win.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, st + (ev.clientY - sy))) + 'px';
          win.style.right = 'auto';
        };
        const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); };
        head.addEventListener('pointermove', mv);
        head.addEventListener('pointerup', up);
      });

      $('stGrid').addEventListener('click', e => {
        const item = e.target.closest('[data-stamp]');
        if (!item) return;
        const stObj = STAMPS.find(x => x.id === item.dataset.stamp);
        if (!stObj) return;
        const color = currentPenColor();
        const pos = getAnchorWorld();
        this.spawnWorldItem({
          x: pos.x,
          y: pos.y,
          w: stObj.w,
          h: stObj.h,
          rot: 0,
          label: stObj.label,
          svgHtml: stObj.svg(color)
        });
        ON.app?.toast?.(`${stObj.name} tuvale eklendi`);
      });

      this._initShapePad();
      document.addEventListener('pointerdown', e => {
        if (!e.target.closest('.on-witem')) {
          document.querySelectorAll('.on-witem.sel').forEach(el => el.classList.remove('sel'));
        }
      });
    },

    toggle() {
      const btn = $('onStampBtn');
      this.win.hidden = !this.win.hidden;
      btn?.classList.toggle('on', !this.win.hidden);
      if (!this.win.hidden) this._resizePad();
    },

    spawnWorldItem(cfg) {
      const wt = $('worldTop');
      if (!wt) return;
      const el = document.createElement('div');
      el.className = 'on-witem sel';
      el.style.left = (cfg.x || 120) + 'px';
      el.style.top = (cfg.y || 120) + 'px';
      el.style.width = (cfg.w || 120) + 'px';
      el.style.height = (cfg.h || 60) + 'px';
      el.dataset.rot = String(cfg.rot || 0);
      el.style.transform = `rotate(${cfg.rot || 0}deg)`;

      el.innerHTML = `
        <div class="on-witem-ctrls">
          <button type="button" data-act="rot" title="45° Döndür">↻</button>
          <button type="button" data-act="lbl" title="Etiket Düzenle">✎</button>
          <button type="button" data-act="del" title="Sil" style="color:#FCA5A5">✕</button>
        </div>
        ${cfg.svgHtml}
        ${cfg.label ? `<div class="on-witem-lbl" contenteditable="true">${esc(cfg.label)}</div>` : ''}
        <div class="on-witem-resize"></div>
      `;

      document.querySelectorAll('.on-witem.sel').forEach(x => x.classList.remove('sel'));
      wt.appendChild(el);

      el.addEventListener('pointerdown', e => {
        e.stopPropagation();
        document.querySelectorAll('.on-witem.sel').forEach(x => x.classList.remove('sel'));
        el.classList.add('sel');

        if (e.target.closest('.on-witem-lbl')) return;

        const actBtn = e.target.closest('[data-act]');
        if (actBtn) {
          const act = actBtn.dataset.act;
          if (act === 'del') el.remove();
          else if (act === 'rot') {
            const nr = ((Number(el.dataset.rot) || 0) + 45) % 360;
            el.dataset.rot = String(nr);
            el.style.transform = `rotate(${nr}deg)`;
          } else if (act === 'lbl') {
            let lbl = el.querySelector('.on-witem-lbl');
            if (!lbl) {
              lbl = document.createElement('div');
              lbl.className = 'on-witem-lbl';
              lbl.contentEditable = 'true';
              lbl.textContent = 'Değer';
              el.appendChild(lbl);
            }
            lbl.focus();
          }
          return;
        }

        const isResize = e.target.classList.contains('on-witem-resize');
        el.setPointerCapture(e.pointerId);
        const startPt = clientToWorld(e.clientX, e.clientY);
        const origX = parseFloat(el.style.left) || 0;
        const origY = parseFloat(el.style.top) || 0;
        const origW = parseFloat(el.style.width) || 100;
        const origH = parseFloat(el.style.height) || 60;

        const mv = ev => {
          const cur = clientToWorld(ev.clientX, ev.clientY);
          const dx = cur.x - startPt.x;
          const dy = cur.y - startPt.y;
          if (isResize) {
            el.style.width = Math.max(36, origW + dx) + 'px';
            el.style.height = Math.max(28, origH + dy) + 'px';
          } else {
            el.style.left = (origX + dx) + 'px';
            el.style.top = (origY + dy) + 'px';
          }
        };
        const up = () => {
          el.removeEventListener('pointermove', mv);
          el.removeEventListener('pointerup', up);
        };
        el.addEventListener('pointermove', mv);
        el.addEventListener('pointerup', up);
      });
    },

    _resizePad() {
      const pad = $('onShapePad');
      if (!pad) return;
      const r = pad.getBoundingClientRect();
      pad.width = Math.max(240, Math.round(r.width || 300));
      pad.height = Math.max(120, Math.round(r.height || 135));
      const ctx = pad.getContext('2d');
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, pad.width, pad.height);
      ctx.fillStyle = 'rgba(148,163,184,.55)';
      ctx.font = '11.5px Inter, sans-serif';
      ctx.fillText('Buraya çizgi, ok, daire, üçgen veya kutu çiz…', 12, 22);
    },

    _initShapePad() {
      const pad = $('onShapePad');
      if (!pad) return;
      let pts = [], drawing = false;

      pad.addEventListener('pointerdown', e => {
        e.preventDefault();
        pad.setPointerCapture(e.pointerId);
        const r = pad.getBoundingClientRect();
        pts = [{ x: e.clientX - r.left, y: e.clientY - r.top }];
        drawing = true;
        const ctx = pad.getContext('2d');
        ctx.fillStyle = '#090D16';
        ctx.fillRect(0, 0, pad.width, pad.height);
        ctx.strokeStyle = currentPenColor();
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
      });

      pad.addEventListener('pointermove', e => {
        if (!drawing) return;
        const r = pad.getBoundingClientRect();
        const p = { x: e.clientX - r.left, y: e.clientY - r.top };
        pts.push(p);
        const ctx = pad.getContext('2d');
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });

      const finish = () => {
        if (!drawing) return;
        drawing = false;
        if (pts.length < 5) { this._resizePad(); return; }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, pathLen = 0;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
          if (i > 0) pathLen += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
        }
        const bw = Math.max(24, maxX - minX);
        const bh = Math.max(24, maxY - minY);
        const start = pts[0], end = pts[pts.length - 1];
        const endDist = Math.hypot(end.x - start.x, end.y - start.y);
        const isClosed = endDist < Math.max(26, pathLen * 0.18);
        const color = currentPenColor();

        let svgHtml = '', shapeName = 'Şekil';
        if (!isClosed && endDist > pathLen * 0.78) {
          // Düz çizgi / Ok
          const x1 = start.x - minX + 10, y1 = start.y - minY + 10;
          const x2 = end.x - minX + 10, y2 = end.y - minY + 10;
          const ang = Math.atan2(y2 - y1, x2 - x1);
          const ax1 = x2 - 12 * Math.cos(ang - 0.42), ay1 = y2 - 12 * Math.sin(ang - 0.42);
          const ax2 = x2 - 12 * Math.cos(ang + 0.42), ay2 = y2 - 12 * Math.sin(ang + 0.42);
          shapeName = 'Vektör / Ok';
          svgHtml = `<svg viewBox="0 0 ${bw + 20} ${bh + 20}" stroke="${color}" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polyline points="${ax1},${ay1} ${x2},${y2} ${ax2},${ay2}"/></svg>`;
        } else if (isClosed) {
          // Daire mi, Üçgen mi, Dikdörtgen mi?
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
          const rx = bw / 2, ry = bh / 2;
          let radialErr = 0;
          for (const p of pts) {
            const normR = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
            radialErr += Math.abs(normR - 1);
          }
          radialErr /= pts.length;

          if (radialErr < 0.17) {
            shapeName = 'Elips / Daire';
            svgHtml = `<svg viewBox="0 0 ${bw + 16} ${bh + 16}" stroke="${color}" fill="none" stroke-width="2.5"><ellipse cx="${bw / 2 + 8}" cy="${bh / 2 + 8}" rx="${rx}" ry="${ry}"/></svg>`;
          } else {
            // Köşe/üçgen kontrolü: üst yarıdaki genişlik ile alt yarıdaki genişliği kıyasla
            let topSpan = 0, botSpan = 0;
            const topPts = pts.filter(p => p.y < minY + bh * 0.35);
            const botPts = pts.filter(p => p.y > minY + bh * 0.65);
            if (topPts.length > 1) topSpan = Math.max(...topPts.map(p => p.x)) - Math.min(...topPts.map(p => p.x));
            if (botPts.length > 1) botSpan = Math.max(...botPts.map(p => p.x)) - Math.min(...botPts.map(p => p.x));

            if (topSpan < bw * 0.42 && botSpan > bw * 0.65) {
              shapeName = 'Üçgen';
              svgHtml = `<svg viewBox="0 0 ${bw + 16} ${bh + 16}" stroke="${color}" fill="none" stroke-width="2.5" stroke-linejoin="round"><polygon points="${bw / 2 + 8},8 8,${bh + 8} ${bw + 8},${bh + 8}"/></svg>`;
            } else {
              shapeName = 'Dikdörtgen';
              svgHtml = `<svg viewBox="0 0 ${bw + 16} ${bh + 16}" stroke="${color}" fill="none" stroke-width="2.5" stroke-linejoin="round"><rect x="8" y="8" width="${bw}" height="${bh}" rx="3"/></svg>`;
            }
          }
        } else {
          // Düz çizgi
          const x1 = start.x - minX + 10, y1 = start.y - minY + 10;
          const x2 = end.x - minX + 10, y2 = end.y - minY + 10;
          shapeName = 'Doğru Parçası';
          svgHtml = `<svg viewBox="0 0 ${bw + 20} ${bh + 20}" stroke="${color}" fill="none" stroke-width="2.6" stroke-linecap="round"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/></svg>`;
        }

        const pos = getAnchorWorld();
        this.spawnWorldItem({
          x: pos.x,
          y: pos.y,
          w: Math.max(70, Math.round(bw * 0.85)),
          h: Math.max(50, Math.round(bh * 0.85)),
          rot: 0,
          label: '',
          svgHtml
        });
        ON.app?.toast?.(`${shapeName} tanındı ve tuvale eklendi`);
        setTimeout(() => this._resizePad(), 180);
      };

      pad.addEventListener('pointerup', finish);
      pad.addEventListener('pointercancel', finish);
    }
  };

  /* ================= 3. ÖRTÜ BANDI (Active Recall Tape) ================= */
  const RecallTape = {
    active: false,
    overlay: null,
    btn: null,
    init(topBar) {
      const stage = $('stage');
      if (!stage) return;

      const btn = document.createElement('button');
      btn.id = 'onTapeBtn';
      btn.type = 'button';
      btn.className = 'ico pro-top-btn';
      btn.title = 'Örtü Bandı (Formül/Çözüm gizle — dokununca açılır)';
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      btn.onclick = () => this.toggleMode();
      topBar.insertBefore(btn, $('studyBtn'));
      this.btn = btn;

      const ov = document.createElement('div');
      ov.id = 'onTapeOverlay';
      ov.hidden = true;
      ov.innerHTML = `<div id="onTapeGhost" hidden></div>`;
      stage.appendChild(ov);
      this.overlay = ov;

      let sx = 0, sy = 0, dragging = false;
      const ghost = $('onTapeGhost');

      ov.addEventListener('pointerdown', e => {
        if (e.target.closest('.on-tape')) return;
        e.preventDefault();
        ov.setPointerCapture(e.pointerId);
        const r = ov.getBoundingClientRect();
        sx = e.clientX - r.left;
        sy = e.clientY - r.top;
        dragging = true;
        ghost.hidden = false;
        ghost.style.left = sx + 'px';
        ghost.style.top = sy + 'px';
        ghost.style.width = '4px';
        ghost.style.height = '4px';
      });

      ov.addEventListener('pointermove', e => {
        if (!dragging) return;
        const r = ov.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        ghost.style.left = Math.min(sx, cx) + 'px';
        ghost.style.top = Math.min(sy, cy) + 'px';
        ghost.style.width = Math.abs(cx - sx) + 'px';
        ghost.style.height = Math.abs(cy - sy) + 'px';
      });

      const endTape = e => {
        if (!dragging) return;
        dragging = false;
        ghost.hidden = true;
        const r = ov.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        const x1 = Math.min(sx, cx) + r.left;
        const y1 = Math.min(sy, cy) + r.top;
        const x2 = Math.max(sx, cx) + r.left;
        const y2 = Math.max(sy, cy) + r.top;
        if (x2 - x1 < 18 || y2 - y1 < 12) return;

        const p1 = clientToWorld(x1, y1);
        const p2 = clientToWorld(x2, y2);
        this.createTape(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      };

      ov.addEventListener('pointerup', endTape);
      ov.addEventListener('pointercancel', endTape);
    },

    toggleMode() {
      this.active = !this.active;
      this.btn?.classList.toggle('on', this.active);
      this.overlay.hidden = !this.active;
      document.body.classList.toggle('on-tape-mode', this.active);
      if (this.active) {
        ON.app?.toast?.('Örtü bandı aktif: Gizlemek istediğin alanın üzerinden geç');
      }
    },

    createTape(x, y, w, h) {
      const wt = $('worldTop');
      if (!wt) return;
      const el = document.createElement('div');
      el.className = 'on-tape';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.innerHTML = `<span>Dokun: Göster</span><button type="button" class="tape-del" title="Bandı kaldır">✕</button>`;

      el.addEventListener('click', e => {
        e.stopPropagation();
        if (e.target.closest('.tape-del')) {
          el.remove();
          return;
        }
        el.classList.toggle('revealed');
      });
      wt.appendChild(el);
    }
  };

  /* ================= 4. KÖŞEYE SABİT REFERANS PENCERESİ (PiP) ================= */
  const RefPin = {
    pip: null,
    init(topBar) {
      const btn = document.createElement('button');
      btn.id = 'onPipBtn';
      btn.type = 'button';
      btn.className = 'ico pro-top-btn';
      btn.title = 'Mevcut görünümü köşeye referans olarak sabitle';
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="12" y="12" width="7" height="7" rx="1" fill="currentColor"/></svg>`;
      btn.onclick = () => {
        const snap = captureViewportSnapshot();
        if (!snap) {
          ON.app?.toast?.('Görüntü alınamadı');
          return;
        }
        this.openWithDataUrl(snap, 'Sayfa Referansı');
      };
      topBar.insertBefore(btn, $('studyBtn'));

      const pip = document.createElement('aside');
      pip.id = 'onRefPip';
      pip.dataset.ui = '1';
      pip.hidden = true;
      pip.innerHTML = `
        <div class="pip-head" id="pipDrag">
          <span>📌</span>
          <span id="pipTitle">Referans</span>
          <button type="button" class="gp-ibtn" id="pipClose" style="margin-left:auto;padding:2px 6px">✕</button>
        </div>
        <div class="pip-body">
          <img id="pipImg" alt="Sabit referans">
          <div class="pip-ctrls">
            <span>Opaklık</span>
            <input type="range" id="pipOp" min="0.35" max="1" step="0.05" value="0.96">
          </div>
        </div>
      `;
      document.body.appendChild(pip);
      this.pip = pip;

      $('pipClose').onclick = () => { pip.hidden = true; };
      $('pipOp').oninput = e => { pip.style.opacity = e.target.value; };

      const head = $('pipDrag');
      head.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        head.setPointerCapture(e.pointerId);
        const r = pip.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, sl = r.left, st = r.top;
        const mv = ev => {
          pip.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, sl + (ev.clientX - sx))) + 'px';
          pip.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, st + (ev.clientY - sy))) + 'px';
          pip.style.right = 'auto';
        };
        const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); };
        head.addEventListener('pointermove', mv);
        head.addEventListener('pointerup', up);
      });
    },

    openWithDataUrl(dataUrl, title = 'Referans') {
      $('pipImg').src = dataUrl;
      $('pipTitle').textContent = title;
      this.pip.hidden = false;
      ON.app?.toast?.('Referans köşeye sabitlendi');
    }
  };

  /* ================= 5. EL YAZISI -> KaTeX & ADIM ADIM ÇÖZÜM + BİRİM KONTROLÜ ================= */
  function setupLassoActions() {
    const gizmoBar = $('gizmoBar');
    if (!gizmoBar) return;

    // 5a. El Yazısını KaTeX Formül Kartına Dönüştür
    if (!$('gzKatex')) {
      const kBtn = document.createElement('button');
      kBtn.id = 'gzKatex';
      kBtn.type = 'button';
      kBtn.title = 'Seçili el yazısı denklemi net KaTeX formül kartına çevir';
      kBtn.textContent = '∑ KaTeX';
      kBtn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        if (!ON.settings?.key) {
          ON.app?.toast?.('Önce Gemini API anahtarını ekle');
          ON.app?.openSettings?.();
          return;
        }
        const ctx = await captureLassoImage();
        if (!ctx) { ON.app?.toast?.('Kement görüntüsü alınamadı'); return; }

        ON.app?.toast?.('El yazısı KaTeX formülüne çevriliyor…');
        try {
          const prompt = [
            'Bu el yazısı görüntüsündeki matematiksel veya mühendislik denklemlerini oku ve temiz LaTeX formatına çevir.',
            'Kurallar:',
            '- Her denklemi $$ ... $$ blok LaTeX formatında yaz.',
            '- Hiçbir açıklama, yorum veya ekstra metin ekleme; sadece LaTeX çıktısı ver.'
          ].join('\n');

          const res = await ON.gemini(ON.settings, [
            { inline_data: { mime_type: ctx.mime || 'image/jpeg', data: ctx.b64 } },
            { text: prompt }
          ]);
          const latex = String(res?.text || '').trim();
          if (!latex) throw new Error('Boş yanıt');
          if (ON.cards && ON.app?.nb) {
            ON.cards.create(latex, ON.app.viewAnchor());
            ON.app?.toast?.('KaTeX formül kartı tuvale eklendi');
          }
        } catch (err) {
          ON.app?.toast?.('Çevrilemedi: ' + (err.message || err));
        }
      });
      gizmoBar.appendChild(kBtn);
    }

    // 5b. Adım Adım Çözüm & SI Birim Analizi
    if (!$('gzSolveUnit')) {
      const sBtn = document.createElement('button');
      sBtn.id = 'gzSolveUnit';
      sBtn.type = 'button';
      sBtn.title = 'Adım adım çöz ve SI birim/boyut kontrolü yap';
      sBtn.textContent = '🧮 Çöz & Birim';
      sBtn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        if (!ON.settings?.key) {
          ON.app?.toast?.('Önce Gemini API anahtarını ekle');
          ON.app?.openSettings?.();
          return;
        }
        const ctx = await captureLassoImage();
        if (!ctx) { ON.app?.toast?.('Kement görüntüsü alınamadı'); return; }

        ON.app?.toast?.('Problem çözülüyor ve birimler kontrol ediliyor…');
        try {
          const prompt = [
            'Sen bir Elektrik-Elektronik Mühendisliği ve Fizik asistanısın. Görüntüdeki el yazısı soruyu veya denklemi Türkçe olarak analiz et.',
            'Yanıtı tam olarak şu Markdown yapısında ver (formüllerde $...$ ve $$...$$ LaTeX kullan):',
            '### Adım Adım Çözüm',
            '- Verilenleri listele ve adımları net şekilde çöz.',
            '### Birim & Boyut Kontrolü',
            '- Kullanılan tüm fiziksel/elektriksel büyüklüklerin SI birimlerini doğrula (ör. $\\text{V} = \\text{A} \\cdot \\Omega$, $\\text{F} = \\text{C}/\\text{V}$) ve varsa birim hatasını uyar.',
            '### Sonuç',
            '- Nihai sonucu birimiyle birlikte vurgula.'
          ].join('\n');

          const res = await ON.gemini(ON.settings, [
            { inline_data: { mime_type: ctx.mime || 'image/jpeg', data: ctx.b64 } },
            { text: prompt }
          ]);
          const md = String(res?.text || '').trim();
          if (!md) throw new Error('Boş yanıt');
          if (ON.cards && ON.app?.nb) {
            ON.cards.create(md, ON.app.viewAnchor());
            ON.app?.toast?.('Çözüm ve birim analizi tuvale sabitlendi');
          }
        } catch (err) {
          ON.app?.toast?.('Çözüm hatası: ' + (err.message || err));
        }
      });
      gizmoBar.appendChild(sBtn);
    }

    // 5c. Kementli Alanı Köşeye Sabitle (PiP)
    if (!$('gzPinPip')) {
      const pBtn = document.createElement('button');
      pBtn.id = 'gzPinPip';
      pBtn.type = 'button';
      pBtn.title = 'Seçili alanı ekranın köşesine sabitle';
      pBtn.textContent = '📌 Köşe';
      pBtn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const ctx = await captureLassoImage();
        if (!ctx) { ON.app?.toast?.('Seçim görüntüsü alınamadı'); return; }
        RefPin.openWithDataUrl(`data:${ctx.mime || 'image/jpeg'};base64,${ctx.b64}`, 'Seçili Şema / Formül');
      });
      gizmoBar.appendChild(pBtn);
    }
  }

  /* ================= 6. İNGİLİZCE TEKNİK TERİM & FLASHCARD DESTESİ ================= */
  const FC_KEY = 'on-flashcards-v1';
  const Flashcards = {
    cards: [],
    idx: 0,
    flipped: false,
    cachedSel: '',

    load() {
      try { this.cards = JSON.parse(localStorage.getItem(FC_KEY) || '[]'); }
      catch { this.cards = []; }
    },
    save() {
      try { localStorage.setItem(FC_KEY, JSON.stringify(this.cards)); } catch {}
    },

    init() {
      this.load();
      document.addEventListener('selectionchange', () => {
        const t = window.getSelection()?.toString()?.trim();
        if (t) this.cachedSel = t;
      });

      // PDF Metin Seçim Menüsüne "🗂️ Terim/Kart" ekle
      const selMenu = $('selMenu');
      if (selMenu && !$('selFcBtn')) {
        const btn = document.createElement('button');
        btn.id = 'selFcBtn';
        btn.type = 'button';
        btn.style.cssText = 'color:#34D399;font-weight:600';
        btn.textContent = '🗂️ Terim/Kart';
        btn.addEventListener('pointerdown', e => e.stopPropagation());
        btn.addEventListener('click', async e => {
          e.preventDefault();
          e.stopPropagation();
          const raw = (window.getSelection()?.toString()?.trim() || this.cachedSel || '').trim();
          selMenu.hidden = true;
          if (!raw) { ON.app?.toast?.('Önce İngilizce bir terim veya cümle seç'); return; }
          await this.extractFromText(raw);
        });
        selMenu.insertBefore(btn, selMenu.firstChild);
      }

      // Çalışma Özeti (#studyDlg) içine Flashcard açma butonu ekle
      const studyCard = document.querySelector('#studyDlg .row.wrap');
      if (studyCard && !$('sgOpenFcBtn')) {
        const fcOpen = document.createElement('button');
        fcOpen.id = 'sgOpenFcBtn';
        fcOpen.type = 'button';
        fcOpen.className = 'btn';
        fcOpen.textContent = `🗂️ Flashcard Destesi (${this.cards.length})`;
        fcOpen.onclick = () => this.openDeck();
        studyCard.appendChild(fcOpen);
      }

      this._buildModal();
    },

    async extractFromText(text) {
      if (!ON.settings?.key) {
        ON.app?.toast?.('Önce Gemini API anahtarını ekle');
        ON.app?.openSettings?.();
        return;
      }
      ON.app?.toast?.('Teknik terim & flashcard hazırlanıyor…');
      try {
        const prompt = [
          'Aşağıdaki İngilizce akademik/mühendislik metninden en önemli 1-3 teknik terimi çıkar ve JSON dizisi döndür.',
          'Her nesne şu alanlara sahip olmalı:',
          '{"en": "İngilizce terim", "tr": "Türkçe mühendislik karşılığı", "formula": "İlgili kısa formül veya sembol (yoksa boş string)", "context": "Akademik kullanım notu ve kısa örnek cümle (Türkçe açıklamalı)"}',
          'SADECE geçerli JSON dizisi döndür, başka metin yazma.',
          `Metin: """${text.slice(0, 1200)}"""`
        ].join('\n');

        const res = await ON.gemini(ON.settings, [{ text: prompt }]);
        const raw = String(res?.text || '').trim();
        const s = raw.indexOf('['), end = raw.lastIndexOf(']');
        if (s === -1 || end <= s) throw new Error('JSON ayrıştırılamadı');
        const items = JSON.parse(raw.slice(s, end + 1));
        if (!Array.isArray(items) || !items.length) throw new Error('Terim bulunamadı');

        for (const it of items) {
          this.cards.unshift({
            en: String(it.en || '').trim(),
            tr: String(it.tr || '').trim(),
            formula: String(it.formula || '').trim(),
            context: String(it.context || '').trim(),
            createdAt: Date.now()
          });
        }
        this.save();
        const badgeBtn = $('sgOpenFcBtn');
        if (badgeBtn) badgeBtn.textContent = `🗂️ Flashcard Destesi (${this.cards.length})`;
        this.idx = 0;
        this.flipped = false;
        this.openDeck();
        ON.app?.toast?.(`${items.length} teknik terim flashcard destesine eklendi`);
      } catch (err) {
        ON.app?.toast?.('Terim çıkarılamadı: ' + (err.message || err));
      }
    },

    _buildModal() {
      if ($('onFcModal')) return;
      const modal = document.createElement('div');
      modal.id = 'onFcModal';
      modal.dataset.ui = '1';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="fc-box">
          <div class="fc-row" style="justify-content:space-between">
            <b>🗂️ Teknik Terim &amp; Flashcard Destesi</b>
            <span id="fcProg" style="font-size:12px;color:#94A3B8">0 / 0</span>
            <button type="button" class="gp-ibtn" id="fcClose">✕</button>
          </div>
          <div class="fc-card" id="fcCard"></div>
          <div class="fc-row">
            <button type="button" class="btn" id="fcPrev">← Önceki</button>
            <button type="button" class="btn pri" id="fcFlip">Kartı Çevir</button>
            <button type="button" class="btn" id="fcNext">Sonraki →</button>
          </div>
          <div class="fc-row">
            <button type="button" class="btn" id="fcPinCard">📌 Tuvale Kart Yapıştır</button>
            <button type="button" class="btn ghost" id="fcDelCard" style="color:#FCA5A5">Bu Kartı Sil</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      $('fcClose').onclick = () => { modal.hidden = true; };
      $('fcCard').onclick = () => { this.flipped = !this.flipped; this.render(); };
      $('fcFlip').onclick = () => { this.flipped = !this.flipped; this.render(); };
      $('fcPrev').onclick = () => {
        if (!this.cards.length) return;
        this.idx = (this.idx - 1 + this.cards.length) % this.cards.length;
        this.flipped = false;
        this.render();
      };
      $('fcNext').onclick = () => {
        if (!this.cards.length) return;
        this.idx = (this.idx + 1) % this.cards.length;
        this.flipped = false;
        this.render();
      };
      $('fcDelCard').onclick = () => {
        if (!this.cards.length) return;
        this.cards.splice(this.idx, 1);
        this.save();
        this.idx = Math.max(0, Math.min(this.idx, this.cards.length - 1));
        this.flipped = false;
        const badgeBtn = $('sgOpenFcBtn');
        if (badgeBtn) badgeBtn.textContent = `🗂️ Flashcard Destesi (${this.cards.length})`;
        this.render();
      };
      $('fcPinCard').onclick = () => {
        const c = this.cards[this.idx];
        if (!c || !ON.cards || !ON.app?.nb) {
          ON.app?.toast?.('Önce bir defter açmalısın');
          return;
        }
        const md = `**${c.en}** — *${c.tr}*${c.formula ? `\n$$${c.formula.replace(/^\$+|\$+$/g, '')}$$` : ''}\n${c.context}`;
        ON.cards.create(md, ON.app.viewAnchor());
        ON.app?.toast?.('Flashcard tuvale sabitlendi');
      };
    },

    openDeck() {
      const modal = $('onFcModal');
      if (!modal) return;
      modal.hidden = false;
      this.render();
    },

    render() {
      const cardEl = $('fcCard');
      const progEl = $('fcProg');
      if (!cardEl) return;
      if (!this.cards.length) {
        progEl.textContent = '0 / 0';
        cardEl.innerHTML = `<div style="color:#94A3B8;font-size:13.5px">Henüz kart yok.<br>İngilizce PDF'de bir terim seçip <b>🗂️ Terim/Kart</b> butonuna bas.</div>`;
        return;
      }
      const c = this.cards[this.idx];
      progEl.textContent = `${this.idx + 1} / ${this.cards.length}`;
      if (!this.flipped) {
        cardEl.innerHTML = `
          <span style="font-size:11px;color:#64748B;text-transform:uppercase">İngilizce Terim (Çevirmek için dokun)</span>
          <div class="fc-term">${esc(c.en)}</div>
        `;
      } else {
        cardEl.innerHTML = `
          <div class="fc-tr">${esc(c.tr)}</div>
          ${c.formula ? `<div class="fc-formula" id="fcFormulaBox">${esc(c.formula)}</div>` : ''}
          <div class="fc-ctx">${esc(c.context)}</div>
        `;
        if (c.formula && window.katex) {
          try {
            window.katex.render(c.formula.replace(/^\$+|\$+$/g, ''), $('fcFormulaBox'), { throwOnError: false });
          } catch {}
        }
      }
    }
  };

  /* ================= Başlatma ================= */
  document.addEventListener('DOMContentLoaded', () => {
    injectProStyles();
    const topBar = $('top');
    if (topBar) {
      CanvasLock.init(topBar);
      ShapeStamps.init(topBar);
      RecallTape.init(topBar);
      RefPin.init(topBar);
    }
    setupLassoActions();
    Flashcards.init();
  });
})();
