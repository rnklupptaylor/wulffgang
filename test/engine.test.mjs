import { FAMILIES_2D, wulffPolygon2D, support2D, missingRanges2D } from '../js/wulff2d-engine.js';

const g = (g10, g21, g11) => ({ g10, g21, g11 });

let s = wulffPolygon2D(g(1, 1.7, 1.7));
console.log('square:', s.facets.map(f => f.fam.label + ':' + f.len.toFixed(3)).join(' '));
console.assert(s.facets.every(f => f.fam.key === 'g10'), 'FAIL square not pure {10}');

s = wulffPolygon2D(g(1, 1.7, Math.SQRT2));
console.log('bb-2D:', s.facets.map(f => f.fam.label + ':' + f.len.toFixed(3)).join(' '));
console.assert(s.facets.every(f => f.fam.key === 'g10'), 'FAIL bb2D should be pure {10}');

s = wulffPolygon2D(g(1, 1.7, 1.25));
console.log('octagon:', s.facets.map(f => f.fam.label + ':' + f.len.toFixed(3)).join(' '), 'area', s.area.toFixed(4));

s = wulffPolygon2D(g(1, 1.15, 1.30));
console.log('dodecagon:', s.facets.map(f => f.fam.label + ':' + f.len.toFixed(3)).join(' '));
console.log('missing ranges (deg, Q1):', missingRanges2D(s).map(r => r.map(x => (x * 180 / Math.PI).toFixed(1)).join('-')).join(', '));

console.log('support@0:', support2D(s.verts, 0).toFixed(6), 'support@45:', support2D(s.verts, 45 * Math.PI / 180).toFixed(6));

s = wulffPolygon2D(g(1, 1.4, 1.30));
console.log('g21=1.4 facets:', s.facets.map(f => f.fam.label).join(' '));
console.log('support@26.565 =', support2D(s.verts, Math.atan(0.5)).toFixed(4), '(> 1.4 means {21} plane inside -> facet missing)');
