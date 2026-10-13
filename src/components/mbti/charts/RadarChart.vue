<script setup>
/** 8 维能力倾向雷达图（对应旧页面 #radar） */
import { computed, ref } from 'vue'
import { useChart } from '../../../composables/useEcharts'
import { RADAR_LABELS } from '../../../data/mbti/meta'

const props = defineProps({
  type: { type: String, required: true },
  theme: { type: String, default: '#1b6b3a' },
  values: { type: Array, required: true },
})

const el = ref(null)

const option = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {},
  radar: {
    indicator: RADAR_LABELS.map((n) => ({ name: n, max: 100 })),
    shape: 'polygon',
    splitNumber: 4,
    axisName: { color: '#1f2d22', fontSize: 12, fontWeight: 600 },
    splitLine: { lineStyle: { color: '#bcd8c2' } },
    splitArea: { areaStyle: { color: ['#f7fbf8', '#eef6f0'] } },
    axisLine: { lineStyle: { color: '#9fd6ad' } },
  },
  series: [
    {
      type: 'radar',
      data: [
        {
          value: props.values,
          name: props.type,
          lineStyle: { color: props.theme, width: 2.5 },
          areaStyle: { color: props.theme, opacity: 0.28 },
          itemStyle: { color: props.theme },
          label: { show: true, color: '#1b3a26', fontSize: 11 },
        },
      ],
    },
  ],
}))

useChart(el, option)
</script>

<template>
  <div ref="el" class="chart chart--radar"></div>
</template>