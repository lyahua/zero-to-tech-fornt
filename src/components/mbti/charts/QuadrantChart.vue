<script setup>
/**
 * 世界格局关键变量 · 影响强度 × 类型相关度 气泡矩阵
 * 对应旧页面里的 #quadChart（scatter + markLine + markArea）
 */
import { computed, ref } from 'vue'
import { useChart } from '../../../composables/useEcharts'
import { TCOLOR, priority, quadrantOf } from '../../../data/mbti/meta'

const props = defineProps({
  type: { type: String, required: true },
  vars: { type: Array, required: true },
  split: { type: Object, default: () => ({ i: 76, r: 64 }) },
})

const el = ref(null)
const SI = computed(() => props.split?.i ?? 76)
const SR = computed(() => props.split?.r ?? 64)

const option = computed(() => {
  const splitI = SI.value
  const splitR = SR.value
  const prio = (v) => priority(v)
  const quadOf = (v) => quadrantOf(v, { i: splitI, r: splitR })

  return {
    backgroundColor: 'transparent',
    grid: { left: 70, right: 40, top: 46, bottom: 56 },
    tooltip: {
      formatter(p) {
        const v = props.vars.find((x) => x.n === p.data[2])
        if (!v) return ''
        const tc = TCOLOR[v.t]
        return (
          `<b>${v.n}</b> · <span style="color:${tc.c};font-weight:700;">${tc.label}</span><br>` +
          `影响强度：<b>${v.i}</b> / 100<br>${props.type} 相关度：<b>${v.r}</b> / 100<br>` +
          `综合优先级：<b>${prio(v)}</b><br>` +
          `<span style="color:#6b8074;font-size:12px;max-width:260px;display:inline-block;">${v.note}</span>`
        )
      },
    },
    xAxis: {
      min: 60,
      max: 100,
      name: '影响强度 →',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: '#5a7263', fontWeight: 700, fontSize: 13 },
      axisLine: { lineStyle: { color: '#9fd6ad' } },
      splitLine: { lineStyle: { color: '#e3ede5' } },
      axisLabel: { color: '#41544a' },
    },
    yAxis: {
      min: 35,
      max: 100,
      name: props.type + ' 相关度 →',
      nameLocation: 'end',
      nameTextStyle: { color: '#5a7263', fontWeight: 700, fontSize: 13, align: 'left' },
      axisLine: { lineStyle: { color: '#9fd6ad' } },
      splitLine: { lineStyle: { color: '#e3ede5' } },
      axisLabel: { color: '#41544a' },
    },
    series: [
      {
        type: 'scatter',
        data: props.vars.map((v) => ({
          value: [v.i, v.r, v.n],
          symbolSize: 14 + Math.round(prio(v) * 0.3),
          itemStyle: {
            color: TCOLOR[v.t].c,
            opacity: 0.82,
            borderColor: '#ffffff',
            borderWidth: 1.5,
          },
          label: {
            show: true,
            position: v.lp,
            distance: 6,
            color: '#1f2d22',
            fontSize: 11.5,
            fontWeight: 600,
            formatter: v.n,
          },
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#8aa79c', type: 'dashed', width: 1.5 },
          label: { show: false },
          data: [{ xAxis: splitI }, { yAxis: splitR }],
        },
        markArea: {
          silent: true,
          data: [
            [
              { xAxis: splitI, yAxis: splitR, itemStyle: { color: 'rgba(15,125,119,.09)' },
                label: { show: true, position: 'insideTopRight', color: '#0c5a55', fontWeight: 800, fontSize: 12.5, distance: 8,
                  formatter: '战略核心区 · 必须押注' } },
              { xAxis: 100, yAxis: 100 },
            ],
            [
              { xAxis: 60, yAxis: splitR, itemStyle: { color: 'rgba(27,107,58,.07)' },
                label: { show: true, position: 'insideTopLeft', color: '#1b6b3a', fontWeight: 800, fontSize: 12.5, distance: 8,
                  formatter: '能力杠杆区 · 以小博大' } },
              { xAxis: splitI, yAxis: 100 },
            ],
            [
              { xAxis: splitI, yAxis: 35, itemStyle: { color: 'rgba(122,138,130,.08)' },
                label: { show: true, position: 'insideBottomRight', color: '#5a6a63', fontWeight: 800, fontSize: 12.5, distance: 8,
                  formatter: '环境背景区 · 知道即可' } },
              { xAxis: 100, yAxis: splitR },
            ],
            [
              { xAxis: 60, yAxis: 35, itemStyle: { color: 'rgba(154,90,44,.06)' },
                label: { show: true, position: 'insideBottomLeft', color: '#9a5a2c', fontWeight: 800, fontSize: 12.5, distance: 8,
                  formatter: '观察区 · 低成本跟踪' } },
              { xAxis: splitI, yAxis: splitR },
            ],
          ],
        },
      },
    ],
  }
})

useChart(el, option)

defineExpose({ quadrantOf })
</script>

<template>
  <div ref="el" class="chart chart--quad"></div>
</template>