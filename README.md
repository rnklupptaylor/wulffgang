# Wulffγang — equilibrium crystal shapes from surface energies

Interactive teaching app for the unit **Nucleation & Growth → Growth → Wulff construction**
in the bachelor lecture *Introduction to Interface Engineering* (Prof. R. N. Klupp Taylor,
FAU Erlangen-Nürnberg). Companion app to [SupersAPPturated](https://supers-app-turated.netlify.app/)
(nucleation & growth) and [δropwγse](https://dropwyse.netlify.app/) (wetting).

## What it does

The app converts **surface energies of crystal planes into the equilibrium crystal shape —
and vice versa**, in both directions:

| Tab | Direction | Content |
| --- | --- | --- |
| 1 · γ-plot → shape (2D) | γ → shape **and** shape → γ | Classic Herring construction: polar γ-plot with cusps, perpendicular construction planes, inner envelope. Drag the γ-handles *or* drag the facets of the crystal itself; plot and shape always stay consistent. |
| 2 · Crystal shape (3D) | γ ↔ shape | Exact Wulff polyhedron of a cubic crystal from γ{100}, γ{110}, γ{111} (+ optional {210}, {211}, {311}). Facet area fractions, present/missing analysis with numeric critical ratios, metal presets. |
| 3 · Mystery crystal | shape → γ | Quiz: a crystal built from hidden energies must be recovered from its shape alone — the "TEM image" inverse problem. |
| 4 · How it works | — | Theory (Gibbs 1878, Wulff 1901, Herring's recipe), cusps & missing orientations, equilibrium vs. kinetic Wulff, explicit simplifications, references. English + German. |

## Physics implemented (all exact, no approximations in the geometry)

* **Wulff theorem:** facet distance h(n) = λ·γ(n); only γ *ratios* matter (one γ is fixed as
  reference in each tab).
* **2D:** the shape is the exact intersection of half-planes x·n ≤ γ (Sutherland–Hodgman
  clipping). The drawn γ-curve is the exact support function of the resulting polygon, so it
  has cusps precisely at the facet orientations and the construction is self-consistent.
  Inter-cusp orientations are *missing orientations* (marginal case: they touch the shape only
  at corners); the app marks these ranges.
* **3D:** the polyhedron is the exact intersection of the half-spaces n·r ≤ γ{n} of all enabled
  families, computed by vertex enumeration (all plane triples, feasibility-tested) and exact
  face construction. Facet areas are integrated exactly. For each family the app reports the
  **critical γ ratio** at which its facets appear/disappear (computed from the polyhedron with
  that family removed).
* **Presets:** nearest-neighbour broken-bond values for the 2D square lattice
  (γ{11}/γ{10} = √2) and fcc (γ{100}/γ{111} = 2/√3 ≈ 1.155, γ{110}/γ{111} = 5/√24 ≈ 1.021 —
  which gives the 26-facet shape with {111}, {100} *and* {110}), plus rounded literature
  ratios for Au, Ag, Cu, Pt, Pd, Ni (Vitos et al. 1998; Tran et al. 2016), cube and octahedron
  limits.

## Run / deploy

Pure static site — no build step, no dependencies, no external requests.

* **Netlify drag & drop:** drag this folder onto <https://app.netlify.com/drop>.
* **Netlify from git:** connect the repo; `netlify.toml` already sets publish = "."
* **Locally:** `python3 -m http.server` in this folder, open <http://localhost:8000>.

## Development

```
node test/engine.test.mjs    # 2D engine checks (square, octagon, missing facets, support function)
node test/engine3d.test.mjs  # 3D engine checks (broken-bond fcc, cube, octahedron, timing)
```

Structure: `js/geometry.js` (clipping helpers) · `js/wulff2d-engine.js` (2D Wulff) ·
`js/wulff2d-app.js` (2D canvases & interaction) · `js/wulff3d-engine.js` (3D Wulff) ·
`js/wulff3d-app.js` (software 3D renderer) · `js/main.js` (UI wiring).

## References

1. G. Wulff, Z. Kristallogr. **34**, 449 (1901).
2. C. Herring, Phys. Rev. **82**, 87 (1951).
3. L. Vitos, A. V. Ruban, H. L. Skriver, J. Kollár, Surf. Sci. **411**, 186 (1998).
4. R. Tran et al., Sci. Data **3**, 160080 (2016).
