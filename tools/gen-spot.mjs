// Генерирует разметку контактного листа (ROUND 07) из raw/manifest.json и вставляет её в index.html
// между <!--@SPOT--> и <!--/@SPOT-->. Размеры берутся из файлов — руками width/height не писать.
//   node tools/gen-spot.mjs
import fs from 'node:fs';

const m = JSON.parse(fs.readFileSync('raw/manifest.json', 'utf8'));
const ALT = [
  'Зал BSONE: светлый пол, граффити на стенах',
  'Стена зала с логотипом ONE и нарисованными брейкерами',
  'Ученик в фризе на фоне баннеров ONE',
  'Выступление на улице у моста «Миллениум»',
  'Уголок диджея: колонки и стена граффити',
  'Ученик держит фриз на одной руке перед логотипом студии',
  'Баттл в плотном кругу зрителей',
  'Тренировка в шатре лагеря BSONE CAMP',
  'Ученица в фризе на фотосессии среди зелени',
  'Зал студии целиком: граффити и логотип ONE',
  'Ученица в белом на фотосессии в саду',
  'Командный номер на сцене',
  'Фриз на тренировке, ребята сидят вокруг',
  'Чёрно-белый кадр: ученик в силовом фризе',
  'Танцор у моста «Миллениум» на уличном фестивале',
  'Силовой элемент на соревнованиях',
  'Тренировка в лагере: стойка на руках',
  'Фриз на домашней фотосессии',
  'Команда студии на пешеходной улице',
  'Танцор в прыжке на тёмной сцене',
  'Стойка на руке у логотипа ONE',
  'Силовой элемент в зале с зелёной подсветкой',
  'Вращение над сценой в свете прожекторов',
  'Футворк на ковре лагеря BSONE CAMP',
];
const BEST = new Set([3, 8, 14, 22]); // кадры, которые обводит маркер
const PER_STRIP = 6;

let html = '';
for (let s = 0; s < ALT.length / PER_STRIP; s++) {
  html += `    <div class="strip">\n`;
  for (let k = 0; k < PER_STRIP; k++) {
    const i = s * PER_STRIP + k + 1;
    const n = String(i).padStart(2, '0');
    const t = m[`spot-${n}-t`], f = m[`spot-${n}`];
    const frame = `${String(i + 6).padStart(2, '0')}A`; // плёнка начинается с 07A — раунд 07
    html += `      <button class="frame${BEST.has(i) ? ' frame--best' : ''}" type="button" data-full="assets/img/spot-${n}.webp" data-w="${f.w}" data-h="${f.h}" data-cursor="view" aria-label="Открыть кадр ${frame}: ${ALT[i - 1]}">`
      + `<span class="frame-img duo duo--soft"><img src="assets/img/spot-${n}-t.webp" width="${t.w}" height="${t.h}" alt="${ALT[i - 1]}" loading="lazy" decoding="async"></span>`
      + `<span class="frame-n mono">${frame}</span>`
      + (BEST.has(i) ? `<svg class="frame-mark mk" viewBox="0 0 200 200" aria-hidden="true"><path class="mk-a"/><path class="mk-b"/></svg>` : '')
      + `</button>\n`;
  }
  html += `    </div>\n`;
}
let page = fs.readFileSync('index.html', 'utf8');
page = page.replace(/<!--@SPOT-->[\s\S]*?<!--\/@SPOT-->/, () => `<!--@SPOT-->\n${html}<!--/@SPOT-->`);
fs.writeFileSync('index.html', page, 'utf8');
console.log('spot frames:', ALT.length);
