// Скачивает исходные woff2 шрифтов Google (только cyrillic + latin) в raw/fonts/ — вход для tools/subset-fonts.mjs.
//   node tools/fetch-fonts.mjs
import fs from 'node:fs';
const URL = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Geologica:slnt,wght@-12..0,300..800&family=IBM+Plex+Mono:wght@400;500&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const css = await (await fetch(URL, { headers: { 'User-Agent': UA } })).text();
const blocks = css.split('/* ').slice(1).map((b) => ({ subset: b.slice(0, b.indexOf(' */')), body: b.slice(b.indexOf('@font-face')) }));
let out = '/* Шрифты Google, захощены локально: только cyrillic и latin. Сгенерировано tools/fetch-fonts.mjs */\n';
const seen = new Map();
for (const { subset, body } of blocks) {
  if (subset !== 'cyrillic' && subset !== 'latin') continue;
  const fam = body.match(/font-family: '([^']+)'/)[1];
  const style = body.match(/font-style: (\w+)/)[1];
  const weight = body.match(/font-weight: ([\d ]+)/)[1].trim();
  const url = body.match(/url\(([^)]+)\)/)[1];
  // у вариативных шрифтов один файл на все веса — качаем один раз
  let file = seen.get(url);
  if (!file) {
    file = `${fam.replace(/\s+/g, '-').toLowerCase()}-${style}-${weight.replace(/\s+/g, '_')}-${subset}.woff2`;
    fs.writeFileSync(`raw/fonts/${file}`, Buffer.from(await (await fetch(url)).arrayBuffer()));
    seen.set(url, file);
  }
  out += body.replace(/url\([^)]+\)/, `url('../raw/fonts/${file}')`).trim() + '\n';
}
fs.mkdirSync('raw/fonts', { recursive: true }); fs.writeFileSync('raw/fonts/fonts.css', out, 'utf8');
console.log([...seen.values()].join('\n'));
