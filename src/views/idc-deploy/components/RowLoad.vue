<template>
    <div class="row-load">
        <div class="panel__title">排列负载与温度</div>
        <div ref="chartEl" class="row-load__canvas" />
    </div>
</template>

<script setup lang="ts">
/**
 * 按排列聚合的负载率与进风温度
 *
 * 用柱+折线双轴：柱子看哪一排快撑满，折线看温度是否跟着抬升，
 * 两者同时高的排列就是需要优先扩容/整风的排列。
 */
import type { Rack } from '@/api/idc';
import { CANVAS } from '@/api/idc/palette';
import { useEchart } from '@/javascript/hooks/useEchart';

const props = defineProps<{ racks: Rack[] }>();

const chartEl = ref<HTMLElement>();
const { setOption } = useEchart(chartEl);

function render() {
    const rows = new Map<string, { load: number[]; temp: number[] }>();
    props.racks.forEach(r => {
        if (r.status === 'offline') return;
        const bucket = rows.get(r.row) ?? { load: [], temp: [] };
        bucket.load.push(r.loadPct);
        bucket.temp.push(r.tempIn);
        rows.set(r.row, bucket);
    });

    const names = [...rows.keys()].sort();
    const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0);

    setOption({
        grid: { left: 34, right: 34, top: 26, bottom: 22 },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(17,26,46,.94)',
            borderColor: CANVAS.border,
            textStyle: { color: CANVAS.text, fontSize: 12 },
        },
        legend: {
            top: 0,
            right: 0,
            itemWidth: 10,
            itemHeight: 8,
            textStyle: { color: CANVAS.textDim, fontSize: 11 },
            data: ['平均负载率', '平均进风温度'],
        },
        xAxis: {
            type: 'category',
            data: names.map(n => `${n} 排`),
            axisLine: { lineStyle: { color: CANVAS.border } },
            axisTick: { show: false },
            axisLabel: { color: CANVAS.text, fontSize: 11 },
        },
        yAxis: [
            {
                type: 'value',
                max: 100,
                axisLabel: { color: CANVAS.textDim, fontSize: 10, formatter: '{value}%' },
                splitLine: { lineStyle: { color: '#1b2740' } },
            },
            {
                type: 'value',
                min: 18,
                max: 34,
                axisLabel: { color: CANVAS.textDim, fontSize: 10, formatter: '{value}℃' },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                id: 'load',
                name: '平均负载率',
                type: 'bar',
                barWidth: 16,
                itemStyle: {
                    borderRadius: [3, 3, 0, 0],
                    color: (p: any) => {
                        const v = p.value as number;
                        return v >= 90 ? '#ef4444' : v >= 75 ? '#eab308' : '#38bdf8';
                    },
                },
                data: names.map(n => avg(rows.get(n)!.load)),
            },
            {
                id: 'temp',
                name: '平均进风温度',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                symbolSize: 6,
                lineStyle: { color: '#f97316', width: 2 },
                itemStyle: { color: '#f97316' },
                data: names.map(n => {
                    const t = rows.get(n)!.temp;
                    return t.length ? Math.round((t.reduce((s, v) => s + v, 0) / t.length) * 10) / 10 : 0;
                }),
            },
        ],
    });
}

watch(() => props.racks, render, { deep: true, immediate: true });
onMounted(render);
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.row-load {
    .idc-panel();

    &__canvas {
        height: 180px;
    }
}
</style>
