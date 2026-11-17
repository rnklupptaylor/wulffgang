import { FAMILIES_HEX, wulffPolygon2D, missingRanges2D } from '../js/wulff2d-engine.js';

const approx = (a, b, tol, msg) => {
  if (Math.abs(a - b) > tol) { console.error(`FAIL ${msg}: ${a} vs ${b}`); process.exit(1); }
  console.log(`ok ${msg}: ${a.toFixed(4)}`);
};

const extents = shape => {
  const xs = shape.poly.map(v => v[0]), ys = shape.poly.map(v => v[1]);
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
};

// Preset: ZnO-like nanorod {gm:1, gb:1.8, gp:1.25} — all families present
let s = wulffPolygon2D({ gm: 1, gb: 1.80, gp: 1.25 }, FAMILIES_HEX);
console.log('ZnO rod facets:', s.facets.filter(f => f.len > 1e-7).map(f => f.fam.label).join(' '));
if (!s.famStats.gm.present || !s.famStats.gb.present || !s.famStats.gp.present) {
  console.error('FAIL ZnO rod: expected all families present'); process.exit(1);
}
let [D, L] = extents(s);
approx(L / D, 1.80, 1e-9, 'ZnO rod L/D = gb/gm (basal planes present)');

// Needle: pyramidal missing -> rectangle with m-plane sides and basal flat ends, L/D = gb/gm
s = wulffPolygon2D({ gm: 1, gb: 3.20, gp: 3.20 }, FAMILIES_HEX);
if (!s.famStats.gb.present || !s.famStats.gm.present || s.famStats.gp.present) {
  console.error('FAIL needle: expected m-plane sides + basal flat ends only'); process.exit(1);
}
[D, L] = extents(s);
approx(L / D, 3.20, 1e-9, 'needle L/D = 3.2 (rectangle)');
console.log('needle facets:', s.facets.filter(f => f.len > 1e-7).map(f => f.fam.label).join(' '));

// Platelet: basal low -> flat plate, pyramidal bevel present
s = wulffPolygon2D({ gm: 1, gb: 0.60, gp: 1.10 }, FAMILIES_HEX);
if (!s.famStats.gb.present) { console.error('FAIL platelet: basal missing'); process.exit(1); }
[D, L] = extents(s);
approx(L, 1.20, 1e-9, 'platelet thickness = 2*gb');
approx(D, 2.0, 1e-9, 'platelet width = 2*gm');
console.log('platelet facets:', s.facets.filter(f => f.len > 1e-7).map(f => f.fam.label).join(' '));

// Octagonal section: all facets present
s = wulffPolygon2D({ gm: 1, gb: 1.40, gp: 1.15 }, FAMILIES_HEX);
if (!s.famStats.gm.present || !s.famStats.gb.present || !s.famStats.gp.present) {
  console.error('FAIL octagon: expected all families present'); process.exit(1);
}
console.log('octagon facets:', s.facets.filter(f => f.len > 1e-7).map(f => f.fam.label).join(' '));

// Pyramidal critical ratio: with gm=1, gb=1.8, pyramid plane (normal at PYR from x-axis)
// appears when gp/gm <= support of {m,basal} rectangle along PYR = cos(PYR)*1 + sin(PYR)*1.8
const PYR = (90 - 61.6) * Math.PI / 180;
const crit = Math.cos(PYR) * 1 + Math.sin(PYR) * 1.8;
s = wulffPolygon2D({ gm: 1, gb: 1.8, gp: crit + 0.01 }, FAMILIES_HEX);
if (s.famStats.gp.present) { console.error('FAIL: gp should be missing just above critical'); process.exit(1); }
s = wulffPolygon2D({ gm: 1, gb: 1.8, gp: crit - 0.01 }, FAMILIES_HEX);
if (!s.famStats.gp.present) { console.error('FAIL: gp should be present just below critical'); process.exit(1); }
approx(crit, 1.737, 0.01, 'pyramidal critical ratio');

// Basal critical ratio (pyramids absent, gp huge): basal appears when gb/gm > cos(PYR')... 
// simpler check: with gp = 3.2 (missing), basal appears when gb > gm / cos(PYR)? 
// Support of m-plane strip along vertical = 1... basal plane at gb always cuts if gb finite.
// Basal is missing only if gb -> infinity, so check basal present for any finite gb:
s = wulffPolygon2D({ gm: 1, gb: 0.5, gp: 3.2 }, FAMILIES_HEX);
if (!s.famStats.gb.present) { console.error('FAIL: basal should always be present (gp missing)'); process.exit(1); }

// Missing ranges with 2-fold symmetry: cusps at 0 (m), 90 (basal), PYR (pyramid)
s = wulffPolygon2D({ gm: 1, gb: 1.8, gp: 1.25 }, FAMILIES_HEX);
const ranges = missingRanges2D(s, FAMILIES_HEX.sym);
console.log('missing ranges (deg):', ranges.map(r =>
  `${(r[0] * 180 / Math.PI).toFixed(1)}-${(r[1] * 180 / Math.PI).toFixed(1)}`).join(', '));
for (const [a0, a1] of ranges) {
  if (a1 > Math.PI + 1e-9) { console.error('FAIL: range exceeds 2-fold symmetry bound'); process.exit(1); }
  const mid = (a0 + a1) / 2;
  const th = ((mid % Math.PI) + Math.PI) % Math.PI;
  for (const cusp of [0, Math.PI / 2, PYR, Math.PI - PYR]) {
    if (Math.abs(th - cusp) < 0.02) { console.error(`FAIL: range midpoint ${th} overlaps cusp`); process.exit(1); }
  }
}

console.log('HEX TESTS PASSED');
