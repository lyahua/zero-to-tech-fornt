/**
 * 交互冒烟：切类型 / 缩放 / 沉浸，确认重构后 Vue 层交互正常
 * 用法：node tools/smoke-mbti.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const base = process.argv[2] || 'http://localhost:4174';

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

const ok = (c, msg) => console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`);

await page.goto(base + '/?type=INTJ', { waitUntil: 'networkidle' });
await page.waitForSelector('.report-foot');
ok((await page.textContent('.kicker')).trim() === 'INTJ', '首屏类型 = INTJ');

// ---- 切类型：点 ESFP 芯片 ----
await page.click('.type-chip[title^="ESFP"]');
await page.waitForFunction(() => document.querySelector('.kicker')?.textContent.trim() === 'ESFP', null, { timeout: 8000 });
await page.waitForTimeout(700);
const after = await page.evaluate(() => {
  const c = document.querySelector('.chart--quad canvas');
  return {
    kicker: document.querySelector('.kicker')?.textContent.trim(),
    swot: document.querySelectorAll('.matrix .q li').length,
    canvas: c ? c.width + 'x' + c.height : 'none',
    url: location.search,
    heading: document.querySelector('.swot-title h3')?.textContent.trim(),
  };
});
ok(after.kicker === 'ESFP', '切换后面包屑更新为 ESFP');
ok(after.url.includes('type=ESFP'), 'URL 深链同步 ?type=ESFP');
ok(after.canvas !== 'none', '气泡图重绘 canvas=' + after.canvas);
ok(/ESFP/.test(after.heading || ''), '区块标题带类型名：' + after.heading);
ok(after.swot >= 16, 'SWOT 条目重渲染 ' + after.swot + ' 条');

// ---- 键盘方向键 ----
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(600);
const next = await page.evaluate(() => document.querySelector('.kicker')?.textContent.trim());
ok(next && next !== 'ESFP', '方向键切换类型 → ' + next);

// ---- 缩放（写 localStorage 后刷新）----
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mbti_settings') || '{}');
  s.zoom = 1.25;
  localStorage.setItem('mbti_settings', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const zoomed = await page.evaluate(() => {
  const s = document.querySelector('.report-scaler');
  return { transform: getComputedStyle(s).transform, width: s.style.width };
});
ok(zoomed.transform.includes('1.25'), '缩放生效 transform=' + zoomed.transform + ' width=' + zoomed.width);

// ---- 沉浸模式 ----
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mbti_settings') || '{}');
  s.zoom = 1;
  s.immersive = true;
  localStorage.setItem('mbti_settings', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const immersive = await page.evaluate(() => ({
  header: getComputedStyle(document.querySelector('.mbti-header')).display,
  exit: !!document.querySelector('.exit-float'),
  canvas: document.querySelector('.chart--radar canvas')?.width || 0,
}));
ok(immersive.header === 'none', '沉浸模式隐藏导航');
ok(immersive.exit, '沉浸模式显示退出按钮');
ok(immersive.canvas > 100, '沉浸模式图表仍有尺寸 ' + immersive.canvas);

console.log(errs.length ? '\n控制台报错:\n' + errs.slice(0, 8).join('\n') : '\n✓ 全程无控制台报错');
await browser.close();