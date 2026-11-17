import { FAMILIES_2D } from './wulff2d-engine.js';
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
  });
}

/* ---------- 2D app ---------- */
const app2d = new Wulff2DApp($('canvas-gamma'), $('canvas-shape'), sync2d);

function sync2d() {
  $('v-g21').textContent = app2d.gammas.g21.toFixed(3);
  $('v-g11').textContent = app2d.gammas.g11.toFixed(3);
  $('s-g21').value = app2d.gammas.g21;
  $('s-g11').value = app2d.gammas.g11;
  updateTable2d();
}

function updateTable2d() {
  const tb = $('table-2d').querySelector('tbody');
  tb.innerHTML = '';
  for (const f of FAMILIES_2D) {
    const st = app2d.shape.famStats[f.key];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="swatch" style="background:${f.color}"></span>${f.label}</td>
      <td>${app2d.gammas[f.key].toFixed(3)}</td>
      <td class="${st.present ? 'yes' : 'no'}">${st.present ? st.count + '×' : 'missing'}</td>
      <td>${st.present ? (st.share * 100).toFixed(1) + ' %' : '—'}</td>`;
    tb.appendChild(tr);
  }
  const missing = FAMILIES_2D.filter(f => !app2d.shape.famStats[f.key].present).map(f => f.label);
  $('missing-note-2d').textContent = missing.length
    ? `Missing orientations: ${missing.join(', ')} — these planes lie outside the envelope; the orientations touch the shape only at corners.`
    : 'All three facet families are present on the shape.';
}

for (const [id, key] of [['s-g21', 'g21'], ['s-g11', 'g11']]) {
  $(id).addEventListener('input', e => app2d.setGammas({ [key]: parseFloat(e.target.value) }));
}
$('t-construction').addEventListener('change', e => app2d.setOptions({ construction: e.target.checked }));
$('t-missing').addEventListener('change', e => app2d.setOptions({ missing: e.target.checked }));
$('t-labels').addEventListener('change', e => app2d.setOptions({ labels: e.target.checked }));

const PRESETS_2D = [
  { name: 'Square', g: { g21: 1.70, g11: 1.70 } },
  { name: 'Broken-bond square lattice (√2)', g: { g21: 1.55, g11: 1.414 } },
  { name: 'Truncated square', g: { g21: 1.70, g11: 1.25 } },
  { name: 'Dodecagon (all facets)', g: { g21: 1.15, g11: 1.30 } },
  { name: 'Randomize', g: null },
];
for (const p of PRESETS_2D) {
  const b = document.createElement('button');
  b.textContent = p.name;
  b.addEventListener('click', () => {
    if (p.g) app2d.setGammas(p.g);
    else app2d.setGammas({
      g21: Math.round((1.0 + Math.random() * 0.6) * 20) / 20,
      g11: Math.round((1.0 + Math.random() * 0.6) * 20) / 20,
    });
  });
  $('presets-2d').appendChild(b);
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
  $('sq-g21').value = appQ.gammas.g21;
  $('sq-g11').value = appQ.gammas.g11;
  $('vq-g21').textContent = appQ.gammas.g21.toFixed(3);
  $('vq-g11').textContent = appQ.gammas.g11.toFixed(3);
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

$('sq-g21').addEventListener('input', e => { appQ.setGammas({ g21: parseFloat(e.target.value) }); });
$('sq-g11').addEventListener('input', e => { appQ.setGammas({ g11: parseFloat(e.target.value) }); });
$('quiz-new').addEventListener('click', () => { appQ.startQuiz(); $('quiz-answer').textContent = ''; });
$('quiz-reveal').addEventListener('click', () => {
  if (!appQ.quiz) appQ.startQuiz();
  appQ.quiz.revealed = true;
  appQ.setGammas({ g21: appQ.quiz.g21, g11: appQ.quiz.g11 });
  $('quiz-answer').textContent = `The hidden values were γ{21} = ${appQ.quiz.g21.toFixed(2)} and γ{11} = ${appQ.quiz.g11.toFixed(2)} (γ{10} = 1).`;
});

/* ---------- boot ---------- */
sync2d();
sync3d();
app2d.draw();
