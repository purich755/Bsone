// Разовые замеры в странице: node tools/probe.mjs <w> "<js expression>"
import { chromium } from 'playwright-core'; import os from 'node:os'; import path from 'node:path';
const W = +process.argv[2] || 1440; const expr = process.argv[3];
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'bsone-probe'), { channel: 'chrome', headless: true, viewport: { width: W, height: W < 700 ? 844 : 900 }, isMobile: W < 700, hasTouch: W < 700 });
const page = ctx.pages()[0];
await page.addInitScript(() => { try { sessionStorage.setItem('bsone-intro', '1'); } catch (e) {} });
await page.goto('http://localhost:8331/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
console.log(JSON.stringify(await page.evaluate(expr), null, 1));
await ctx.close();
