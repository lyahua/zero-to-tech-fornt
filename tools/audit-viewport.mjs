/**
 * PC / H5 双视口体检：滚动、布局、兼容性
 * 用法：node tools/audit-viewport.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const base = process.argv[2] || 'http://localhost:4175';
const OUT = path.resolve('screenshots');
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'pc-1920', width: 1920, height: 1080, dsf: 1 },
  { name: 'pc-1440', width: 1440, height: 900, dsf: 1 },
  { name: 'laptop-1280', width: 1280, height: 720, dsf: 1 },
  { name: 'ipad-820', width: 820, height: 1180, dsf: 2, mobile: true },
  { name: 'h5-390', width: 390, height: 844, dsf: 3, mobile: true },
  { name: 'h5-360', width: 360, height: 740, dsf: 3, mobile: true },
];

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

for (const v of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.dsf,
    isMobile: !!v.mobile,
    hasTouch: !!v.mobile,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base + '/?type=INTJ', { waitUntil: 'networkidle' });
  await page.waitForSelector('.report-foot', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700);

  const info = await page.evaluate(() => {
    const wrap = document.querySelector('.report-wrap');
    const scaler = document.querySelector('.report-scaler');
    const cs = getComputedStyle(wrap);
    const table = document.querySelector('table.vars');
    const wrapRect = wrap.getBoundingClientRect();
    const scalerRect = scaler.getBoundingClientRect();

    // 横向溢出检测
    const overflow = [];
    document.querySelectorAll('.mbti-report *').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible') {
        overflow.push((el.className || el.tagName) + ' ' + el.scrollWidth + '>' + el.clientWidth);
      }
    });

    // 内容宽度是否超出可视区（缩放后）
    return {
      docScrollW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      wrapOverflowY: cs.overflowY,
      wrapOverflowX: cs.overflowX,
      wrapClientW: wrap.clientWidth,
      wrapClientH: wrap.clientHeight,
      wrapScrollH: wrap.scrollHeight,
      scalerVisualW: Math.round(scalerRect.width),
      scalerVisualRight: Math.round(scalerRect.right),
      wrapRight: Math.round(wrapRect.right),
      scalerInlineW: scaler.style.width,
      scalerTransform: getComputedStyle(scaler).transform,
      tableW: table ? Math.round(table.scrollWidth) : null,
      tableClientW: table ? table.clientWidth : null,
      headerH: document.querySelector('.mbti-header')?.offsetHeight,
      panelH: document.querySelector('.panel')?.offsetHeight,
      chartCardW: document.querySelector('.chart-grid')?.getBoundingClientRect().width,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      innerOverflow: overflow.slice(0, 6),
      appH: document.querySelector('.mbti-app')?.offsetHeight,
      winH: window.innerHeight,
    };
  });

  await page.screenshot({ path: path.join(OUT, `audit-${v.name}.png`) });
  console.log(`\n### ${v.name} (${v.width}x${v.height}@${v.dsf}x)`);
  console.log(JSON.stringify(info));
  if (errs.length) console.log('  ⚠ JS错误: ' + errs.join(' | '));
  await ctx.close();
}

await browser.close();