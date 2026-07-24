import { copyFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const distAssets = resolve('dist/assets');
const assetNames = await readdir(distAssets);
const appName = assetNames.find((name) => /^app-[\w-]+\.js$/.test(name));
const cssName = assetNames.find((name) => /^index-[\w-]+\.css$/.test(name));
const compatibilityCopies = [
  [appName, ['app.js', 'index-iRskJCgP.js']],
  [cssName, ['index.css', 'index-YN6Yaz_h.css']],
];

for (const [sourceName, compatibilityNames] of compatibilityCopies) {
  if (!sourceName) continue;
  const source = resolve(distAssets, sourceName);
  for (const compatibilityName of compatibilityNames) {
    await copyFile(source, resolve(distAssets, compatibilityName));
  }
}
