<template>
    <div class="rank-panel">
        <div class="panel__title">机房机柜规模</div>
        <div ref="chartEl" class="rank-panel__canvas" />
    </div>
</template>

<script setup lang="ts">
/** 机房机柜规模横向条形榜，同时用颜色标出该机房的状态 */
import type { Site } from '@/api/idc';
import { CANVAS, STATUS_COLOR } from '@/api/idc/palette';
import { useEchart } from '@/javascript/hooks/useEchart';

const props = defineProps<{ sites: Site[] }>();

const chartEl = ref<HTMLElement>();
const { setOption } = useEchart(chartEl);

function render() {
    const rows = props.sites
        .flatMap(s => s.rooms.map(r => ({ ...r, siteName: s.name })))
        .sort((a, b) => a.rackTotal - b.rackTotal);

    setOption({
        grid: { left: 96, right: 40, top: 8, bottom: 8 },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(17,26,46,.94)',
            borderColor: CANVAS.border,
            textStyle: { color: CANVAS.text, fontSize: 12 },
        },
        xAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#1b2740' } },
            axisLabel: { color: CANVAS.textDim, fontSize: 10 },
        },
        yAxis: {
            type: 'category',
            data: rows.map(r => r.name),
            axisLine: { lineStyle: { color: '#1e293b' } },
            axisTick: { show: false },
            axisLabel: { color: CANVAS.text, fontSize: 11 },
        },
        series: [
            {
                id: 'rack-total',
                type: 'bar',
                barWidth: 12,
                itemStyle: {
                    borderRadius: [0, 4, 4, 0],
                    color: (p: any) => STATUS_COLOR[rows[p.dataIndex].status],
                },
                label: { show: true, position: 'right', color: CANVAS.text, fontSize: 11 },
                data: rows.map(r => r.rackTotal),
            },
        ],
    });
}

watch(() => props.sites, render, { deep: true, immediate: true });
onMounted(render);
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.rank-panel {
    &__canvas {
        height: 168px;
    }
}
</style>
