export function clipHalfPlane(poly, nx, ny, h) {
  const out = [];
  const n = poly.length;
  const eps = 1e-12;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const da = nx * a[0] + ny * a[1] - h;
    const db = nx * b[0] + ny * b[1] - h;
    if (da <= eps) out.push(a);
    if ((da < -eps && db > eps) || (da > eps && db < -eps)) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

export function polygonArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

export function polygonCentroid(poly) {
  let x = 0, y = 0;
  for (const p of poly) { x += p[0]; y += p[1]; }
  return [x / poly.length, y / poly.length];
}

export function dedupeVerts(verts, tol = 1e-9) {
  const out = [];
  for (const v of verts) {
    let dup = false;
    for (const w of out) {
      if (Math.abs(v[0] - w[0]) < tol && Math.abs(v[1] - w[1]) < tol) { dup = true; break; }
    }
    if (!dup) out.push(v);
  }
  return out;
}

export function supportMax(verts, nx, ny) {
  let m = -Infinity;
  for (const v of verts) {
    const d = nx * v[0] + ny * v[1];
    if (d > m) m = d;
  }
  return m;
}
