// Открытие через file:// (двойной клик): ошибки, загрузка библиотек, картинки.
import { chromium } from 'playwright-core'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
page.on('requestfailed', (r) => errs.push('FAIL ' + r.url()));
await page.goto(pathToFileURL(path.resolve('index.html')).href, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 3500));
const info = await page.evaluate(() => ({ gsap: !!window.gsap, lenis: !!(window.__bs && window.__bs.lenis), cls: document.body.className,
  broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('loading') !== 'lazy').map((i) => i.src), pre: !!document.querySelector('#preloader') }));
console.log(JSON.stringify(info), errs.length ? '\n' + errs.join('\n') : '\nошибок нет');
await browser.close();
