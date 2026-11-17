import { Wulff2DApp } from '../js/wulff2d-app.js';
import { FAMILIES_HEX } from '../js/wulff2d-engine.js';

const stub = () => ({ clientWidth: 0, clientHeight: 0, addEventListener: () => {}, style: {} });

const approx = (a, b, tol, msg) => {
  if (Math.abs(a - b) > tol) { console.error(`FAIL ${msg}: ${a} vs ${b}`); process.exit(1); }
  console.log(`ok ${msg}: ${a.toFixed(4)}`);
};

// Hex app: shape must be built with the hexagonal family set
const app = new Wulff2DApp(stub(), stub(), null, FAMILIES_HEX, ['[1-100]', '[0001]']);
for (const k of ['gm', 'gb', 'gp']) {
  if (!app.shape.famStats[k]) { console.error(`FAIL: famStats.${k} missing at construction`); process.exit(1); }
}
app.setGammas({ gm: 1, gb: 1.8, gp: 1.25 });
for (const k of ['gm', 'gb', 'gp']) {
  if (!app.shape.famStats[k]) { console.error(`FAIL: famStats.${k} missing after setGammas`); process.exit(1); }
}
const xs = app.shape.poly.map(v => v[0]), ys = app.shape.poly.map(v => v[1]);
approx((Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs)), 1.8, 1e-9,
  'hex app L/D = gb/gm');

app.setGammas({ gb: 0.6 });
const ys2 = app.shape.poly.map(v => v[1]);
approx(Math.max(...ys2) - Math.min(...ys2), 1.2, 1e-9, 'platelet thickness after setGammas');

// Default cubic app unaffected
const app2 = new Wulff2DApp(stub(), stub(), null);
for (const k of ['g10', 'g21', 'g11']) {
  if (!app2.shape.famStats[k]) { console.error(`FAIL: cubic famStats.${k} missing`); process.exit(1); }
}
console.log('APP2D TESTS PASSED');
