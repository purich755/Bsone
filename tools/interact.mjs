// Прогон интерактива реальной мышью/клавиатурой.
//   node tools/interact.mjs [--w 1440]
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i === -1 ? d : process.argv[i + 1]; };
const W = parseInt(arg('w', '1440'), 10), H = W < 700 ? 844 : 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'bsone-interact'), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, locale: 'ru-RU',
});
const page = ctx.pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => {
  try { sessionStorage.setItem('bsone-intro', '1'); } catch (e) {}
  // счётчик звуков: оборачиваем AudioContext
  window.__snd = { ctx: 0, osc: 0, src: 0 };
  const AC = window.AudioContext;
  window.AudioContext = class extends AC {
    constructor(...a) { super(...a); window.__snd.ctx++; }
    createOscillator() { window.__snd.osc++; return super.createOscillator(); }
    createBufferSource() { window.__snd.src++; return super.createBufferSource(); }
  };
});
await page.goto('http://localhost:8331/', { waitUntil: 'load' });
await sleep(1500);
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
const go = async (sel, off = 0) => { await page.evaluate(([s, o]) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + scrollY + o; const l = window.__bs.lenis; l ? l.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }, [sel, off]); await sleep(900); };
const center = async (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);

// 1. кольцо вращается
await go('#cypher');
const a1 = await page.evaluate(() => document.querySelector('#ringText').style.transform);
await sleep(1000);
const a2 = await page.evaluate(() => document.querySelector('#ringText').style.transform);
ok('кольцо hero вращается', a1 !== a2, `${a1} → ${a2}`);

// 2. меню
await page.click('#burger');
await sleep(700);
const menu = await page.evaluate(() => {
  const m = document.querySelector('#menu');
  const pts = [...document.querySelectorAll('.menu-list a')].map((a) => { const r = a.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; });
  return { open: m.classList.contains('is-open'), vis: getComputedStyle(m).visibility, inert: m.inert, pts, focus: document.activeElement.textContent.trim() };
});
const uniq = new Set(menu.pts.map((p) => p.join(','))).size;
ok('меню открывается', menu.open && menu.vis === 'visible' && !menu.inert, `фокус: ${menu.focus}`);
ok('пункты разложены (12 разных позиций)', uniq === 12, JSON.stringify(menu.pts.slice(0, 3)));
await page.keyboard.press('Escape');
await sleep(600);
ok('Esc закрывает меню', await page.evaluate(() => !document.querySelector('#menu').classList.contains('is-open')));
await page.click('#burger'); await sleep(600);
await page.click('.menu-list a[href="#coach"]');
await sleep(2200);
const coachTop = await page.evaluate(() => Math.round(document.querySelector('#coach').getBoundingClientRect().top));
ok('пункт меню ведёт к секции', Math.abs(coachTop) < 120, `top=${coachTop}`);
const rn = await page.evaluate(() => document.querySelector('.rounds-num').textContent + ' ' + document.querySelector('.rounds-title').textContent);
ok('счётчик раундов = 06', rn.startsWith('06'), rn);

// 3. сэмплер
await go('#mpc', -80);
let [x, y] = await center('.pad[data-pad="2"]');
await page.mouse.move(x, y); await page.mouse.down(); await sleep(40);
const down = await page.evaluate(() => document.querySelector('.pad[data-pad="2"]').classList.contains('is-down'));
await page.mouse.up(); await sleep(1500);
const t1 = await page.evaluate(() => [document.querySelector('#screenTitle').textContent, document.querySelector('#screenImg').getAttribute('src'), window.__snd.ctx, window.__snd.osc + window.__snd.src]);
ok('пэд вдавливается', down);
ok('дисплей печатает FREEZE + фото', t1[0] === 'FREEZE' && t1[1].includes('pad-freeze'), t1.slice(0, 2).join(' | '));
ok('первый клик создаёт AudioContext, звук молчит', t1[2] === 1 && t1[3] === 0, `ctx=${t1[2]} узлов=${t1[3]}`);
const toast = await page.evaluate(() => document.querySelector('#soundToast').classList.contains('is-on'));
ok('подсказка включить звук', toast);
await page.click('#soundToggle'); await sleep(200);
await page.keyboard.press('4'); await sleep(1400);
const t2 = await page.evaluate(() => [document.querySelector('#soundToggle').getAttribute('aria-pressed'), document.querySelector('#screenTitle').textContent, window.__snd.osc + window.__snd.src]);
ok('тумблер ЗВУК ВКЛ', t2[0] === 'true');
ok('клавиша 4 → WINDMILL со звуком', t2[1] === 'WINDMILL' && t2[2] > 0, `узлов=${t2[2]}`);
for (const k of ['1', '2', '3', '5', '6', '7', '8']) { await page.keyboard.press(k); await sleep(120); }
await sleep(1400);
ok('клавиши 1–8 перебирают пэды', (await page.evaluate(() => document.querySelector('#screenTitle').textContent)) === 'BATTLE');

// 4. лайтбокс
await go('#sheet', -60);
await page.evaluate(() => document.querySelectorAll('.frame')[4].scrollIntoView({ block: 'center' }));
if (await page.evaluate(() => !!window.__bs.lenis)) await page.evaluate(() => { const r = document.querySelectorAll('.frame')[4].getBoundingClientRect(); window.__bs.lenis.scrollTo(scrollY + r.top - innerHeight / 2, { immediate: true, force: true }); });
await sleep(800);
[x, y] = await page.evaluate(() => { const r = document.querySelectorAll('.frame')[4].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await page.mouse.click(x, y); await sleep(1000);
let lb = await page.evaluate(() => [!document.querySelector('#lb').hidden, document.querySelector('#lbCount').textContent, document.activeElement.id]);
ok('лайтбокс открывается с кадра 05', lb[0] && lb[1].startsWith('05'), lb.join(' | '));
await page.keyboard.press('ArrowRight'); await sleep(700);
ok('стрелка → 06', (await page.evaluate(() => document.querySelector('#lbCount').textContent)).startsWith('06'));
await page.mouse.move(W / 2, H / 2); await page.mouse.wheel(0, 120); await sleep(700);
ok('колесо → 07', (await page.evaluate(() => document.querySelector('#lbCount').textContent)).startsWith('07'));
await page.mouse.move(W / 2 - 150, H / 2 - 40); await page.mouse.down(); await page.mouse.move(W / 2 + 150, H / 2 - 40, { steps: 6 }); await page.mouse.up(); await sleep(700);
ok('свайп вправо → 06', (await page.evaluate(() => document.querySelector('#lbCount').textContent)).startsWith('06'));
const loaded = await page.evaluate(() => document.querySelector('#lbImg').currentSrc);
ok('подгружается полный кадр', /spot-\d\d\.webp$/.test(loaded), loaded.split('/').pop());
await page.keyboard.press('Escape'); await sleep(900);
lb = await page.evaluate(() => [document.querySelector('#lb').hidden, document.activeElement.className]);
ok('Esc закрывает, фокус на кадре', lb[0] && /frame/.test(lb[1]), lb.join(' | '));

// 5. стикеры
await go('#wall', -100); await sleep(1200);
const sel = '.sticker--rect.sticker--chalk';
const before = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top]; }, sel);
[x, y] = await center(sel);
await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 220, y + 90, { steps: 12 }); await page.mouse.up(); await sleep(1300);
const after = await page.evaluate((s) => { const el = document.querySelector(s); const r = el.getBoundingClientRect(); return [r.left, r.top, el.style.zIndex]; }, sel);
if (W >= 768) ok('стикер перетаскивается', Math.abs(after[0] - before[0]) > 120, `${before.map(Math.round)} → ${after.slice(0, 2).map(Math.round)} z=${after[2]}`);
else ok('на мобиле стикеры не таскаются', Math.abs(after[0] - before[0]) < 5);

// 6. путь
const pathMode = await page.evaluate(() => document.querySelector('#path').classList.contains('path--swipe') ? 'swipe' : 'pin');
ok('режим «Пути»', W >= 1024 ? pathMode === 'pin' : pathMode === 'swipe', pathMode);

console.log(results.join('\n'));
console.log(errors.length ? 'ОШИБКИ:\n' + errors.join('\n') : 'ошибок нет');
await ctx.close();
