import { createHash } from 'node:crypto';
import { copyFile, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distIndex = resolve('dist/index.html');
const distAssets = resolve('dist/assets');
const compatibilityCopies = [
  ['app.js', 'index-iRskJCgP.js'],
  ['index.css', 'index-YN6Yaz_h.css'],
];

for (const [sourceName, compatibilityName] of compatibilityCopies) {
  const source = resolve(distAssets, sourceName);
  try {
    await stat(source);
    await copyFile(source, resolve(distAssets, compatibilityName));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

let indexHtml = await readFile(distIndex, 'utf8');
for (const assetName of ['app.js', 'index.css']) {
  const asset = await readFile(resolve(distAssets, assetName));
  const version = createHash('sha256').update(asset).digest('hex').slice(0, 10);
  indexHtml = indexHtml.replaceAll(`assets/${assetName}`, `assets/${assetName}?v=${version}`);
}
await writeFile(distIndex, indexHtml);
