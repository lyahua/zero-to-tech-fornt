/**
 * 滚动行为专项验证：PC 滚轮 / 切类型归位 / H5 表格内滑动 / 键盘滚动
 * 用法：node tools/test-scroll.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const base = process.argv[2] || 'http://localhost:4175';
const OUT = path.resolve('screenshots');
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
const ok = (c, msg) => {
  if (!c) fails++;
  console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`);
};

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

/* ==================== PC ==================== */
const pc = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await pc.newPage();
await p.goto(base + '/?type=INTJ', { waitUntil: 'networkidle' });
await p.waitForSelector('.report-foot');
await p.waitForTimeout(600);

// 1. 滚轮能滚
await p.mouse.move(700, 500);
await p.mouse.wheel(0, 1200);
await p.waitForTimeout(400);
const s1 = await p.evaluate(() => {
  const w = document.querySelector('.report-wrap');
  return { top: w.scrollTop, scrolled: w.classList.contains('scrolled') };
});
ok(s1.top > 800, `PC 滚轮可滚动 scrollTop=${Math.round(s1.top)}`);
ok(s1.scrolled, '滚动后进入 scrolled 状态（阴影反馈）');

// 2. 滚到底能看到图表区
await p.evaluate(() => {
  const w = document.querySelector('.report-wrap');
  w.scrollTop = w.scrollHeight;
});
await p.waitForTimeout(500);
const bottom = await p.evaluate(() => {
  const w = document.querySelector('.report-wrap');
  const chart = document.querySelector('.chart-grid');
  const r = chart.getBoundingClientRect();
  const wr = w.getBoundingClientRect();
  return {
    atBottom: Math.abs(w.scrollTop + w.clientHeight - w.scrollHeight) < 4,
    chartVisible: r.top >= wr.top - 2 && r.bottom <= wr.bottom + 2,
    canvas: !!document.querySelector('.chart--radar canvas'),
  };
});
ok(bottom.atBottom, '可滚动到底部');
ok(bottom.chartVisible, '滚到底后图表区完整可见');
ok(bottom.canvas, '底部图表仍正常渲染');
await p.screenshot({ path: path.join(OUT, 'scroll-pc-bottom.png') });

// 3. 切类型回到顶部
await p.mouse.move(700, 300);
await p.mouse.wheel(0, -4000);
await p.waitForTimeout(400);
await p.click('.type-chip[title^="ESFJ"]');
await p.waitForTimeout(900);
const after = await p.evaluate(() => ({
  top: document.querySelector('.report-wrap').scrollTop,
  kicker: document.querySelector('.kicker')?.textContent.trim(),
  scrolled: document.querySelector('.report-wrap').classList.contains('scrolled'),
}));
ok(after.kicker === 'ESFJ', '切类型成功 → ' + after.kicker);
ok(after.top === 0, `切类型后滚动归零 scrollTop=${after.top}`);
ok(!after.scrolled, '切类型后 scrolled 状态复位');

// 4. 键盘滚动（报告区可聚焦）
await p.evaluate(() => document.querySelector('.report-wrap').focus());
await p.keyboard.press('PageDown');
await p.waitForTimeout(350);
const kb = await p.evaluate(() => document.querySelector('.report-wrap').scrollTop);
ok(kb > 100, `键盘 PageDown 可滚动 scrollTop=${Math.round(kb)}`);

// 5. 滚动条样式（PC 细滚动条，不吃 15px+ 的系统默认宽度）
const bar = await p.evaluate(() => {
  const w = document.querySelector('.report-wrap');
  const cs = getComputedStyle(w);
  return { gutter: cs.scrollbarGutter, w: cs.scrollbarWidth, color: cs.scrollbarColor, overscroll: cs.overscrollBehavior };
});
ok(bar.gutter === 'stable', `scrollbar-gutter=${bar.gutter}（滚动条占位，内容不跳动）`);
ok(bar.w === 'thin', `scrollbar-width=${bar.w}`);
ok(/contain/.test(bar.overscroll), `overscroll-behavior=${bar.overscroll}（防滚动穿透）`);

// 6. 缩放 1.25 后滚动仍正常
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('mbti_settings') || '{}');
  s.zoom = 1.25;
  localStorage.setItem('mbti_settings', JSON.stringify(s));
});
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.mouse.move(700, 500);
await p.mouse.wheel(0, 900);
await p.waitForTimeout(350);
const zoomed = await p.evaluate(() => document.querySelector('.report-wrap').scrollTop);
ok(zoomed > 300, `缩放 1.25 后滚动正常 scrollTop=${Math.round(zoomed)}`);
await p.screenshot({ path: path.join(OUT, 'scroll-pc-zoom125.png') });
await pc.close();

/* ==================== H5 ==================== */
const h5 = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const m = await h5.newPage();
await m.goto(base + '/?type=INTJ', { waitUntil: 'networkidle' });
await m.waitForSelector('.report-foot');
await m.waitForTimeout(600);

// 1. 纵向滚动保留
await m.evaluate(() => {
  const w = document.querySelector('.report-wrap');
  w.scrollTop = 900;
});
await m.waitForTimeout(300);
const mv = await m.evaluate(() => document.querySelector('.report-wrap').scrollTop);
ok(mv > 700, `H5 纵向滚动保留 scrollTop=${Math.round(mv)}`);

// 2. 整页不可横向拖动
const noHScroll = await m.evaluate(() => {
  const w = document.querySelector('.report-wrap');
  return { wrapX: w.scrollLeft, docX: document.documentElement.scrollLeft, canX: w.scrollWidth <= w.clientWidth + 1 };
});
ok(noHScroll.canX, `H5 报告区无横向溢出（scrollWidth=${noHScroll.canX}）`);

// 3. 表格在自身容器内横向滑动
await m.evaluate(() => {
  document.querySelector('.table-scroll').scrollIntoView({ block: 'center' });
});
await m.waitForTimeout(400);
const tbl = await m.evaluate(() => {
  const box = document.querySelector('.table-scroll');
  const can = box.scrollWidth > box.clientWidth + 2;
  box.scrollLeft = 999;
  return { can, moved: box.scrollLeft, tipVisible: getComputedStyle(document.querySelector('.scroll-tip')).display !== 'none' };
});
ok(tbl.can, 'H5 表格容器可横向滑动');
ok(tbl.moved > 100, `表格内滑动生效 scrollLeft=${Math.round(tbl.moved)}`);
ok(tbl.tipVisible, '显示「左右滑动」提示');
await m.screenshot({ path: path.join(OUT, 'scroll-h5-table.png') });

// 4. H5 首屏样式未被破坏
await m.evaluate(() => (document.querySelector('.report-wrap').scrollTop = 0));
await m.waitForTimeout(300);
const style = await m.evaluate(() => {
  const hd = document.querySelector('.mbti-header');
  const chip = document.querySelector('.type-chip');
  const q = document.querySelector('.matrix .q');
  return {
    headerH: hd.offsetHeight,
    headerBg: getComputedStyle(hd).backgroundImage.includes('gradient'),
    chipDisplay: getComputedStyle(chip).display,
    qCols: getComputedStyle(document.querySelector('.matrix')).gridTemplateColumns,
    qVisible: !!q && q.getBoundingClientRect().height > 50,
    appHeight: document.querySelector('.mbti-app').offsetHeight,
    winHeight: window.innerHeight,
  };
});
ok(style.headerH === 45, `H5 顶栏高度保持 ${style.headerH}px`);
ok(style.headerBg, 'H5 顶栏渐变保持');
ok(style.qVisible, 'H5 SWOT 卡片正常');
ok(style.qCols.split(' ').length === 2, 'H5 SWOT 保持两列布局');
ok(style.appHeight === style.winHeight, `H5 应用高度贴合视口 ${style.appHeight}=${style.winHeight}`);

console.log(fails === 0 ? '\n✓ 全部通过' : `\n✗ ${fails} 项失败`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);