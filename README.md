# MBTI · SWOT 高可能性可视化

16 型人格的个人能力 / 世界格局 SWOT 报告。Vue 3 + Vite + ECharts 5。

## 快速开始

```sh
npm install
npm run dev        # 开发
npm run build      # 生产构建
npm run preview    # 预览产物
```

首页即报告页，路由 `/?type=INTJ` 指定类型；支持 ← → 切换类型、`S` 折叠选型面板、`F` 沉浸模式、`Esc` 退出。

## 目录结构

```
src/
├─ views/HomeView.vue              壳层：顶部导航、16 型面板、缩放、沉浸模式
├─ components/mbti/
│  ├─ MbtiReport.vue               报告主体（取代原来的 16 份 HTML）
│  └─ charts/
│     ├─ QuadrantChart.vue         影响强度 × 相关度 气泡矩阵
│     ├─ RadarChart.vue            8 维能力雷达
│     └─ StackChart.vue            认知功能强度
├─ composables/useEcharts.js       echarts 按需引入 + init/resize/dispose 生命周期
├─ data/mbti/
│  ├─ meta.js                      16 型元信息、配色、雷达维度、象限定义
│  ├─ index.js                     import.meta.glob 按需加载 JSON
│  └─ <TYPE>.json × 16             报告数据
└─ styles/mbti-report.css          16 份页面样式合并后的唯一来源

tools/
├─ extract-mbti-data.mjs           从旧 HTML 抽取数据 → JSON（仅在改数据时用）
├─ shoot-mbti.mjs                  用本机 Edge 逐区块截图
└─ smoke-mbti.mjs                  交互冒烟：切类型 / 缩放 / 沉浸
```

## 几个关键约定

**数据来源**　`src/data/mbti/*.json` 是由 `tools/extract-mbti-data.mjs` 从历史 HTML 抽出来的。
脚本用 `vm` 沙箱跑一遍页面脚本，截获顶层变量与 `echarts.setOption` 的 option，
因此新老两种页面结构（新结构 `const D = {...}`，老结构变量分散声明）都能统一处理。
它是**一次性迁移工具**，平时改内容直接编辑 JSON，不用跑这个脚本；保留是为了以后还能追溯。

**样式作用域**　CSS 变量挂在 `.mbti-report` 而不是 `:root`。
早期每份 HTML 是独立文档，`:root` 互不干扰；并入主应用后挂 `:root` 会污染整站。

**ECharts 按需引入**　只注册 Scatter / Radar / Bar + Grid / Radar / Tooltip / MarkLine / MarkArea + Canvas，
整包从 ~1MB 降到 ~300KB。`useChart` 用 ResizeObserver 而非 `window.resize`
——报告容器带 CSS transform 缩放，且可能因沉浸模式处于 0 宽（不可见），这时跳过 resize。

**不要改回 iframe**　早期方案是 `public/mbti/*.html` + iframe 加载，CDN 不可用时
`echarts is not defined` 会把整个渲染脚本带崩（表格、象限卡一起消失），现已改为组件渲染 + npm 依赖。

## 验证工具

依赖本机 Edge（`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`），不额外下载 Chromium。

```sh
npm run preview                                                   # 另开一个终端
npm run shoot:mbti -- http://localhost:4173 INTJ ENTP            # 截图到 screenshots/
npm run smoke:mbti -- http://localhost:4173                      # 11 项交互断言
```

---

测试自动推送
改了服务器配置