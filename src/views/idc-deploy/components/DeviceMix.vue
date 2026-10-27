<template>
    <div class="device-mix">
        <div class="panel__title">设备构成</div>
        <div ref="chartEl" class="device-mix__canvas" />
    </div>
</template>

<script setup lang="ts">
/** 机房内设备类型构成，按占用 U 数统计（比按台数更能反映空间消耗） */
import type { DeviceType, Rack } from '@/api/idc';
import { DEVICE_TYPE_LABEL } from '@/api/idc';
import { CANVAS, DEVICE_COLOR } from '@/api/idc/palette';
import { useEchart } from '@/javascript/hooks/useEchart';

const props = defineProps<{ racks: Rack[] }>();

const chartEl = ref<HTMLElement>();
const { setOption } = useEchart(chartEl);

function render() {
    const uByType = new Map<DeviceType, number>();
    props.racks.forEach(r =>
        r.devices.forEach(d => uByType.set(d.type, (uByType.get(d.type) ?? 0) + d.uSize))
    );
    const data = [...uByType.entries()].map(([type, value]) => ({
        name: DEVICE_TYPE_LABEL[type],
        value,
        itemStyle: { color: DEVICE_COLOR[type] },
    }));

    setOption({
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(17,26,46,.94)',
            borderColor: CANVAS.border,
            textStyle: { color: CANVAS.text, fontSize: 12 },
            formatter: '{b}：{c} U（{d}%）',
        },
        legend: {
            orient: 'vertical',
            right: 8,
            top: 'center',
            itemWidth: 8,
            itemHeight: 8,
            textStyle: { color: CANVAS.text, fontSize: 11 },
        },
        series: [
            {
                id: 'device-mix',
                type: 'pie',
                radius: ['48%', '70%'],
                center: ['32%', '50%'],
                avoidLabelOverlap: true,
                label: { show: false },
                labelLine: { show: false },
                itemStyle: { borderColor: CANVAS.bg, borderWidth: 2 },
                data,
            },
        ],
    });
}

watch(() => props.racks, render, { deep: true, immediate: true });
onMounted(render);
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.device-mix {
    .idc-panel();

    &__canvas {
        height: 150px;
    }
}
</style>
