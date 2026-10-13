<script setup>
/**
 * MBTI SWOT 报告主体 —— 取代原来 public/mbti/*.html 的 iframe
 *
 * 16 份 HTML 原本各自内联一份 <style> 和一份 echarts 初始化脚本；
 * 现在样式合并到 styles/mbti-report.css，数据在 src/data/mbti/*.json，
 * 三张图由 charts/ 下的组件按需引入 echarts 绘制。
 */
import { computed, ref, watch } from 'vue'
import QuadrantChart from './charts/QuadrantChart.vue'
import RadarChart from './charts/RadarChart.vue'
import StackChart from './charts/StackChart.vue'
import { loadReport } from '../../data/mbti'
import {
  PROB_LABEL,
  QUAD_META,
  SWOT_NAMES,
  SWOT_ORDER,
  T_COLOR_ORDER,
  TCOLOR,
  priority,
  quadrantOf,
} from '../../data/mbti/meta'
import '../../styles/mbti-report.css'

const props = defineProps({
  type: { type: String, required: true },
})

const emit = defineEmits(['ready', 'error'])

const report = ref(null)
const errorMsg = ref('')

async function load(type) {
  errorMsg.value = ''
  try {
    const data = await loadReport(type)
    report.value = data
    emit('ready', data)
  } catch (e) {
    errorMsg.value = e?.message || '报告数据加载失败'
    report.value = null
    emit('error', e)
  }
}
watch(() => props.type, load, { immediate: true })

/* ---------- 派生数据 ---------- */
const themeStyle = computed(() => (report.value ? { '--theme': report.value.theme } : {}))

const swotGroups = computed(() =>
  SWOT_ORDER.map((k) => ({ key: k, name: SWOT_NAMES[k], items: report.value?.swot?.[k] || [] }))
)

const quadGroups = computed(() => {
  if (!report.value) return []
  const split = report.value.split || { i: 76, r: 64 }
  return QUAD_META.map((m) => ({
    ...m,
    items: report.value.worldVars.filter((v) => quadrantOf(v, split).key === m.key),
  }))
})

const varRows = computed(() =>
  [...(report.value?.worldVars || [])].sort((a, b) => priority(b) - priority(a))
)

const trends = computed(() =>
  [...(report.value?.swot?.O || []), ...(report.value?.swot?.T || [])].filter((x) => x.p !== 'lo')
)

const guide = computed(() => report.value?.guide || [])
const persona = computed(() => report.value?.persona || null)

function quadOf(v) {
  return quadrantOf(v, report.value?.split || { i: 76, r: 64 })
}
</script>

<template>
  <div class="mbti-report" :style="themeStyle">
    <div v-if="errorMsg" class="report-error">{{ errorMsg }}</div>

    <div v-else-if="!report" class="report-loading">
      <span class="report-spinner"></span>
      <span>{{ type }} 报告加载中…</span>
    </div>

    <div v-else class="mbti-report__wrap">
      <!-- ==================== 页头 ==================== -->
      <header class="page-head">
        <span class="kicker">{{ report.type }}</span>
        <h1>个人能力 &amp; 世界格局 · SWOT 高可能性可视化</h1>
        <p class="sub">
          “高可能性 / 大概率” = 2025–2030 周期里最可能成真的路径判断 · 世界格局关键变量按
          <b>影响强度 × {{ report.type }} 相关度</b> 双维度定位
        </p>
      </header>

      <!-- ==================== SWOT 四象限 ==================== -->
      <section class="swot-section">
        <div class="swot-title">
          <h3>{{ report.type }} · SWOT 四象限</h3>
          <span class="sub">每条带概率徽章（高/中/低）+ ↳ 大概率成真的世界格局锚点</span>
        </div>
        <div class="axes-hint">
          <span>← 内部 · 个人能力</span>
          <span>外部 · 世界格局 →</span>
        </div>
        <div class="matrix">
          <div v-for="g in swotGroups" :key="g.key" class="q" :class="g.key.toLowerCase()">
            <h4>{{ g.name }} <span class="en">{{ g.key }}</span></h4>
            <ul>
              <li v-for="(it, i) in g.items" :key="i">
                {{ it.t }}<span class="prob" :class="it.p">● {{ PROB_LABEL[it.p] }}</span>
                <span class="why">↳ {{ it.why }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ==================== 世界格局矩阵 ==================== -->
      <section class="world-section">
        <div class="swot-title">
          <h3>世界格局关键变量 · 影响强度 × {{ report.type }} 相关度矩阵</h3>
          <span class="sub">
            2025–2030 · 横轴=对世界/职业环境的改变力度 · 纵轴=与 {{ report.type }}
            优势/短板的关联紧密度 · 气泡大小=综合优先级
          </span>
        </div>

        <div class="card">
          <div class="legend-chips">
            <span v-for="k in T_COLOR_ORDER" :key="k" class="chip" :class="k">● {{ TCOLOR[k].label }}</span>
          </div>
          <QuadrantChart :key="'q-' + report.type" :type="report.type" :vars="report.worldVars" :split="report.split" />
        </div>

        <div class="quad-grid">
          <div v-for="q in quadGroups" :key="q.key" class="qc" :class="q.key">
            <h4>{{ q.name }}（{{ q.items.length }} 项）</h4>
            <div class="cond">{{ q.cond }}</div>
            <div class="items">
              <template v-for="(it, i) in q.items" :key="it.n">
                <br v-if="i" />{{ it.n }}
              </template>
            </div>
            <div class="act">↳ {{ q.act }}</div>
          </div>
        </div>

        <table class="vars">
          <thead>
            <tr>
              <th>关键变量</th>
              <th>属性</th>
              <th>影响强度</th>
              <th>{{ report.type }} 相关度</th>
              <th>优先级</th>
              <th>象限</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in varRows" :key="v.n">
              <td class="vname">{{ v.n }}</td>
              <td><span class="badge" :class="v.t">{{ TCOLOR[v.t].label }}</span></td>
              <td>
                <div class="mini">
                  <div class="track"><div class="fill" :style="{ width: v.i + '%', background: TCOLOR[v.t].c }"></div></div>
                  <span class="num">{{ v.i }}</span>
                </div>
              </td>
              <td>
                <div class="mini">
                  <div class="track"><div class="fill" :style="{ width: v.r + '%', background: '#0f7d77' }"></div></div>
                  <span class="num">{{ v.r }}</span>
                </div>
              </td>
              <td class="pri">{{ priority(v) }}</td>
              <td class="quad-tag">{{ quadOf(v).name }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ==================== 趋势 / 读图指南 ==================== -->
      <section class="world">
        <div class="card">
          <h3>高可能性 / 大概率趋势 <span class="tag">{{ report.type }} 视角 · 机会与威胁</span></h3>
          <div class="trend-list">
            <div v-for="(t, i) in trends" :key="i" class="trend">
              <h4>{{ t.t }}<span class="prob" :class="t.p">● {{ PROB_LABEL[t.p] }}</span></h4>
              <p>{{ t.why }}</p>
              <div class="bar">
                <div :style="{ width: t.w + '%', background: t.p === 'hi' ? 'var(--hi)' : 'var(--md)' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>读图指南 <span class="tag">怎么用这张矩阵</span></h3>
          <div class="trend-list">
            <div v-for="(g, i) in guide" :key="i" class="trend">
              <h4>{{ g.title }}</h4>
              <p>{{ g.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 战略 ==================== -->
      <section class="swot-section">
        <div class="swot-title"><h3>从 SWOT 到行动 · 四类战略</h3></div>
        <div class="strategy">
          <div v-for="(s, i) in report.strategy" :key="i" class="st" :class="s.c">
            <h4>{{ s.n }}</h4>
            <p>{{ s.t }}</p>
          </div>
        </div>
      </section>

      <!-- ==================== 终局判断 ==================== -->
      <section class="verdict">
        <h3>一句话终局判断</h3>
        <p v-html="report.verdict"></p>
      </section>

      <!-- ==================== 人格概要 ==================== -->
      <section v-if="persona" class="persona">
        <div class="head">
          <h2>{{ report.type }}</h2>
          <span class="alias">{{ persona.alias }}</span>
        </div>
        <div class="quote">{{ persona.quote }}</div>
        <div class="dim-row">
          <span v-for="(d, i) in persona.dims" :key="i" class="dim">{{ d }}</span>
        </div>
        <div class="desc">{{ persona.desc }}</div>
        <div class="func-row">
          <div v-for="(f, i) in persona.funcs" :key="i" class="func">
            <span class="fname">{{ f.f }}</span><span class="frole">{{ f.role }}</span>
            <div class="fdesc">{{ f.desc }}</div>
          </div>
        </div>
      </section>

      <!-- ==================== 能力图表 ==================== -->
      <section class="chart-grid">
        <div class="card">
          <h3>8 维能力倾向 <span class="tag">雷达</span></h3>
          <RadarChart :key="'r-' + report.type" :type="report.type" :theme="report.theme" :values="report.radar" />
        </div>
        <div class="card">
          <h3>认知功能强度 <span class="tag">主导 → 劣势</span></h3>
          <StackChart :key="'s-' + report.type" :stack="report.stack" />
        </div>
      </section>

      <footer class="report-foot">{{ report.footer }}</footer>
    </div>
  </div>
</template>

<style scoped>
.report-loading,
.report-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 0;
  color: #5a7263;
  font-size: 14px;
}
.report-error {
  color: #9a5a2c;
}
.report-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #cfe0d3;
  border-top-color: #1b6b3a;
  border-radius: 50%;
  animation: report-spin 0.8s linear infinite;
}
@keyframes report-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>