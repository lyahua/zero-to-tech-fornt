/**
 * ECharts 按需引入 + 图表生命周期 composable
 *
 * 为什么按需：整包 echarts 约 1MB(gzip ~330KB)，而报告只用 scatter / radar / bar 三种图，
 * 注册对应的 chart + component 后整包能降到 300KB 左右。
 *
 * 为什么还要这个 composable：
 *   1) init / resize / dispose 三件事散在组件里最容易漏，尤其是切类型时；
 *   2) 用 ResizeObserver 而不是 window.resize —— 报告容器带 CSS transform 缩放
 *      且在沉浸模式/折叠面板下尺寸会变，window.resize 监听不到；
 *   3) 容器不可见（display:none）时 init 会得到 0 宽，必须延后。
 */
import * as echarts from 'echarts/core'
import { BarChart, RadarChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount, onMounted, unref, watch } from 'vue'

echarts.use([
  ScatterChart,
  RadarChart,
  BarChart,
  GridComponent,
  RadarComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  CanvasRenderer,
])

export { echarts }

/**
 * @param {import('vue').Ref<HTMLElement|null>} elRef 图表容器
 * @param {import('vue').Ref<object|null>|(()=>object|null)} option 图表配置（ref / computed / getter）
 */
export function useChart(elRef, option) {
  let chart = null
  let observer = null
  let visible = false

  const apply = () => {
    const opt = typeof option === 'function' ? option() : unref(option)
    if (!chart || !opt) return
    chart.setOption(opt, { notMerge: true })
  }

  const resize = () => {
    if (!chart || !elRef.value) return
    const { width, height } = elRef.value.getBoundingClientRect()
    if (width < 2 || height < 2) return // 容器不可见时别 resize，避免 echarts 警告
    chart.resize()
  }

  onMounted(() => {
    const el = elRef.value
    if (!el) return
    chart = echarts.init(el)
    visible = true
    apply()
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resize)
      observer.observe(el)
    }
  })

  onBeforeUnmount(() => {
    visible = false
    observer?.disconnect()
    observer = null
    chart?.dispose()
    chart = null
  })

  if (typeof option !== 'function') watch(option, apply)

  return {
    resize,
    getChart: () => chart,
    isReady: () => visible && !!chart,
  }
}