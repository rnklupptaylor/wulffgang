import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);

function makeEl(id) {
  return {
    id,
    textContent: '', value: '', innerHTML: '', disabled: false, checked: false,
    style: {}, dataset: {},
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    addEventListener() {}, appendChild() {}, setPointerCapture() {},
    querySelector: () => makeEl(id + '-child'),
    clientWidth: 0, clientHeight: 0, width: 0, height: 0,
    getContext: () => new Proxy({}, { get: () => () => {} }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  };
}
const registry = new Map(ids.map(id => [id, makeEl(id)]));
const missing = [];

globalThis.document = {
  getElementById: id => {
    if (!registry.has(id)) missing.push(id);
    return registry.get(id) ?? null;
  },
  querySelectorAll: () => [],
  createElement: tag => makeEl('created-' + tag),
  documentElement: { dataset: {} },
  body: makeEl('body'),
};
globalThis.window = { addEventListener() {}, devicePixelRatio: 1 };
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#000000' });
globalThis.requestAnimationFrame = () => 0;

try {
  await import('../js/main.js');
} catch (err) {
  console.error('FAIL: main.js boot crashed:', err.message);
  console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}

const OPTIONAL_IDS = new Set(['e3-g100', 'e3-g110']);
const trulyMissing = [...new Set(missing)].filter(id => !OPTIONAL_IDS.has(id));
if (trulyMissing.length) {
  console.error('FAIL: main.js references ids not present in index.html:', trulyMissing.join(', '));
  process.exit(1);
}
console.log('UI BOOT TEST PASSED (all ids resolved, boot sequence completed)');
