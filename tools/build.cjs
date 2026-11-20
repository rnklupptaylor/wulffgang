// Copies the static app (index.html, css/, js/, _headers) into build/deploy, which wrangler.jsonc serves.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'build', 'deploy');

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const item of ['index.html', '_headers', 'css', 'js']) {
  fs.cpSync(path.join(root, item), path.join(destination, item), { recursive: true });
}
console.log('Built ' + path.relative(root, destination));
