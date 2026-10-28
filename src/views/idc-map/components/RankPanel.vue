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

/** 荣誉标记用金色描边 + TOP 角标，条的填充色始终留给状态色 */
const GOLD = '#d4a24c';

function render() {
    const rows = props.sites
        .flatMap(s => s.rooms.map(r => ({ ...r, siteName: s.name })))
        .sort((a, b) => a.rackTotal - b.rackTotal);
    const topIndex = rows.length - 1;

    setOption({
        grid: { left: 96, right: 44, top: 8, bottom: 8 },
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
            axisLabel: {
                fontSize: 11,
                color: CANVAS.text,
                formatter: (v: string, idx: number) => (idx === topIndex ? `{g|${v}}` : v),
                rich: { g: { color: GOLD, fontSize: 11, fontWeight: 600 } },
            },
        },
        series: [
            {
                id: 'rack-total',
                type: 'bar',
                // 12 个机房挤在 168px 里，条宽必须小于 168/12≈14 才不会让右侧数值互相压叠
                barWidth: 8,
                itemStyle: { borderRadius: [0, 4, 4, 0] },
                label: {
                    show: true,
                    position: 'right',
                    fontSize: 10,
                    color: CANVAS.text,
                },
                // 描边只能挂在数据项上：itemStyle 里除 color 外的字段不支持回调，
                // 写成函数会让整条 bar 拿不到样式而画不出来。
                // 荣誉标记靠「金色轴标签 + 金色描边 + 金色数值」三重表达，
                // 不用 TOP 角标：rich 的 backgroundColor 会撑高标签，行距只有 20px 时会和邻行贴死
                data: rows.map((r, i) => ({
                    value: r.rackTotal,
                    itemStyle: {
                        color: STATUS_COLOR[r.status],
                        ...(i === topIndex ? { borderColor: GOLD, borderWidth: 1 } : null),
                    },
                    label: i === topIndex ? { color: GOLD, fontWeight: 700 } : null,
                })),
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
        // 站点从 3 城扩到 6 城后机房数翻倍到 12 行，
        // 168px 放 12 行会让右侧数值上下叠在一起
        height: 244px;
    }
}
</style>
