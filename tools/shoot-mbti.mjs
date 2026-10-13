/**
 * 用本机 Edge 真机渲染截图，验证 MBTI 报告重构后各区块是否正常
 * 用法：node tools/shoot-mbti.mjs [baseUrl] [type...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const base = process.argv[2] || 'http://localhost:4173';
const types = process.argv.slice(3).length ? process.argv.slice(3) : ['INTJ', 'ENTP'];
const OUT = path.resolve('screenshots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('[console] ' + m.text());
});
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

for (const type of types) {
  errors.length = 0;
  await page.goto(`${base}/?type=${type}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.report-foot', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);

  const stat = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const n = (s) => document.querySelectorAll(s).length;
    const canvasOk = (s) => {
      const el = q(s);
      if (!el) return 'missing';
      const c = el.querySelector('canvas');
      if (!c) return 'no-canvas';
      return c.width > 100 && c.height > 100 ? 'ok ' + c.width + 'x' + c.height : 'blank';
    };
    return {
      swot: n('.matrix .q'),
      swotItems: n('.matrix .q li'),
      quadChips: n('.legend-chips .chip'),
      quadCards: n('.quad-grid .qc'),
      tableRows: n('table.vars tbody tr'),
      trends: n('.world .trend-list .trend'),
      strategies: n('.strategy .st'),
      verdict: (q('.verdict p')?.textContent || '').slice(0, 24),
      funcs: n('.persona .func'),
      dims: n('.persona .dim'),
      radar: canvasOk('.chart--radar'),
      stack: canvasOk('.chart--stack'),
      quad: canvasOk('.chart--quad'),
      scrollH: document.querySelector('.report-wrap')?.scrollHeight,
      loading: !!q('.loading-mask'),
    };
  });

  const file = path.join(OUT, `${type}.png`);
  await page.screenshot({ path: file });

  // 滚动容器是 .report-wrap（内部 overflow:auto），fullPage 截不到，
  // 所以对关键区块逐个 element 截图
  const shots = [
    ['swot', '.matrix'],
    ['quad', '.world-section'],
    ['world', '.world'],
    ['verdict', '.verdict'],
    ['persona', '.persona'],
    ['charts', '.chart-grid'],
  ];
  for (const [name, sel] of shots) {
    const el = await page.$(sel);
    if (!el) {
      console.log(`  (缺少区块 ${sel})`);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await el.screenshot({ path: path.join(OUT, `${type}-${name}.png`) });
  }
  console.log(`=== ${type} -> ${file} (+${shots.length} 个区块图)`);
  console.log(JSON.stringify(stat, null, 1));
  if (errors.length) console.log('⚠ ' + errors.slice(0, 6).join('\n⚠ '));
  else console.log('✓ 无控制台报错');
}

await browser.close();