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
| 3 · Anisotropic crystals | γ → shape (and back) | Wurtzite-type crystal (ZnO, GaN, ice …), 2D section containing the c-axis: γ{0001}/γ{10-10} sets the rod/platelet aspect ratio, γ{10-11}/γ{10-10} the pyramidal end bevels. Presets: ZnO-like nanorod, needle, ice-like platelet, octagonal section. |
| 4 · Mystery crystal | shape → γ | Quiz: a crystal built from hidden energies must be recovered from its shape alone — the "TEM image" inverse problem. |
| 5 · How it works | — | Theory (Gibbs 1878, Wulff 1901, Herring's recipe), cusps & missing orientations, anisotropic crystals & rods, equilibrium vs. kinetic Wulff, explicit simplifications, references. English + German. |

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
* **Anisotropic (hexagonal) tab:** the Wulff construction is symmetry-agnostic; the tab uses a
  2D section containing the c-axis of a wurtzite crystal with families {0001} (basal, polar),
  {10-10} (prism m-plane) and {10-11} (pyramidal, normal at 61.6° from the basal normal for
  ZnO's c/a = 1.60). With only {10-10} and {0001} present, L/D = γ{0001}/γ{10-10} exactly.
* **Display options (2D tabs):** facet colours on the γ-plot (off by default), a construction-line
  density slider (180 → 6 perpendiculars), and optional higher-index families — {31}, {32} in the
  cubic section, {10-12}, {10-13} in the hexagonal section (their plane angles computed from
  c/a = 1.60) — activatable per checkbox with their own γ sliders.
* **Presets:** nearest-neighbour broken-bond values for the 2D square lattice
  (γ{11}/γ{10} = √2) and fcc (γ{100}/γ{111} = 2/√3 ≈ 1.155, γ{110}/γ{111} = 5/√24 ≈ 1.021 —
  which gives the 26-facet shape with {111}, {100} *and* {110}), plus rounded literature
  ratios for Au, Ag, Cu, Pt, Pd, Ni (Vitos et al. 1998; Tran et al. 2016), cube and octahedron
  limits.

## Layout

Tabs 1–4 use a viewport-fit "workspace" layout: canvases and all controls are arranged side by side
and sized to the browser window, so the result and the sliders are visible simultaneously without
scrolling (controls column scrolls internally only if a laptop screen is very short). Intro text and
the "Try this" exercises are collapsed fold-out panels to keep everything on one screen. Below
~1100 px width (tablets/phones) the layout falls back to a stacked, scrollable arrangement.

## Run / deploy

Pure static site — no build step, no dependencies, no external requests.

* **Netlify drag & drop:** drag this folder onto <https://app.netlify.com/drop>.
* **Netlify from git:** connect the repo; `netlify.toml` already sets publish = "."
* **Locally:** `python3 -m http.server` in this folder, open <http://localhost:8000>.

## Development

```
node test/engine.test.mjs    # 2D engine checks (square, octagon, missing facets, support function)
node test/hex.test.mjs       # hexagonal c-axis section checks (rod/platelet aspect ratios, critical ratios)
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
