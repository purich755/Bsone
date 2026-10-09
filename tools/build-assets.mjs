// Сборка всех картинок сайта из raw/ в assets/img/ (WebP, ≤300 КБ, осмысленные имена).
//   node tools/build-assets.mjs
// Источник: ya### — галерея Яндекс.Карт (raw/photos), p####-n — фото из постов t.me/s/break_dance_studio_one (raw/tg/img).
import sharp from 'sharp';
import fs from 'node:fs';

const src = (id) => (id.startsWith('ya') ? `raw/photos/${id}.jpg` : `raw/tg/img/${id}.jpg`);
const OUT = 'assets/img';
fs.mkdirSync(OUT, { recursive: true });

// [имя, источник, режим]
//   { w, h }      — кадрирование cover в точный размер (position — куда смещать кроп)
//   { long }      — только уменьшение по длинной стороне, пропорции как есть
const PLAN = [
  ['hero-cypher', 'ya025', { w: 1280, h: 1280, position: 'centre' }],
  ['hero-cypher-sm', 'ya025', { w: 720, h: 720, position: 'centre' }],
  ['hero-cypher-md', 'ya025', { w: 900, h: 900, position: 'centre' }],
  ['freeze-boy-md', 'ya118', { long: 1440 }],
  ['freeze-boy', 'ya118', { long: 2000 }],
  ['freeze-boy-sm', 'ya118', { w: 900, h: 1350, position: 'attention' }],
  ['coach-portrait', 'ya113', { w: 1200, h: 1600, position: 'top' }],

  ['path-01', 'ya052', { w: 1000, h: 1250, position: 'attention' }],
  ['path-01-sm', 'ya052', { w: 560, h: 700, position: 'attention' }],
  ['path-02', 'ya065', { w: 1000, h: 1250, position: 'attention' }],
  ['path-02-sm', 'ya065', { w: 560, h: 700, position: 'attention' }],
  ['path-03', 'ya074', { w: 1000, h: 1250, position: 'attention' }],
  ['path-03-sm', 'ya074', { w: 560, h: 700, position: 'attention' }],
  ['path-04', 'ya112', { w: 1000, h: 1250, position: 'attention' }],
  ['path-04-sm', 'ya112', { w: 560, h: 700, position: 'attention' }],

  ['pad-toprock', 'ya077', { w: 720, h: 900, position: 'attention' }],
  ['pad-footwork', 'ya085', { w: 720, h: 900, position: 'attention' }],
  ['pad-freeze', 'ya063', { w: 720, h: 900, position: 'attention' }],
  ['pad-windmill', 'ya092', { w: 720, h: 900, position: 'attention' }],
  ['pad-flare', 'ya078', { w: 720, h: 900, position: 'attention' }],
  ['pad-headspin', 'ya047', { w: 720, h: 900, position: 'attention' }],
  ['pad-twist', 'ya070', { w: 720, h: 900, position: 'attention' }],
  ['pad-battle', 'ya121', { w: 720, h: 900, position: 'attention' }],

  ['tour-01', 'ya114', { w: 900, h: 600 }],
  ['tour-02', 'ya115', { w: 900, h: 600 }],
  ['tour-03', 'ya116', { w: 900, h: 600 }],
  ['tour-04', 'ya060', { w: 900, h: 600 }],
  ['tour-05', 'ya024', { w: 900, h: 600 }],
  ['tour-06', 'ya120', { w: 900, h: 600 }],

  ['camp-splash', 'p2103-2', { w: 1600, h: 1066, upscale: true }],
  ['camp-splash-v', 'p2103-1', { long: 800 }],
  ['camp-team', 'p1961-3', { long: 800 }],
  ['camp-lake', 'p1674-8', { long: 800 }],

  ['entrance', 'ya091', { w: 900, h: 1100, position: 'attention' }],
];

// Галерея «контактный лист»: миниатюра 3:2 + полный кадр для лайтбокса
const SPOT = ['ya002', 'ya030', 'ya064', 'ya004', 'ya017', 'ya111', 'ya039', 'p2036-1', 'ya048', 'ya088',
  'ya016', 'ya001', 'ya100', 'ya019', 'ya066', 'ya086', 'p2825-3', 'ya037', 'ya014', 'ya033', 'ya073', 'ya044', 'ya057', 'p2004-1'];
const SPOT_POS = { ya004: 'south', ya066: 'south', ya100: 'south' };
SPOT.forEach((id, i) => {
  const n = String(i + 1).padStart(2, '0');
  PLAN.push([`spot-${n}-t`, id, { w: 600, h: 400, position: SPOT_POS[id] || 'attention' }]);
  PLAN.push([`spot-${n}`, id, { long: 1800 }]);
});

async function encode(pipe, name) {
  // подбираем качество, пока файл не станет ≤ 300 КБ
  for (const q of [80, 74, 68, 62, 56, 50]) {
    const buf = await pipe.clone().webp({ quality: q, effort: 5 }).toBuffer();
    if (buf.length <= 300 * 1024 || q === 50) { fs.writeFileSync(`${OUT}/${name}.webp`, buf); return [buf.length, q]; }
  }
}

const manifest = {};
for (const [name, id, m] of PLAN) {
  let p = sharp(src(id)).rotate();
  if (m.long) p = p.resize(m.long, m.long, { fit: 'inside', withoutEnlargement: true });
  else p = p.resize(m.w, m.h, { fit: 'cover', position: m.position || 'centre', withoutEnlargement: !m.upscale, kernel: 'lanczos3' });
  if (m.upscale) p = p.sharpen({ sigma: 0.6 });
  const [size, q] = await encode(p, name);
  const meta = await sharp(`${OUT}/${name}.webp`).metadata();
  manifest[name] = { src: id, w: meta.width, h: meta.height, kb: Math.round(size / 1024) };
  console.log(`${name.padEnd(16)} ${id.padEnd(8)} ${meta.width}x${meta.height} ${(size / 1024).toFixed(0)}KB q${q}`);
}
fs.writeFileSync('raw/manifest.json', JSON.stringify(manifest, null, 1));

// Логотип: белые линии на прозрачном (из тёмной плашки), и фавикон — кепка с «O»
const logo = sharp('raw/logo.jpg').extract({ left: 22, top: 236, width: 900, height: 456 });
const { data, info } = await logo.clone().greyscale().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < info.width * info.height; i++) {
  const a = Math.max(0, Math.min(255, (data[i] - 40) * 1.4));
  rgba[i * 4] = 242; rgba[i * 4 + 1] = 241; rgba[i * 4 + 2] = 236; rgba[i * 4 + 3] = a;
}
fs.mkdirSync('assets/logo', { recursive: true });
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(480).webp({ quality: 90 }).toFile('assets/logo/bsone-logo.webp');
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(240).webp({ quality: 90 }).toFile('assets/logo/bsone-logo-sm.webp');
// фавикон: кепка + O на красном круге
const cap = await sharp('raw/logo.jpg').extract({ left: 56, top: 236, width: 330, height: 330 }).greyscale().raw().toBuffer({ resolveWithObject: true });
const fav = Buffer.alloc(330 * 330 * 4);
for (let y = 0; y < 330; y++) for (let x = 0; x < 330; x++) {
  const i = y * 330 + x, d = Math.hypot(x - 165, y - 165);
  const inside = d < 163;
  const w = Math.max(0, Math.min(1, (cap.data[i] - 60) / 120));
  fav[i * 4] = inside ? Math.round(227 + (242 - 227) * w) : 0;
  fav[i * 4 + 1] = inside ? Math.round(36 + (241 - 36) * w) : 0;
  fav[i * 4 + 2] = inside ? Math.round(27 + (236 - 27) * w) : 0;
  fav[i * 4 + 3] = inside ? 255 : 0;
}
for (const s of [32, 180]) await sharp(fav, { raw: { width: 330, height: 330, channels: 4 } }).resize(s, s).png().toFile(`assets/logo/favicon-${s}.png`);
console.log('logo ✓');
