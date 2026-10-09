import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.resolve('.vk-profile'), { channel: 'chrome', headless: false, viewport: { width: 1400, height: 950 }, locale: 'ru-RU' });
const page = ctx.pages()[0] || (await ctx.newPage());
for (const url of process.argv.slice(2)) {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { console.log('ERR', url, e.message); continue; }
  await sleep(6000);
  const info = await page.evaluate(() => ({
    url: location.href, title: document.title,
    imgs: [...document.querySelectorAll('img')].filter(i => /userapi|vkuserphoto/.test(i.src)).length,
    albums: [...new Set([...document.querySelectorAll('a[href*="album-"]')].map(a => a.getAttribute('href') + ' | ' + (a.textContent || '').trim().slice(0, 60)))].slice(0, 40),
    text: document.body.innerText.slice(0, 600),
  }));
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: 'raw/vk-probe.png' });
}
await ctx.close();
