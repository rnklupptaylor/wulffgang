import { clipHalfPlane, polygonArea, supportMax } from './geometry.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export const FAMILIES_2D = [
  { key: 'g10', label: '{10}', color: '#e8890c', gamma: 1.0, handleAngle: 0 },
  { key: 'g21', label: '{21}', color: '#0ca678', gamma: 1.28, handleAngle: Math.atan(0.5) },
  { key: 'g11', label: '{11}', color: '#1971c2', gamma: 1.414, handleAngle: Math.PI / 4 },
];

export function familyAngles2D(key) {
  if (key === 'g10') return [0, 90, 180, 270].map(a => a * DEG);
  if (key === 'g11') return [45, 135, 225, 315].map(a => a * DEG);
  const a = Math.atan(0.5);
  return [a, Math.PI / 2 - a, Math.PI / 2 + a, Math.PI - a,
          Math.PI + a, 3 * Math.PI / 2 - a, 3 * Math.PI / 2 + a, TAU - a];
}

export function buildPlanes2D(gammas) {
  const planes = [];
  for (const f of FAMILIES_2D) {
    for (const th of familyAngles2D(f.key)) {
      planes.push({ nx: Math.cos(th), ny: Math.sin(th), th, h: gammas[f.key], fam: f });
    }
  }
  return planes;
}

export function wulffPolygon2D(gammas) {
  const planes = buildPlanes2D(gammas);
  const B = 3.2 * Math.max(...FAMILIES_2D.map(f => gammas[f.key]));
  let poly = [[-B, -B], [B, -B], [B, B], [-B, B]];
  for (const p of planes) poly = clipHalfPlane(poly, p.nx, p.ny, p.h);

  const clean = [];
  for (const v of poly) {
    const w = clean[clean.length - 1];
    if (!w || Math.hypot(v[0] - w[0], v[1] - w[1]) > 1e-9) clean.push(v);
  }
  if (clean.length > 2) {
    const a = clean[0], b = clean[clean.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) clean.pop();
  }
  poly = clean;

  const facets = [];
  const n = poly.length;
  const owner = new Array(n);
  for (let e = 0; e < n; e++) {
    const j = (e + 1) % n;
    const mx = (poly[e][0] + poly[j][0]) / 2, my = (poly[e][1] + poly[j][1]) / 2;
    let best = -1, bestGap = Infinity;
    for (let k = 0; k < planes.length; k++) {
      const gap = planes[k].h - (planes[k].nx * mx + planes[k].ny * my);
      if (gap < bestGap) { bestGap = gap; best = k; }
    }
    owner[e] = best;
  }
  let e = 0;
  while (e < n) {
    const pl = owner[e];
    let end = e;
    while (end + 1 < n && owner[end + 1] === pl) end++;
    const a = poly[e], b = poly[(end + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    facets.push({ plane: pl, fam: planes[pl].fam, n: [planes[pl].nx, planes[pl].ny],
                  h: planes[pl].h, a, b, len });
    e = end + 1;
  }
  if (facets.length > 1 && facets[0].plane === facets[facets.length - 1].plane) {
    const last = facets.pop();
    facets[0].a = last.a;
    facets[0].len = Math.hypot(facets[0].b[0] - facets[0].a[0], facets[0].b[1] - facets[0].a[1]);
  }

  const verts = poly.slice();
  const famStats = {};
  for (const f of FAMILIES_2D) famStats[f.key] = { count: 0, length: 0 };
  let perim = 0;
  for (const fc of facets) {
    if (fc.len < 1e-7) continue;
    famStats[fc.fam.key].count++;
    famStats[fc.fam.key].length += fc.len;
    perim += fc.len;
  }
  for (const f of FAMILIES_2D) {
    famStats[f.key].present = famStats[f.key].count > 0;
    famStats[f.key].share = perim > 0 ? famStats[f.key].length / perim : 0;
  }

  return { poly, facets, verts, planes, area: polygonArea(poly), famStats };
}

export function support2D(verts, theta) {
  return supportMax(verts, Math.cos(theta), Math.sin(theta));
}

export function missingRanges2D(shape) {
  const cusps = new Set();
  for (const fc of shape.facets) {
    if (fc.len < 1e-7) continue;
    const th = ((Math.atan2(fc.n[1], fc.n[0]) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    cusps.add(Math.round(th / 1e-4) * 1e-4);
  }
  const sorted = [...cusps].sort((a, b) => a - b);
  const ranges = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const b = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI / 2;
    if (b - a > 0.02) ranges.push([a, b]);
  }
  return ranges;
}
