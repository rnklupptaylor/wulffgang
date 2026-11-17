import { FAMILIES_3D, computeWulff3D, criticalGamma } from '../js/wulff3d-engine.js';

const ALL = ['g111','g100','g110'];
const gam = o => ({ g111: 1, g100: 1.1547, g110: 1.0207, g210: 1.15, g211: 1.12, g311: 1.10, ...o });
const show = r => FAMILIES_3D.filter(f => r.famStats[f.key].present)
  .map(f => `${f.label}(${r.famStats[f.key].count})`).join(' ');

let r = computeWulff3D(new Set(ALL), gam({ g100: 0.55, g110: 0.90 }));
console.log('Cube preset        :', show(r));
r = computeWulff3D(new Set(ALL), gam({ g100: 1.80, g110: 1.80 }));
console.log('Octahedron preset  :', show(r));
r = computeWulff3D(new Set(ALL), gam({}));
console.log('Broken-bond preset :', show(r));
r = computeWulff3D(new Set(ALL), gam({ g100: 1.19, g110: 1.25 }));
console.log('Au preset          :', show(r));
r = computeWulff3D(new Set(ALL), gam({ g100: 1.13, g110: 1.22 }));
console.log('Pt preset          :', show(r));

// criticals for present families (exclusion pass) + timing for all-6 with higher families on
const keys6 = new Set(FAMILIES_3D.map(f => f.key));
r = computeWulff3D(keys6, gam({}));
console.log('All-6              :', show(r));
let t0 = performance.now();
for (const f of FAMILIES_3D) criticalGamma(f.key, keys6, gam({}));
console.log('6 critical passes  :', (performance.now() - t0).toFixed(0), 'ms');
console.log('crit g100 (bb)     :', criticalGamma('g100', new Set(ALL), gam({})).toFixed(4), '(expect ~1.4435... with 110 present)');
console.log('crit g111 (cube)   :', criticalGamma('g111', new Set(ALL), gam({ g100: 0.55, g110: 0.90 })).toFixed(4), '(expect sqrt(3)*0.55=0.9526)');
