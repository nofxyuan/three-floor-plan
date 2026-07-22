import { copyFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

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
