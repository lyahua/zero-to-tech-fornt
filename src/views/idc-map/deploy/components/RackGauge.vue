<template>
    <div class="rack-gauge">
        <div class="panel__title">机房容量</div>
        <div ref="chartEl" class="rack-gauge__canvas" />
    </div>
</template>

<script setup lang="ts">
/** U 位占用与功率负载双仪表，阈值配色与告警口径一致 */
import { brandAlpha, CANVAS } from '@/api/idc/palette';
import { useEchart } from '@/javascript/hooks/useEchart';

const props = defineProps<{ uPct: number; loadPct: number }>();

const chartEl = ref<HTMLElement>();
const { setOption } = useEchart(chartEl);

const gaugeColor = (v: number) => (v >= 90 ? '#ef4444' : v >= 75 ? '#eab308' : '#22c55e');

function render() {
    const base = {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: '82%',
        progress: { show: true, width: 10, roundCap: true },
        axisLine: { lineStyle: { width: 10, color: [[1, '#1e293b']] } },
        // 刻度画在 axisLine 外侧：内环已被阈值色占满，只有外圈是纯装饰区
        axisTick: { show: true, distance: 4, length: 3, lineStyle: { color: brandAlpha(0.5), width: 1 } },
        splitLine: { show: true, distance: 4, length: 7, lineStyle: { color: brandAlpha(0.9), width: 2 } },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { offsetCenter: [0, '32%'], color: CANVAS.textDim, fontSize: 11 },
        detail: {
            offsetCenter: [0, -4],
            color: CANVAS.text,
            fontSize: 16,
            fontWeight: 600,
            formatter: '{value}%',
        },
    };

    setOption({
        series: [
            {
                id: 'u',
                ...base,
                center: ['27%', '52%'],
                data: [{ value: props.uPct, name: 'U 位占用' }],
                progress: { show: true, width: 10, roundCap: true, itemStyle: { color: gaugeColor(props.uPct) } },
                detail: { ...base.detail, color: gaugeColor(props.uPct) },
            },
            {
                id: 'power',
                ...base,
                center: ['73%', '52%'],
                data: [{ value: props.loadPct, name: '功率负载' }],
                progress: {
                    show: true,
                    width: 10,
                    roundCap: true,
                    itemStyle: { color: gaugeColor(props.loadPct) },
                },
                detail: { ...base.detail, color: gaugeColor(props.loadPct) },
            },
        ],
    });
}

watch(() => [props.uPct, props.loadPct], render, { immediate: true });
onMounted(render);
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.rack-gauge {
    .idc-panel();

    &__canvas {
        height: 140px;
    }
}
</style>
