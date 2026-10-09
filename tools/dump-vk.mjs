// Дамп фото сообщества VK через настоящий браузер.
//   node tools/dump-vk.mjs [--headless]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';

const SLUG = 'break_dance_studio_one';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headless = process.argv.includes('--headless');
fs.mkdirSync('raw', { recursive: true });

let ctx;
for (const channel of ['chrome', 'msedge']) {
  try { ctx = await chromium.launchPersistentContext(path.resolve('.vk-profile'), { channel, headless, viewport: { width: 1500, height: 980 }, locale: 'ru-RU' }); break; }
  catch (e) { if (channel === 'msedge') throw e; }
}
const page = ctx.pages()[0] || (await ctx.newPage());
const found = new Map();

const collect = async () => {
  const urls = await page.evaluate(() => {
    const pick = (img) => {
      const c = [];
      if (img.srcset) for (const p of img.srcset.split(',')) { const [u, w] = p.trim().split(/\s+/); c.push([parseInt(w) || 0, u]); }
      if (img.currentSrc || img.src) c.push([0, img.currentSrc || img.src]);
      c.sort((a, b) => b[0] - a[0]);
      return c[0]?.[1] || null;
    };
    const out = [];
    for (const img of document.querySelectorAll('img')) {
      const u = pick(img);
      if (u && /userapi\.com|vk\.com\/impg/.test(u) && !/=50x50|=100x100|=32x32|=64x64/.test(u)) out.push(u);
    }
    for (const e of document.querySelectorAll('[style*="background-image"]')) {
      const m = e.style.backgroundImage.match(/url\("?([^")]+)"?\)/);
      if (m && /userapi\.com/.test(m[1]) && !/=50x50|=100x100/.test(m[1])) out.push(m[1]);
    }
    return out;
  }).catch(() => []);
  urls.forEach((u) => { const k = (u.match(/impg\/([^/?]+)/) || u.match(/impf\/([^/?]+)/) || [0, u])[1]; if (!found.has(k)) found.set(k, u); });
};

for (const url of [`https://vk.com/${SLUG}`]) {
  if (url.endsWith('albums-')) continue;
  console.log('→', url);
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch { continue; }
  await sleep(5000);
  for (let i = 0; i < 120; i++) {
    await collect();
    await page.mouse.move(700, 600);
    await page.mouse.wheel(0, 2000);
    await sleep(800);
    if (i % 10 === 9) console.log(`  …${found.size}`);
  }
  if (found.size > 400) break;
}
fs.writeFileSync('raw/vk-photos.json', JSON.stringify([...found.values()], null, 2), 'utf8');
console.log(page.url()); console.log(`✓ raw/vk-photos.json — ${found.size}`);
await ctx.close();
