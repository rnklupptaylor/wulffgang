import { clipHalfPlane, polygonArea, supportMax } from './geometry.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export const FAMILIES_2D = [
  { key: 'g10', label: '{10}', color: '#e8890c', gamma: 1.0, handleAngle: 0,
    angles: [0, 90, 180, 270].map(a => a * DEG) },
  { key: 'g21', label: '{21}', color: '#0ca678', gamma: 1.28, handleAngle: Math.atan(0.5),
    angles: (() => { const a = Math.atan(0.5);
      return [a, Math.PI / 2 - a, Math.PI / 2 + a, Math.PI - a,
              Math.PI + a, 3 * Math.PI / 2 - a, 3 * Math.PI / 2 + a, TAU - a]; })() },
  { key: 'g11', label: '{11}', color: '#1971c2', gamma: 1.414, handleAngle: Math.PI / 4,
    angles: [45, 135, 225, 315].map(a => a * DEG) },
];

/* Wurtzite/hcp crystal, 2D section containing the c-axis (the (11-20) section).
   c-axis vertical: {0001} basal normals vertical, {10-10} prism (m-plane) normals
   horizontal, {10-11} pyramidal normals at 90° - 61.6° from horizontal
   (61.6° = angle between (0001) and (10-11) planes for ZnO, c/a = 1.60).
   The {11-20} a-planes are perpendicular to this section and never appear as facets. */
const PYR = 90 * DEG - 61.6 * DEG;
export const FAMILIES_HEX = [
  { key: 'gm', label: '{10-10}', color: '#e8890c', gamma: 1.0, handleAngle: 0,
    angles: [0, Math.PI], min: 0.80, max: 1.70 },
  { key: 'gb', label: '{0001}', color: '#1971c2', gamma: 1.80, handleAngle: Math.PI / 2,
    angles: [Math.PI / 2, 3 * Math.PI / 2], min: 0.50, max: 3.20 },
  { key: 'gp', label: '{10-11}', color: '#0ca678', gamma: 1.25, handleAngle: PYR,
    angles: [PYR, Math.PI - PYR, Math.PI + PYR, TAU - PYR], min: 0.50, max: 3.20 },
];
FAMILIES_HEX.sym = Math.PI;

export function familyAngles2D(f) {
  return f.angles;
}

export function buildPlanes2D(gammas, fams = FAMILIES_2D) {
  const planes = [];
  for (const f of fams) {
    for (const th of familyAngles2D(f)) {
      planes.push({ nx: Math.cos(th), ny: Math.sin(th), th, h: gammas[f.key], fam: f });
    }
  }
  return planes;
}

export function wulffPolygon2D(gammas, fams = FAMILIES_2D) {
  const planes = buildPlanes2D(gammas, fams);
  const B = 3.2 * Math.max(...fams.map(f => gammas[f.key]));
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
  for (const f of fams) famStats[f.key] = { count: 0, length: 0 };
  let perim = 0;
  for (const fc of facets) {
    if (fc.len < 1e-7) continue;
    famStats[fc.fam.key].count++;
    famStats[fc.fam.key].length += fc.len;
    perim += fc.len;
  }
  for (const f of fams) {
    famStats[f.key].present = famStats[f.key].count > 0;
    famStats[f.key].share = perim > 0 ? famStats[f.key].length / perim : 0;
  }

  return { poly, facets, verts, planes, area: polygonArea(poly), famStats };
}

export function support2D(verts, theta) {
  return supportMax(verts, Math.cos(theta), Math.sin(theta));
}

export function missingRanges2D(shape, sym = Math.PI / 2) {
  const cusps = new Set();
  for (const fc of shape.facets) {
    if (fc.len < 1e-7) continue;
    const th = ((Math.atan2(fc.n[1], fc.n[0]) % sym) + sym) % sym;
    cusps.add(Math.round(th / 1e-4) * 1e-4);
  }
  const sorted = [...cusps].sort((a, b) => a - b);
  const ranges = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const b = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + sym;
    if (b - a > 0.02) ranges.push([a, b]);
  }
  return ranges;
}
