export const FAMILIES_3D = [
  { key: 'g111', label: '{111}', color: '#1971c2', gamma: 1.0,    fixed: true,  enabled: true },
  { key: 'g100', label: '{100}', color: '#e8890c', gamma: 1.1547, fixed: false, enabled: true },
  { key: 'g110', label: '{110}', color: '#0ca678', gamma: 1.0207, fixed: false, enabled: true },
  { key: 'g210', label: '{210}', color: '#9c36b5', gamma: 1.02,  fixed: false, enabled: false },
  { key: 'g211', label: '{211}', color: '#e03131', gamma: 1.00,  fixed: false, enabled: false },
  { key: 'g311', label: '{311}', color: '#0c8599', gamma: 1.00,  fixed: false, enabled: false },
];

export function familyNormals3D(h, k, l) {
  const vals = [h, k, l];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const map = new Map();
  for (const p of perms) {
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      const v = [vals[p[0]] * sx, vals[p[1]] * sy, vals[p[2]] * sz];
      if (!v[0] && !v[1] && !v[2]) continue;
      map.set(v.join(','), v);
    }
  }
  return [...map.values()].map(v => {
    const n = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / n, v[1] / n, v[2] / n];
  });
}

export function buildPlanes3D(active) {
  const planes = [];
  for (const f of FAMILIES_3D) {
    if (!active.has(f.key)) continue;
    const hkl = f.key.slice(1).split('').map(Number);
    for (const n of familyNormals3D(hkl[0], hkl[1], hkl[2])) {
      planes.push({ n, h: f.gamma, fam: f });
    }
  }
  return planes;
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function tripleIntersect(p, q, r) {
  const cqp = cross(q.n, r.n);
  const det = dot3(p.n, cqp);
  if (Math.abs(det) < 1e-10) return null;
  const cq = cross(r.n, p.n), cr = cross(p.n, q.n);
  return [
    (p.h * cqp[0] + q.h * cq[0] + r.h * cr[0]) / det,
    (p.h * cqp[1] + q.h * cq[1] + r.h * cr[1]) / det,
    (p.h * cqp[2] + q.h * cq[2] + r.h * cr[2]) / det,
  ];
}

function enumerateVerts(planes) {
  const m = planes.length;
  const seen = new Set();
  const verts = [];
  const FEAS = 1e-9;
  for (let i = 0; i < m; i++) {
    const p = planes[i];
    for (let j = i + 1; j < m; j++) {
      const q = planes[j];
      for (let k = j + 1; k < m; k++) {
        const v = tripleIntersect(p, q, planes[k]);
        if (!v) continue;
        let ok = true;
        for (let t = 0; t < m; t++) {
          const pl = planes[t];
          if (pl.n[0] * v[0] + pl.n[1] * v[1] + pl.n[2] * v[2] > pl.h + FEAS) { ok = false; break; }
        }
        if (!ok) continue;
        const key = Math.round(v[0] * 1e6) + ',' + Math.round(v[1] * 1e6) + ',' + Math.round(v[2] * 1e6);
        if (!seen.has(key)) { seen.add(key); verts.push(v); }
      }
    }
  }
  return verts;
}

function buildFaces(planes, verts) {
  const faces = [];
  for (let pi = 0; pi < planes.length; pi++) {
    const p = planes[pi];
    const on = [];
    for (const v of verts) {
      if (Math.abs(dot3(p.n, v) - p.h) < 2e-6) on.push(v);
    }
    if (on.length < 3) continue;
    const c = [0, 0, 0];
    for (const v of on) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; }
    c[0] /= on.length; c[1] /= on.length; c[2] /= on.length;
    let ref = Math.abs(p.n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let t1 = cross(p.n, ref);
    const t1l = Math.hypot(...t1); t1 = [t1[0] / t1l, t1[1] / t1l, t1[2] / t1l];
    const t2 = cross(p.n, t1);
    const pts = on.map(v => {
      const d = [v[0] - c[0], v[1] - c[1], v[2] - c[2]];
      return [dot3(d, t1), dot3(d, t2)];
    }).sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    const poly = pts.map((pt, i) => [
      c[0] + pt[0] * t1[0] + pt[1] * t2[0],
      c[1] + pt[0] * t1[1] + pt[1] * t2[1],
      c[2] + pt[0] * t1[2] + pt[1] * t2[2],
    ]);
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    area = Math.abs(area) / 2;
    if (area < 1e-8) continue;
    faces.push({ plane: pi, fam: p.fam, n: p.n, h: p.h, poly, centroid: c, area });
  }
  return faces;
}

export function computeWulff3D(activeKeys, gammas) {
  const planes = [];
  for (const f of FAMILIES_3D) {
    if (!activeKeys.has(f.key)) continue;
    const hkl = f.key.slice(1).split('').map(Number);
    const g = gammas[f.key];
    for (const n of familyNormals3D(hkl[0], hkl[1], hkl[2])) {
      planes.push({ n, h: g, fam: f });
    }
  }
  const verts = enumerateVerts(planes);
  const faces = buildFaces(planes, verts);
  const famStats = {};
  for (const f of FAMILIES_3D) famStats[f.key] = { count: 0, area: 0, present: false };
  let total = 0;
  for (const fc of faces) {
    famStats[fc.fam.key].count++;
    famStats[fc.fam.key].area += fc.area;
    total += fc.area;
  }
  for (const f of FAMILIES_3D) {
    famStats[f.key].present = famStats[f.key].count > 0;
    famStats[f.key].share = total > 0 ? famStats[f.key].area / total : 0;
  }
  return { verts, faces, famStats, totalArea: total, planes };
}

export function criticalGamma(famKey, activeKeys, gammas) {
  const others = planesWithout(famKey, activeKeys, gammas);
  if (others.length < 3) return Infinity;
  const verts = enumerateVerts(others);
  if (!verts.length) return 0;
  const hkl = famKey.slice(1).split('').map(Number);
  const nrm = familyNormals3D(hkl[0], hkl[1], hkl[2])[0];
  let m = -Infinity;
  for (const v of verts) m = Math.max(m, dot3(nrm, v));
  return m;
}

function planesWithout(famKey, activeKeys, gammas) {
  const planes = [];
  for (const f of FAMILIES_3D) {
    if (!activeKeys.has(f.key) || f.key === famKey) continue;
    const hkl = f.key.slice(1).split('').map(Number);
    const g = gammas[f.key];
    for (const n of familyNormals3D(hkl[0], hkl[1], hkl[2])) {
      planes.push({ n, h: g, fam: f });
    }
  }
  return planes;
}
