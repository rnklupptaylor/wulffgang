import { FAMILIES_3D, computeWulff3D, criticalGamma } from './wulff3d-engine.js';

const TAU = Math.PI * 2;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(Math.min(255, r * f))},${Math.round(Math.min(255, g * f))},${Math.round(Math.min(255, b * f))})`;
}

export class Wulff3DApp {
  constructor(canvas, tooltip, onChange) {
    this.cv = canvas;
    this.tooltip = tooltip;
    this.onChange = onChange;
    this.gammas = { g111: 1.0, g100: 1.1547, g110: 1.0207, g210: 1.15, g211: 1.12, g311: 1.10 };
    this.active = new Set(['g111', 'g100', 'g110']);
    this.yaw = -0.62;
    this.pitch = 0.34;
    this.zoom = 1;
    this.autoRotate = true;
    this.showDistances = false;
    this.showEdges = true;
    this.drag = null;
    this.hover = null;
    this.crits = {};
    this.critTimer = null;

    canvas.addEventListener('pointerdown', e => {
      this.drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', e => {
      if (this.drag) {
        this.yaw += (e.clientX - this.drag.x) * 0.008;
        this.pitch += (e.clientY - this.drag.y) * 0.008;
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
        this.drag = { x: e.clientX, y: e.clientY };
        this.render();
      } else {
        this._pick(e);
      }
    });
    canvas.addEventListener('pointerup', () => { this.drag = null; canvas.style.cursor = 'default'; });
    canvas.addEventListener('pointerleave', () => {
      this.hover = null;
      if (this.tooltip) this.tooltip.style.display = 'none';
      if (!this.drag) this.render();
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoom = Math.max(0.5, Math.min(2.6, this.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
      this.render();
    }, { passive: false });

    this.recompute();
    this._loop();
  }

  setGammas(g) {
    Object.assign(this.gammas, g);
    this.gammas.g111 = 1.0;
    this.recompute();
    this.onChange(this.gammas);
  }

  setActive(keys) {
    this.active = new Set(keys);
    this.recompute();
    this.onChange(this.gammas);
  }

  setOptions(o) {
    if ('rotate' in o) this.autoRotate = o.rotate;
    if ('distances' in o) this.showDistances = o.distances;
    if ('edges' in o) this.showEdges = o.edges;
  }

  recompute() {
    this.shape = computeWulff3D(this.active, this.gammas);
    this.crits = {};
    for (const f of FAMILIES_3D) {
      if (this.active.has(f.key) && !this.shape.famStats[f.key].present) {
        const hkl = f.key.slice(1).split('').map(Number);
        this.crits[f.key] = this._supportAlong(this.shape.verts, hkl);
      }
    }
    this._scheduleCrits();
    this.render();
    this.onChange(this.gammas);
  }

  _supportAlong(verts, hkl) {
    const N = familyDir(hkl);
    let m = -Infinity;
    for (const v of verts) m = Math.max(m, N[0] * v[0] + N[1] * v[1] + N[2] * v[2]);
    return m;
  }

  _scheduleCrits() {
    clearTimeout(this.critTimer);
    this.critTimer = setTimeout(() => {
      for (const f of FAMILIES_3D) {
        if (this.active.has(f.key) && this.shape.famStats[f.key].present && !f.fixed) {
          this.crits[f.key] = criticalGamma(f.key, this.active, this.gammas);
        }
      }
      this.onChange(this.gammas);
    }, 350);
  }

  _rot(v) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x1 = cy * v[0] + sy * v[2];
    const z1 = -sy * v[0] + cy * v[2];
    const y1 = cp * v[1] - sp * z1;
    const z2 = sp * v[1] + cp * z1;
    return [x1, y1, z2];
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    if (this.cv.clientWidth === 0) return;
    if (this.autoRotate && !this.drag) {
      this.yaw += 0.0035;
      this.render();
    }
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
      this.cv.width = Math.round(w * dpr);
      this.cv.height = Math.round(h * dpr);
    }
    const ctx = this.cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const maxR = Math.max(...this.shape.verts.map(v => Math.hypot(...v)), 1);
    const s = Math.min(w, h) / 2 / (maxR * 1.25) * this.zoom;
    const cx = w / 2, cy = h / 2;

    const L = norm3([-0.45, 0.55, 0.7]);
    const faces = [];
    for (const fc of this.shape.faces) {
      const nR = this._rot(fc.n);
      if (nR[2] <= 0.001) continue;
      const cR = this._rot(fc.centroid);
      const pts = fc.poly.map(v => {
        const r = this._rot(v);
        return [cx + r[0] * s, cy - r[1] * s, r[2]];
      });
      faces.push({ fc, nR, cR, pts });
    }
    faces.sort((a, b) => a.cR[2] - b.cR[2]);

    this._screenFaces = faces;
    this._view = { cx, cy, s };

    for (const f of faces) {
      const inten = 0.45 + 0.55 * Math.max(0, f.nR[0] * L[0] + f.nR[1] * L[1] + f.nR[2] * L[2]);
      ctx.beginPath();
      f.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = shade(f.fc.fam.color, inten);
      ctx.fill();
      if (this.showEdges) {
        ctx.strokeStyle = shade(f.fc.fam.color, inten * 0.55);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    if (this.hover) {
      const hf = faces.find(f => f.fc.fam.key === this.hover);
      if (hf) {
        ctx.beginPath();
        hf.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.closePath();
        ctx.strokeStyle = this.css('--text') || '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }

    if (this.showDistances) {
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      for (const f of FAMILIES_3D) {
        if (!this.active.has(f.key)) continue;
        const cand = faces.filter(x => x.fc.fam.key === f.key);
        if (!cand.length) continue;
        const best = cand.reduce((m, x) => (x.fc.area > m.fc.area ? x : m));
        const foot = this._rot(scale3(best.fc.n, best.fc.h));
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + foot[0] * s, cy - foot[1] * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + foot[0] * s, cy - foot[1] * s, 3, 0, TAU);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.fillStyle = f.color;
        ctx.fillText(`γ${f.label}=${this.gammas[f.key].toFixed(2)}`, cx + foot[0] * s, cy - foot[1] * s - 6);
      }
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(128,138,150,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, TAU);
    ctx.fill();
  }

  css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  _pick(e) {
    if (!this._screenFaces || !this._screenFaces.length) return;
    const r = this.cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const sorted = [...this._screenFaces].sort((a, b) => b.cR[2] - a.cR[2]);
    let hit = null;
    for (const f of sorted) {
      if (pointInPoly(px, py, f.pts)) { hit = f; break; }
    }
    const key = hit ? hit.fc.fam.key : null;
    if (key !== this.hover) {
      this.hover = key;
      this.render();
    }
    if (this.tooltip) {
      if (hit) {
        const st = this.shape.famStats[hit.fc.fam.key];
        this.tooltip.innerHTML = `<strong>${hit.fc.fam.label}</strong> facet · γ = ${this.gammas[hit.fc.fam.key].toFixed(3)} · ${st.count} facets · ${(st.share * 100).toFixed(1)} % of surface area`;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.clientX + 14) + 'px';
        this.tooltip.style.top = (e.clientY + 14) + 'px';
        this.cv.style.cursor = 'pointer';
      } else {
        this.tooltip.style.display = 'none';
        this.cv.style.cursor = 'default';
      }
    }
  }
}

function norm3(v) {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}
function scale3(v, f) { return [v[0] * f, v[1] * f, v[2] * f]; }
function familyDir(hkl) {
  const l = Math.hypot(hkl[0], hkl[1], hkl[2]);
  return [hkl[0] / l, hkl[1] / l, hkl[2] / l];
}
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
