import { FAMILIES_3D, computeWulff3D, criticalGamma } from '../js/wulff3d-engine.js';

const keys3 = new Set(['g111', 'g100', 'g110']);
const gam = o => ({ g111: 1, g100: 1.1547, g110: 1.0207, g210: 1.02, g211: 1.0, g311: 1.0, ...o });

// Broken-bond fcc: expect {111}+{100} present, {110} marginal/missing
let r = computeWulff3D(keys3, gam({}));
console.log('broken-bond fcc:');
for (const f of FAMILIES_3D) {
  const st = r.famStats[f.key];
  console.log(' ', f.label, 'present:', st.present, 'facets:', st.count, 'area share:', st.share.toFixed(4));
}
console.log('verts:', r.verts.length, 'faces:', r.faces.length, 'totalArea:', r.totalArea.toFixed(4));
console.log('critical g110 (without 110):', criticalGamma('g110', keys3, gam({})).toFixed(6));
console.log('critical g100 (without 100):', criticalGamma('g100', keys3, gam({})).toFixed(6));

// Truncated octahedron check: cube {100} at 1.1547 alone would give support... check volume ratio
// Cube preset: g111, g110 high
r = computeWulff3D(keys3, gam({ g111: 1.8, g110: 1.8 }));
console.log('cube:', [...keys3].map(k => FAMILIES_3D.find(f => f.key === k).label + ':' + r.famStats[k].present).join(' '));

// Octahedron preset
r = computeWulff3D(keys3, gam({ g100: 1.8, g110: 1.8 }));
console.log('octahedron:', [...keys3].map(k => FAMILIES_3D.find(f => f.key === k).label + ':' + r.famStats[k].present).join(' '));

// All six families, timing
const keys6 = new Set(FAMILIES_3D.map(f => f.key));
let t0 = performance.now();
r = computeWulff3D(keys6, gam({ g210: 1.02, g211: 1.0, g311: 1.0 }));
console.log('all-6 timing:', (performance.now() - t0).toFixed(0), 'ms, verts:', r.verts.length, 'faces:', r.faces.length);
for (const f of FAMILIES_3D) console.log(' ', f.label, r.famStats[f.key].present, r.famStats[f.key].share.toFixed(4));

// Real metal: Au
r = computeWulff3D(keys3, gam({ g100: 1.19, g110: 1.25 }));
console.log('Au facets:', FAMILIES_3D.filter(f => r.famStats[f.key].present).map(f => f.label).join(' '));
