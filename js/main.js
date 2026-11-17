import { FAMILIES_2D_EXTRAS, FAMILIES_HEX, FAMILIES_HEX_EXTRAS } from './wulff2d-engine.js';
import { FAMILIES_3D } from './wulff3d-engine.js';
import { Wulff2DApp } from './wulff2d-app.js';
import { Wulff3DApp } from './wulff3d-app.js';

const $ = id => document.getElementById(id);

/* ---------- theme ---------- */
const themeToggle = $('themeToggle');
const savedTheme = localStorage.getItem('wulffgang-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('wulffgang-theme', next);
});

/* ---------- tabs ---------- */
for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === btn.dataset.tab));
    if (btn.dataset.tab === 'tab-quiz' && !appQ.quiz) { appQ.startQuiz(); }
    else if (btn.dataset.tab === 'tab-quiz') { appQ.draw(); }
    else if (btn.dataset.tab === 'tab-2d') { app2d.draw(); }
    else if (btn.dataset.tab === 'tab-hex') { appHex.draw(); }
  });
}

window.addEventListener('resize', () => {
  app2d.draw();
  appHex.draw();
  if ($('tab-quiz').classList.contains('active')) appQ.draw();
  app3d.render();
});

/* ---------- 2D app ---------- */
const app2d = new Wulff2DApp($('canvas-gamma'), $('canvas-shape'), sync2d,
  FAMILIES_2D, ['[100]', '[010]'], FAMILIES_2D_EXTRAS);

function sync2d() {
  const cl = x => Math.max(0.80, Math.min(1.70, x));
  const ref = app2d.gammas.g10;
  for (const f of app2d.allFams) {
    if (f.key === app2d.baseFams[0].key) continue;
    const ratio = app2d.gammas[f.key] / ref;
    const v = $(`v-${f.key.slice(1)}`), s = $(`s-${f.key.slice(1)}`);
    if (v) v.textContent = ratio.toFixed(3);
    if (s && !s.disabled) s.value = cl(ratio);
  }
  updateTable2d(app2d, 'table-2d', 'missing-note-2d');
  refreshEditButtons();
}

function updateTable2d(app, tableId, noteId) {
  const ref = app.fams[0].key;
  const tb = $(tableId).querySelector('tbody');
  tb.innerHTML = '';
  for (const f of app.fams) {
    const st = app.shape.famStats[f.key];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="swatch" style="background:${f.color}"></span>${f.label}</td>
      <td>${(app.gammas[f.key] / app.gammas[ref]).toFixed(3)}</td>
      <td class="${st.present ? 'yes' : 'no'}">${st.present ? st.count + '×' : 'missing'}</td>
      <td>${st.present ? (st.share * 100).toFixed(1) + ' %' : '—'}</td>`;
    tb.appendChild(tr);
  }
  const missing = app.fams.filter(f => !app.shape.famStats[f.key].present).map(f => f.label);
  $(noteId).textContent = missing.length
    ? `Missing orientations: ${missing.join(', ')} — these planes lie outside the envelope; the orientations touch the shape only at corners.`
    : 'All facet families are present on the shape.';
}

for (const f of app2d.allFams) {
  if (f.key === app2d.baseFams[0].key) continue;
  const sl = $(`s-${f.key.slice(1)}`);
  if (sl) sl.addEventListener('input', e =>
    app2d.setGammas({ [f.key]: parseFloat(e.target.value) * app2d.gammas.g10 }));
}
$('t-construction').addEventListener('change', e => app2d.setOptions({ construction: e.target.checked }));
$('t-missing').addEventListener('change', e => app2d.setOptions({ missing: e.target.checked }));
$('t-labels').addEventListener('change', e => app2d.setOptions({ labels: e.target.checked }));
$('t-gammafacets').addEventListener('change', e => app2d.setOptions({ gammaFacets: e.target.checked }));
$('r-construction').addEventListener('input', e => {
  $('vr-construction').textContent = e.target.value;
  app2d.setOptions({ constructionDensity: parseInt(e.target.value) });
});

function wireExtras(app, sliderPrefix) {
  const refKey = app.baseFams[0].key;
  for (const f of app.extraFams) {
    const cb = $(`e-${f.key}`);
    const sl = $(`${sliderPrefix}-${f.key}`);
    cb.addEventListener('change', () => {
      sl.disabled = !cb.checked;
      const keys = app.baseFams.map(x => x.key);
      for (const g of app.extraFams) if ($(`e-${g.key}`).checked) keys.push(g.key);
      app.setActive(keys);
    });
    sl.addEventListener('input', e =>
      app.setGammas({ [f.key]: parseFloat(e.target.value) * app.gammas[refKey] }));
  }
}
wireExtras(app2d, 's');

const editRefreshers = [];
function refreshEditButtons() { for (const r of editRefreshers) r(); }
function makeEditButtons(containerId, app) {
  const cont = $(containerId);
  const buttons = [];
  const mk = (label, key) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => {
      app.setEditFilter(key);
      refreshEditButtons();
    });
    cont.appendChild(b);
    buttons.push([key, b]);
  };
  mk('All', null);
  for (const f of app.allFams) mk('Edit ' + f.label, f.key);
  editRefreshers.push(() => {
    for (const [key, b] of buttons) {
      if (key !== null) b.disabled = !app.fams.some(f => f.key === key);
      b.classList.toggle('active', (app.editFilter ?? null) === key);
    }
  });
  refreshEditButtons();
}
makeEditButtons('edit-2d', app2d);

const PRESETS_2D = [
  { name: 'Square', g: { g10: 1, g21: 1.70, g11: 1.70 } },
  { name: 'Broken-bond square lattice (√2)', g: { g10: 1, g21: 1.55, g11: 1.414 } },
  { name: 'Truncated square', g: { g10: 1, g21: 1.70, g11: 1.25 } },
  { name: 'Dodecagon (all facets)', g: { g10: 1, g21: 1.15, g11: 1.30 } },
  { name: 'Randomize', g: null },
];
for (const p of PRESETS_2D) {
  const b = document.createElement('button');
  b.textContent = p.name;
  b.addEventListener('click', () => {
    if (p.g) app2d.setGammas(p.g);
    else app2d.setGammas({
      g10: 1,
      g21: Math.round((1.0 + Math.random() * 0.6) * 20) / 20,
      g11: Math.round((1.0 + Math.random() * 0.6) * 20) / 20,
    });
  });
  $('presets-2d').appendChild(b);
}

/* ---------- hexagonal (anisotropic) 2D app ---------- */
const appHex = new Wulff2DApp($('canvas-hexgamma'), $('canvas-hexshape'), syncHex,
  FAMILIES_HEX, ['[1-100]', '[0001]'], FAMILIES_HEX_EXTRAS);

function syncHex() {
  const cl = x => Math.max(0.50, Math.min(3.20, x));
  const ref = appHex.gammas.gm;
  for (const f of appHex.allFams) {
    if (f.key === appHex.baseFams[0].key) continue;
    const ratio = appHex.gammas[f.key] / ref;
    const v = $(`vh-${f.key}`), s = $(`sh-${f.key}`);
    if (v) v.textContent = ratio.toFixed(3);
    if (s && !s.disabled) s.value = cl(ratio);
  }
  const xs = appHex.shape.poly.map(v => v[0]), ys = appHex.shape.poly.map(v => v[1]);
  const L = Math.max(...ys) - Math.min(...ys), D = Math.max(...xs) - Math.min(...xs);
  $('aspect-hex').textContent = (L / D).toFixed(2);
  updateTable2d(appHex, 'table-hex', 'missing-note-hex');
  refreshEditButtons();
}

for (const [id, key] of [['sh-gb', 'gb'], ['sh-gp', 'gp']]) {
  $(id).addEventListener('input', e =>
    appHex.setGammas({ [key]: parseFloat(e.target.value) * appHex.gammas.gm }));
}
$('th-construction').addEventListener('change', e => appHex.setOptions({ construction: e.target.checked }));
$('th-missing').addEventListener('change', e => appHex.setOptions({ missing: e.target.checked }));
$('th-labels').addEventListener('change', e => appHex.setOptions({ labels: e.target.checked }));
$('th-gammafacets').addEventListener('change', e => appHex.setOptions({ gammaFacets: e.target.checked }));
$('rh-construction').addEventListener('input', e => {
  $('vrh-construction').textContent = e.target.value;
  appHex.setOptions({ constructionDensity: parseInt(e.target.value) });
});
wireExtras(appHex, 'sh');
makeEditButtons('edit-hex', appHex);

const PRESETS_HEX = [
  { name: 'ZnO-like nanorod', g: { gm: 1, gb: 1.80, gp: 1.25 } },
  { name: 'Needle (flat ends)', g: { gm: 1, gb: 3.20, gp: 3.20 } },
  { name: 'Platelet (ice-like)', g: { gm: 1, gb: 0.60, gp: 1.10 } },
  { name: 'Octagonal section (all facets)', g: { gm: 1, gb: 1.40, gp: 1.15 } },
  { name: 'Randomize', g: null },
];
for (const p of PRESETS_HEX) {
  const b = document.createElement('button');
  b.textContent = p.name;
  b.addEventListener('click', () => {
    if (p.g) appHex.setGammas(p.g);
    else appHex.setGammas({
      gm: 1,
      gb: Math.round((0.6 + Math.random() * 2.4) * 20) / 20,
      gp: Math.round((0.8 + Math.random() * 1.6) * 20) / 20,
    });
  });
  $('presets-hex').appendChild(b);
}

/* ---------- 3D app ---------- */
const tooltip = document.createElement('div');
tooltip.id = 'tooltip3d';
document.body.appendChild(tooltip);
let app3d = null;
app3d = new Wulff3DApp($('canvas-3d'), tooltip, sync3d);

function sync3d() {
  if (!app3d) return;
  for (const f of FAMILIES_3D) {
    if (f.fixed) continue;
    const v = `v3-${f.key}`;
    const s = `s3-${f.key}`;
    if ($(v)) $(v).textContent = app3d.gammas[f.key].toFixed(3);
    if ($(s) && !$(s).disabled) $(s).value = app3d.gammas[f.key];
  }
  updateTable3d();
}

function updateTable3d() {
  const tb = $('table-3d').querySelector('tbody');
  tb.innerHTML = '';
  for (const f of FAMILIES_3D) {
    if (!app3d.active.has(f.key)) continue;
    const st = app3d.shape.famStats[f.key];
    const crit = app3d.crits[f.key];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="swatch" style="background:${f.color}"></span>${f.label}</td>
      <td>${app3d.gammas[f.key].toFixed(3)}</td>
      <td class="${st.present ? 'yes' : 'no'}">${st.present ? st.count + '×' : '—'}</td>
      <td>${st.present ? (st.share * 100).toFixed(1) + ' %' : '0 %'}</td>
      <td>${crit !== undefined ? crit.toFixed(3) : '…'}</td>`;
    tb.appendChild(tr);
  }
  const hints = [];
  for (const f of FAMILIES_3D) {
    if (!app3d.active.has(f.key)) continue;
    const st = app3d.shape.famStats[f.key];
    const crit = app3d.crits[f.key];
    if (!st.present && crit !== undefined) {
      hints.push(`${f.label} facets are missing: this plane lies inside the envelope. It would appear only if γ${f.label} ≤ ${crit.toFixed(3)}.`);
    } else if (st.present && crit !== undefined && Math.abs(crit - app3d.gammas[f.key]) < 0.02) {
      hints.push(`${f.label} is close to its critical ratio — its facets are about to vanish.`);
    }
  }
  $('hint-3d').textContent = hints.join(' ');
}

for (const f of FAMILIES_3D) {
  if (f.fixed) continue;
  const cb = $(`e3-${f.key}`);
  const sl = $(`s3-${f.key}`);
  if (cb) cb.addEventListener('change', () => {
    sl.disabled = !cb.checked;
    const keys = ['g111', 'g100', 'g110'];
    for (const g of FAMILIES_3D) if (!g.fixed && $(`e3-${g.key}`)?.checked) keys.push(g.key);
    app3d.setActive(keys);
  });
  if (sl) sl.addEventListener('input', e => app3d.setGammas({ [f.key]: parseFloat(e.target.value) }));
}
$('t3-rotate').addEventListener('change', e => app3d.setOptions({ rotate: e.target.checked }));
$('t3-distances').addEventListener('change', e => app3d.setOptions({ distances: e.target.checked }));
$('t3-edges').addEventListener('change', e => app3d.setOptions({ edges: e.target.checked }));

const SQ3 = Math.sqrt(3), SQ2 = Math.sqrt(2);
const PRESETS_3D = [
  { name: 'Broken-bond fcc', g: { g100: 2 / SQ3, g110: 5 / Math.sqrt(24) } },
  { name: 'Au (gold)', g: { g100: 1.19, g110: 1.25 } },
  { name: 'Ag (silver)', g: { g100: 1.15, g110: 1.21 } },
  { name: 'Cu (copper)', g: { g100: 1.19, g110: 1.24 } },
  { name: 'Pt (platinum)', g: { g100: 1.13, g110: 1.22 } },
  { name: 'Pd', g: { g100: 1.18, g110: 1.26 } },
  { name: 'Ni', g: { g100: 1.19, g110: 1.26 } },
  { name: 'Cube', g: { g100: 0.55, g110: 0.90 } },
  { name: 'Octahedron', g: { g100: 1.80, g110: 1.80 } },
];
for (const p of PRESETS_3D) {
  const b = document.createElement('button');
  b.textContent = p.name;
  b.addEventListener('click', () => app3d.setGammas(p.g));
  $('presets-3d').appendChild(b);
}

/* ---------- quiz (own 2D instance on the quiz canvas) ---------- */
const appQ = new Wulff2DApp($('canvas-quiz'), $('canvas-quiz'), syncQuiz);

function updateQuizUI() {
  const cl = x => Math.max(0.80, Math.min(1.70, x));
  $('sq-g21').value = cl(appQ.gammas.g21 / appQ.gammas.g10);
  $('sq-g11').value = cl(appQ.gammas.g11 / appQ.gammas.g10);
  $('vq-g21').textContent = (appQ.gammas.g21 / appQ.gammas.g10).toFixed(3);
  $('vq-g11').textContent = (appQ.gammas.g11 / appQ.gammas.g10).toFixed(3);
  const m = appQ.matchScore();
  if (m !== null) $('quiz-matchbar').style.width = (m * 100).toFixed(0) + '%';
  if (!appQ.quiz) return;
  if (appQ.quiz.revealed) {
    $('quiz-status').textContent = 'Answer shown below ↓';
  } else if (m > 0.97) {
    $('quiz-status').textContent = 'Solved! 🎉';
  } else if (m > 0.85) {
    $('quiz-status').textContent = 'Very close…';
  } else {
    $('quiz-status').textContent = (m * 100).toFixed(0) + ' % match';
  }
}

function syncQuiz() { updateQuizUI(); }
makeEditButtons('quiz-edit', appQ);

$('sq-g21').addEventListener('input', e => { appQ.setGammas({ g21: parseFloat(e.target.value) * appQ.gammas.g10 }); });
$('sq-g11').addEventListener('input', e => { appQ.setGammas({ g11: parseFloat(e.target.value) * appQ.gammas.g10 }); });
$('quiz-new').addEventListener('click', () => { appQ.startQuiz(); $('quiz-answer').textContent = ''; });
$('quiz-reveal').addEventListener('click', () => {
  if (!appQ.quiz) appQ.startQuiz();
  appQ.quiz.revealed = true;
  appQ.setGammas({ g21: appQ.quiz.g21, g11: appQ.quiz.g11 });
  $('quiz-answer').textContent = `The hidden values were γ{21} = ${appQ.quiz.g21.toFixed(2)} and γ{11} = ${appQ.quiz.g11.toFixed(2)} (γ{10} = 1).`;
});

/* ---------- boot ---------- */
sync2d();
syncHex();
sync3d();
app2d.draw();
appHex.draw();
