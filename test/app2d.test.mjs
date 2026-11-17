import { Wulff2DApp } from '../js/wulff2d-app.js';
import { FAMILIES_2D, FAMILIES_2D_EXTRAS, FAMILIES_HEX, FAMILIES_HEX_EXTRAS } from '../js/wulff2d-engine.js';

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

// Extras: inactive by default, activatable via setActive
const app3 = new Wulff2DApp(stub(), stub(), null, FAMILIES_2D, ['[100]', '[010]'], FAMILIES_2D_EXTRAS);
if ('g31' in app3.shape.famStats) { console.error('FAIL: g31 should be inactive by default'); process.exit(1); }
app3.setGammas({ g31: 1.05 });
app3.setActive(['g10', 'g21', 'g11', 'g31']);
if (!app3.shape.famStats.g31 || !app3.shape.famStats.g31.present) {
  console.error('FAIL: {31} facets should be present at gamma 1.05'); process.exit(1);
}
console.log('ok cubic {31} facets present when activated at 1.05');
app3.setActive(['g10', 'g21', 'g11']);
if ('g31' in app3.shape.famStats) { console.error('FAIL: g31 should vanish after deactivation'); process.exit(1); }
console.log('ok cubic {31} deactivated');

// Hex extras: {10-12} activatable
const app4 = new Wulff2DApp(stub(), stub(), null, FAMILIES_HEX, ['[1-100]', '[0001]'], FAMILIES_HEX_EXTRAS);
if ('gp2' in app4.shape.famStats) { console.error('FAIL: gp2 should be inactive by default'); process.exit(1); }
app4.setGammas({ gp2: 1.05 });
app4.setActive(['gm', 'gb', 'gp', 'gp2']);
if (!app4.shape.famStats.gp2 || !app4.shape.famStats.gp2.present) {
  console.error('FAIL: {10-12} facets should be present at gamma 1.05'); process.exit(1);
}
console.log('ok hex {10-12} facets present when activated at 1.05');

console.log('APP2D TESTS PASSED');
