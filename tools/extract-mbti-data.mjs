/**
 * 从 public/mbti/*.html 抽取报告数据 → src/data/mbti/<TYPE>.json
 *
 * 为什么要写这个脚本：
 *   16 份 HTML 里 13 份是「const D = {...}」新结构，ENTP / INTP / ISTP 三个是老结构
 *   （swot、worldVars 分散声明，radar/stack/strategy 直接内联在 setOption 里）。
 *   与其手工搬 16 遍，不如让 vm 沙箱把每份页面的脚本跑一遍，把变量和图表 option 一起截获。
 *
 * 用法：node tools/extract-mbti-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const SRC_DIR = path.join(ROOT, 'public/mbti');
const OUT_DIR = path.join(ROOT, 'src/data/mbti');

const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const stripTags = (s) => flat(String(s || '').replace(/<[^>]+>/g, ''));
const unesc = (s) =>
  String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');

function pick(re, src, idx = 1) {
  const m = src.match(re);
  return m ? m[idx] : '';
}

/** 在沙箱里跑页面脚本，截获顶层变量与图表 option */
function runScript(scriptBody) {
  const charts = {};
  const html = {};
  const makeEl = (id) => ({
    id,
    innerHTML: '',
    textContent: '',
    style: {},
    appendChild() {},
    removeChild() {},
    setAttribute() {},
    addEventListener() {},
    querySelector: () => makeEl(id + '>'),
    querySelectorAll: () => []
  });
  const doc = {
    getElementById: (id) => {
      const key = id || 'anon';
      if (!html[key]) html[key] = makeEl(key);
      Object.defineProperty(html[key], 'innerHTML', {
        get: () => html['__' + key] || '',
        set: (v) => (html['__' + key] = v)
      });
      return html[key];
    },
    querySelector: (sel) => {
      const key = 'sel:' + sel;
      if (!html[key]) {
        const el = makeEl(key);
        Object.defineProperty(el, 'innerHTML', {
          get: () => html['__' + key] || '',
          set: (v) => (html['__' + key] = v)
        });
        html[key] = el;
      }
      return html[key];
    },
    querySelectorAll: () => [],
    createElement: () => makeEl('new'),
    addEventListener() {},
    body: makeEl('body'),
    documentElement: makeEl('html'),
    head: makeEl('head')
  };
  const echarts = {
    init: (el) => ({
      setOption: (o) => {
        charts[el && el.id ? el.id : 'chart'] = o;
      },
      resize() {},
      dispose() {},
      on() {},
      getZr: () => ({ on() {}, off() {} })
    }),
    registerTheme() {},
    connect() {},
    graphic: {},
    format: {},
    number: {},
    util: {}
  };
  const sandbox = { document: doc, echarts, console, setTimeout, clearTimeout, Math, Date, JSON };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  vm.createContext(sandbox);
  const probe = `
;globalThis.__OUT__ = {
  type:   typeof D!== 'undefined' ? D.type   : null,
  swot:   typeof D!== 'undefined' ? D.swot   : (typeof swot!== 'undefined' ? swot   : null),
  wv:     typeof D!== 'undefined' ? D.worldVars : (typeof worldVars!=='undefined' ? worldVars : null),
  stack:  typeof D!== 'undefined' ? D.stack  : (typeof stackData!=='undefined' ? stackData : null),
  strat:  typeof D!== 'undefined' ? D.strategy : null,
  radar:  typeof D!== 'undefined' ? D.radar  : null,
  theme:  typeof theme!== 'undefined' ? theme  : null,
  splitI: typeof SPLIT_I!=='undefined' ? SPLIT_I : 76,
  splitR: typeof SPLIT_R!=='undefined' ? SPLIT_R : 64
};`;
  vm.runInContext(scriptBody + probe, sandbox, { timeout: 5000 });
  return { out: sandbox.__OUT__, charts, html };
}

function extract(type) {
  const file = path.join(SRC_DIR, `${type}.html`);
  const src = fs.readFileSync(file, 'utf8');

  const scriptBody = pick(/<script>([\s\S]*?)<\/script>/, src);
  const { out, charts, html } = runScript(scriptBody);

  // ---------- 模板静态文案 ----------
  const alias = unesc(stripTags(pick(/<span class="alias">([\s\S]*?)<\/span>/, src)));
  const quote = unesc(stripTags(pick(/<div class="quote">([\s\S]*?)<\/div>/, src)));
  const dims = [...src.matchAll(/<span class="dim">([^<]*)<\/span>/g)].map((m) => flat(m[1]));
  const desc = unesc(stripTags(pick(/<div class="desc">([\s\S]*?)<\/div>/, src)));
  const footer = unesc(stripTags(pick(/<footer>([\s\S]*?)<\/footer>/, src)));
  const verdictHtml = pick(/一句话终局判断<\/h3>([\s\S]*?)<\/div>/, src);
  const verdict = flat(
    unesc(String(verdictHtml).replace(/<p>/g, '').replace(/<\/p>/g, '').replace(/<br\s*\/?>/gi, ' '))
  );

  // persona 里的四个认知功能卡片（fname / frole / fdesc）
  const funcRows = [...src.matchAll(/<span class="fname">([^<]*)<\/span><span class="frole">([^<]*)<\/span>\s*<div class="fdesc">([^<]*)<\/div>/g)].map((m) => ({
    f: flat(m[1]),
    role: flat(m[2]),
    desc: unesc(flat(m[3]))
  }));

  // 读图指南：四个象限说明
  const guideBlock = pick(/读图指南[\s\S]*?<div class="trend-list">([\s\S]*?)<\/div>\s*<\/div>/, src);
  const guide = [...guideBlock.matchAll(/<h4>([^<]*)<\/h4>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => ({
    title: unesc(stripTags(m[1])),
    text: unesc(flat(stripTags(m[2])))
  }));

  // ---------- 老结构补齐：radar / stack / strategy ----------
  let radar = out.radar;
  if (!radar && charts.radar) radar = charts.radar.series?.[0]?.data?.[0]?.value || null;

  let stack = out.stack;
  if (!stack && charts.stack) {
    const cats = charts.stack.yAxis?.data || [];
    const vals = (charts.stack.series?.[0]?.data || []).map((d) => (typeof d === 'object' ? d.value : d));
    const fMap = Object.fromEntries(funcRows.map((f) => [f.f, f]));
    stack = cats.map((c, i) => {
      const [role, f] = String(c).split(' · ');
      return { f, role: role || '', v: vals[i], desc: fMap[f]?.desc || '' };
    });
  }
  if (stack) {
    // 老结构（ENTP/INTP/ISTP）的 yAxis.data 是反序的，新结构是正序 —— 统一成「主导 → 劣势」
    const rank = { 主导: 0, 辅助: 1, 第三: 2, 劣势: 3 };
    stack = stack
      .map((s) => ({ f: s.f, v: s.v, role: s.role, desc: s.desc }))
      .sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9));
  }

  let strategy = out.strat;
  if (!strategy) {
    const raw = html['__strategy'] || '';
    strategy = [...raw.matchAll(/<div class="st ([^"]+)"><h4>([^<]*)<\/h4><p>([^<]*)<\/p>/g)].map((m) => ({
      c: m[1],
      n: unesc(flat(m[2])),
      t: unesc(flat(m[3]))
    }));
  }

  const data = {
    type,
    theme: out.theme || '#1b6b3a',
    persona: { alias, quote, dims, desc, funcs: funcRows },
    swot: out.swot,
    worldVars: out.wv,
    split: { i: out.splitI, r: out.splitR },
    radar,
    stack,
    strategy,
    guide,
    verdict,
    footer
  };

  // 完整性校验
  const problems = [];
  ['swot.S', 'swot.W', 'swot.O', 'swot.T'].forEach((k) => {
    if (!out.swot || !out.swot[k.split('.')[1]]) problems.push('缺 ' + k);
  });
  if (!data.worldVars?.length) problems.push('缺 worldVars');
  if (!data.radar?.length) problems.push('缺 radar');
  if (!data.stack?.length) problems.push('缺 stack');
  if (!data.strategy?.length) problems.push('缺 strategy');
  if (data.persona.dims.length !== 4) problems.push('dims=' + data.persona.dims.length);
  if (!funcRows.length) problems.push('缺 funcRows');
  if (!guide.length) problems.push('缺 guide');
  if (!verdict) problems.push('缺 verdict');
  return { data, problems };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const types = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', '')).sort();
const index = [];

for (const type of types) {
  const { data, problems } = extract(type);
  fs.writeFileSync(path.join(OUT_DIR, `${type}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
  const size = fs.statSync(path.join(OUT_DIR, `${type}.json`)).size;
  index.push({
    type,
    theme: data.theme,
    vars: data.worldVars.length,
    swot: ['S', 'W', 'O', 'T'].map((k) => data.swot[k].length),
    radar: data.radar.length,
    stack: data.stack.length,
    strategy: data.strategy.length
  });
  console.log(
    `${problems.length ? 'WARN' : ' OK '} ${type.padEnd(5)} ${String(size).padStart(6)}B  vars=${data.worldVars.length} swot=${['S', 'W', 'O', 'T']
      .map((k) => data.swot[k].length)
      .join('/')} radar=${data.radar.length} stack=${data.stack.length} strategy=${data.strategy.length}` +
      (problems.length ? '\n      -> ' + problems.join('; ') : '')
  );
}

fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`\n共 ${types.length} 个类型 → ${OUT_DIR}`);