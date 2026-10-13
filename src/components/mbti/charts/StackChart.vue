<script setup>
/** 认知功能强度（主导 → 劣势），对应旧页面 #stack */
import { computed, ref } from 'vue'
import { useChart } from '../../../composables/useEcharts'

const props = defineProps({
  stack: { type: Array, required: true },
})

const el = ref(null)

const ROLE_RANK = { 主导: 0, 辅助: 1, 第三: 2, 劣势: 3 }
/** 数据是「主导 → 劣势」，图表要「弱 → 强」，让主导落在柱状图顶端 */
const rows = computed(() => [...props.stack].sort((a, b) => (ROLE_RANK[b.role] ?? 9) - (ROLE_RANK[a.role] ?? 9)))
/** 主导最深、劣势最浅 */
const colors = computed(() => {
  const PALETTE = ['#1b6b3a', '#3f8a58', '#7fbf8f', '#c5d79a'] // 主导 → 劣势
  const n = rows.value.length
  return PALETTE.slice(4 - n, 4).reverse() // rows 是弱→强，色段跟着反
})

const option = computed(() => ({
  backgroundColor: 'transparent',
  grid: { left: 130, right: 50, top: 16, bottom: 26 },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter(p) {
      const f = p[0].name.split(' · ')[1]
      const hit = props.stack.find((x) => x.f === f)
      return `<b>${p[0].name}</b> · ${hit?.desc || ''}<br>强度：${p[0].value}/100`
    },
  },
  xAxis: { type: 'value', max: 100, axisLine: { lineStyle: { color: '#9fd6ad' } }, splitLine: { lineStyle: { color: '#e3ede5' } } },
  yAxis: {
    type: 'category',
    data: rows.value.map((x) => x.role + ' · ' + x.f),
    axisLine: { lineStyle: { color: '#9fd6ad' } },
    axisLabel: { color: '#1f2d22', fontWeight: 600 },
  },
  series: [
    {
      type: 'bar',
      barWidth: 18,
      data: rows.value.map((v, i) => ({ value: v.v, itemStyle: { color: colors.value[i] } })),
      label: { show: true, position: 'right', color: '#1f2d22', fontWeight: 700, formatter: '{c}' },
    },
  ],
}))

useChart(el, option)
</script>

<template>
  <div ref="el" class="chart chart--stack"></div>
</template>