import { FAMILIES_2D, wulffPolygon2D, support2D, missingRanges2D } from './wulff2d-engine.js';

const TAU = Math.PI * 2;

export class Wulff2DApp {
  constructor(gammaCanvas, shapeCanvas, onChange) {
    this.gc = gammaCanvas;
    this.sc = shapeCanvas;
    this.onChange = onChange;
    this.gammas = { g10: 1.0, g21: 1.28, g11: 1.414 };
    this.opts = { construction: true, missing: true, labels: true };
    this.quiz = null;
    this.drag = null;
    this.hover = null;

    const targets = gammaCanvas === shapeCanvas
      ? [[gammaCanvas, 'both']]
      : [[gammaCanvas, 'handle'], [shapeCanvas, 'facet']];
    for (const [cv, allowed] of targets) {
      cv.addEventListener('pointerdown', e => this._down(e, allowed));
      cv.addEventListener('pointermove', e => this._move(e, allowed));
      cv.addEventListener('pointerup', () => this._up());
      cv.addEventListener('pointerleave', () => { if (!this.drag) { this.hover = null; this.draw(); } });
    }
    this.shape = wulffPolygon2D(this.gammas);
  }

  setGammas(g) {
    this.gammas = { ...this.gammas, ...g };
    this.gammas.g10 = 1.0;
    this.shape = wulffPolygon2D(this.gammas);
    this.draw();
    if (this.onChange) this.onChange(this.gammas);
  }

  setOptions(o) { Object.assign(this.opts, o); this.draw(); }

  startQuiz() {
    const r = (a, b) => Math.round((a + Math.random() * (b - a)) * 20) / 20;
    this.quiz = { g21: r(1.0, 1.45), g11: r(1.0, 1.45), revealed: false };
    this.setGammas({ g21: 1.28, g11: 1.414 });
    this.draw();
  }

  clearQuiz() { this.quiz = null; this.draw(); }

  matchScore() {
    if (!this.quiz) return null;
    const t = wulffPolygon2D({ g10: 1, g21: this.quiz.g21, g11: this.quiz.g11 });
    let diff = 0;
    const N = 240;
    for (let i = 0; i < N; i++) {
      const th = i / N * TAU;
      diff += Math.abs(support2D(this.shape.verts, th) - support2D(t.verts, th));
    }
    diff /= N;
    const rel = diff / 1.2;
    return Math.max(0, Math.min(1, 1 - rel / 0.12));
  }

  /* ---------- interaction ---------- */

  _pos(cv, e) {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * (cv.width / r.width) / this._dpr,
            (e.clientY - r.top) * (cv.height / r.height) / this._dpr];
  }

  _down(e, allowed) {
    const cv = e.currentTarget;
    const p = this._pos(cv, e);
    let hit = null, type = null;
    if (allowed === 'handle' || allowed === 'both') hit = this._hitHandle(p);
    if (hit) type = 'handle';
    if (!hit && (allowed === 'facet' || allowed === 'both')) { hit = this._hitFacet(p); type = 'facet'; }
    if (hit) { this.drag = { type, fam: hit }; cv.setPointerCapture(e.pointerId); }
  }

  _move(e, allowed) {
    const cv = e.currentTarget;
    const p = this._pos(cv, e);
    if (!this.drag) {
      let h = null;
      if (allowed === 'handle' || allowed === 'both') h = this._hitHandle(p);
      if (!h && (allowed === 'facet' || allowed === 'both')) h = this._hitFacet(p);
      const changed = (h ? h.key : null) !== (this.hover ? this.hover.key : null);
      this.hover = h;
      cv.style.cursor = h ? 'grab' : 'default';
      if (changed) this.draw();
      return;
    }
    cv.style.cursor = 'grabbing';
    const fam = this.drag.fam;
    if (this.drag.type === 'handle') {
      const u = [Math.cos(fam.handleAngle), Math.sin(fam.handleAngle)];
      this._applyGamma(fam, p[0] * u[0] + p[1] * u[1]);
    } else {
      const fc = this._facetOf(fam);
      if (fc) this._applyGamma(fam, p[0] * fc.n[0] + p[1] * fc.n[1]);
    }
  }

  _up() { this.drag = null; }

  _applyGamma(fam, value) {
    const v = Math.max(0.80, Math.min(1.70, value));
    if (fam.key === 'g10') {
      const s = Math.max(0.80 / 1.70, v);
      this.gammas.g21 = Math.min(1.70, Math.max(0.80, this.gammas.g21 / s));
      this.gammas.g11 = Math.min(1.70, Math.max(0.80, this.gammas.g11 / s));
    } else {
      this.gammas[fam.key] = v;
    }
    this.shape = wulffPolygon2D(this.gammas);
    this.draw();
    this.onChange(this.gammas);
  }

  _hitHandle(p) {
    for (const f of FAMILIES_2D) {
      const hx = this.gammas[f.key] * Math.cos(f.handleAngle);
      const hy = this.gammas[f.key] * Math.sin(f.handleAngle);
      const [sx, sy] = this.g2s(this.gc, hx, hy);
      if (Math.hypot(p[0] - sx, p[1] - sy) < 16) return f;
    }
    return null;
  }

  _facetOf(fam) {
    let best = null;
    for (const fc of this.shape.facets) {
      if (fc.fam.key !== fam.key || fc.len < 1e-7) continue;
      if (!best || fc.len > best.len) best = fc;
    }
    return best;
  }

  _hitFacet(p) {
    const cv = this.sc;
    for (const fc of this.shape.facets) {
      if (fc.len < 1e-7) continue;
      const a = this.g2s(cv, fc.a[0], fc.a[1]);
      const b = this.g2s(cv, fc.b[0], fc.b[1]);
      if (this._distToSeg(p, a, b) < 12) return fc.fam;
    }
    return null;
  }

  _distToSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  /* ---------- drawing ---------- */

  _dpr = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  _setup(cv) {
    const dpr = this._dpr;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  g2s(cv, x, y) {
    const t = cv === this.gc ? this.gT : this.sT;
    return [t.cx + t.s * x, t.cy - t.s * y];
  }
  s2g(cv, sx, sy) {
    const t = cv === this.gc ? this.gT : this.sT;
    return [(sx - t.cx) / t.s, (t.cy - sy) / t.s];
  }

  css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  draw() {
    this._drawGamma();
    this._drawShape();
  }

  _drawGamma() {
    const { ctx, w, h } = this._setup(this.gc);
    const maxR = Math.max(...this.shape.verts.map(v => Math.hypot(v[0], v[1])), 1.1);
    const s = Math.min(w, h) / 2 / (maxR * 1.32);
    this.gT = { cx: w / 2, cy: h / 2, s };
    const cx = w / 2, cy = h / 2;
    const muted = this.css('--muted'), border = this.css('--border'), text = this.css('--text');

    ctx.lineWidth = 1;
    ctx.strokeStyle = border;
    ctx.fillStyle = muted;
    ctx.font = '11px sans-serif';
    for (let r = 1; r <= Math.ceil(maxR + 0.4); r += 0.5) {
      ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, TAU); ctx.stroke();
      if (Number.isInteger(r)) { ctx.fillText(r.toFixed(0), cx + r * s + 3, cy - 3); }
    }
    for (let a = 0; a < 12; a++) {
      const th = a * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * 1.25 * s * Math.cos(th), cy - maxR * 1.25 * s * Math.sin(th));
      ctx.stroke();
    }
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.fillText('[100]', cx + maxR * 1.32 * s, cy + 4);
    ctx.fillText('[010]', cx, cy - maxR * 1.28 * s);
    ctx.textAlign = 'left';

    if (this.opts.missing) {
      const ranges = missingRanges2D(this.shape);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = muted;
      for (const [a0, a1] of ranges) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * 1.16 * s, -a1, -a0);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      const widest = ranges.reduce((m, r) => (r[1] - r[0] > m[1] - m[0] ? r : m), [0, 0]);
      const mid = (widest[0] + widest[1]) / 2;
      ctx.fillStyle = muted;
      ctx.textAlign = 'center';
      ctx.fillText('missing', cx + maxR * 1.16 * s * Math.cos(mid), cy - maxR * 1.16 * s * Math.sin(mid) - 6);
      ctx.textAlign = 'left';
    }

    if (this.opts.construction) {
      ctx.strokeStyle = this.css('--plot-blue');
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      for (let i = 0; i < 180; i++) {
        const th = i / 180 * TAU;
        const r = support2D(this.shape.verts, th);
        const px = r * Math.cos(th), py = r * Math.sin(th);
        const L = 0.55 * r;
        const tx = -Math.sin(th) * L, ty = Math.cos(th) * L;
        ctx.beginPath();
        ctx.moveTo(cx + (px + tx) * s, cy - (py + ty) * s);
        ctx.lineTo(cx + (px - tx) * s, cy - (py - ty) * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    this.shape.poly.forEach((v, i) => {
      const X = cx + v[0] * s, Y = cy - v[1] * s;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.fillStyle = this.css('--plot-blue');
    ctx.globalAlpha = 0.13;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = this.css('--plot-blue');
    ctx.lineWidth = 2.2;
    ctx.stroke();
    for (const fc of this.shape.facets) {
      if (fc.len < 1e-7) continue;
      ctx.strokeStyle = fc.fam.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx + fc.a[0] * s, cy - fc.a[1] * s);
      ctx.lineTo(cx + fc.b[0] * s, cy - fc.b[1] * s);
      ctx.stroke();
    }

    ctx.strokeStyle = this.css('--plot-red');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 720; i++) {
      const th = i / 720 * TAU;
      const r = support2D(this.shape.verts, th);
      const X = cx + r * Math.cos(th) * s, Y = cy - r * Math.sin(th) * s;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();

    for (const f of FAMILIES_2D) {
      const present = this.shape.famStats[f.key].present;
      const hx = this.gammas[f.key] * Math.cos(f.handleAngle);
      const hy = this.gammas[f.key] * Math.sin(f.handleAngle);
      const X = cx + hx * s, Y = cy - hy * s;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X, Y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(X, Y, this.hover && this.hover.key === f.key ? 9 : 7, 0, TAU);
      ctx.fillStyle = present ? f.color : this.css('--card');
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = present ? '#fff' : muted;
      ctx.stroke();

      if (this.opts.labels) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = present ? f.color : muted;
        ctx.textAlign = 'center';
        const lx = X + 26 * Math.cos(f.handleAngle + 0.5);
        const ly = Y - 14 - 12 * Math.sin(f.handleAngle);
        ctx.fillText(`γ${f.label} = ${this.gammas[f.key].toFixed(2)}`, lx, ly);
        if (!present) {
          ctx.font = '11px sans-serif';
          ctx.fillStyle = muted;
          ctx.fillText('facet missing', lx, ly + 13);
        }
        ctx.textAlign = 'left';
      }
    }
  }

  _drawShape() {
    const cv = this.sc;
    const { ctx, w, h } = this._setup(cv);
    let maxR = Math.max(...this.shape.verts.map(v => Math.hypot(v[0], v[1])));
    let target = null;
    if (this.quiz) {
      target = wulffPolygon2D({ g10: 1, g21: this.quiz.g21, g11: this.quiz.g11 });
      maxR = Math.max(maxR, ...target.verts.map(v => Math.hypot(v[0], v[1])));
    }
    const s = Math.min(w, h) / 2 / (maxR * 1.3);
    this.sT = { cx: w / 2, cy: h / 2, s };
    const cx = w / 2, cy = h / 2;
    const muted = this.css('--muted'), text = this.css('--text');

    ctx.strokeStyle = this.css('--border');
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - maxR * 1.25 * s, cy); ctx.lineTo(cx + maxR * 1.25 * s, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - maxR * 1.25 * s); ctx.lineTo(cx, cy + maxR * 1.25 * s); ctx.stroke();
    ctx.fillStyle = muted;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('[100]', cx + maxR * 1.25 * s - 12, cy + 14);
    ctx.fillText('[010]', cx + 22, cy - maxR * 1.25 * s + 12);
    ctx.textAlign = 'left';

    ctx.beginPath();
    this.shape.poly.forEach((v, i) => {
      const X = cx + v[0] * s, Y = cy - v[1] * s;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.fillStyle = this.css('--accent-soft');
    ctx.fill();

    if (this.quiz && target) {
      const t = target;
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = text;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 2;
      ctx.beginPath();
      t.poly.forEach((v, i) => {
        const X = cx + v[0] * s, Y = cy - v[1] * s;
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    for (const fc of this.shape.facets) {
      if (fc.len < 1e-7) continue;
      const hot = this.hover && this.hover.key === fc.fam.key;
      const drag = this.drag && this.drag.type === 'facet' && this.drag.fam.key === fc.fam.key;
      ctx.strokeStyle = fc.fam.color;
      ctx.lineWidth = hot || drag ? 10 : 6;
      ctx.lineCap = 'round';
      if (hot || drag) { ctx.globalAlpha = 0.85; } else { ctx.globalAlpha = 0.9; }
      ctx.beginPath();
      ctx.moveTo(cx + fc.a[0] * s, cy - fc.a[1] * s);
      ctx.lineTo(cx + fc.b[0] * s, cy - fc.b[1] * s);
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (this.opts.labels) {
        const mx = (fc.a[0] + fc.b[0]) / 2, my = (fc.a[1] + fc.b[1]) / 2;
        const off = hot || drag ? 30 : 24;
        const lx = cx + (mx + off / s * fc.n[0]) * s;
        const ly = cy - (my + off / s * fc.n[1]) * s;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = fc.fam.color;
        ctx.textAlign = 'center';
        ctx.fillText(fc.fam.label, lx, ly);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = muted;
        ctx.fillText(`h = ${fc.h.toFixed(2)}`, lx, ly + 12);
        ctx.textAlign = 'left';
      }
    }

    if (this.quiz) {
      const m = this.matchScore();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = m > 0.97 ? '#2b8a3e' : muted;
      ctx.fillText(`match ${(m * 100).toFixed(0)} %`, w - 12, 20);
      ctx.textAlign = 'left';
    }
  }
}
