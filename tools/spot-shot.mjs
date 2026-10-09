// Скриншот конкретного места: node tools/spot-shot.mjs <w> <selector> <offsetPx> <waitMs> <out>
import { chromium } from 'playwright-core'; import os from 'node:os'; import path from 'node:path';
const [W, sel, off, wait, out] = [+process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const H = W < 700 ? 844 : 900;
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'bsone-spot'), { channel: 'chrome', headless: true, viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700 });
const page = ctx.pages()[0];
await page.addInitScript(() => { try { sessionStorage.setItem('bsone-intro', '1'); } catch (e) {} });
await page.goto('http://localhost:8331/', { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(([s, o]) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + scrollY + o; const l = window.__bs.lenis; l ? l.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }, [sel, off]);
await new Promise((r) => setTimeout(r, wait));
await page.screenshot({ path: out });
await ctx.close();
