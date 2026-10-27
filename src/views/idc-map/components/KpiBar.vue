<template>
    <div class="kpi-bar">
        <div v-for="k in items" :key="k.label" class="kpi-bar__item" :style="{ '--kpi-color': k.color }">
            <div class="kpi-bar__label">{{ k.label }}</div>
            <div class="kpi-bar__value">
                {{ k.value }}<span class="kpi-bar__unit">{{ k.unit }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/** 顶部指标条，数值全部来自 summary，不做本地计算 */
import type { Summary } from '@/api/idc';

const props = defineProps<{ summary: Summary }>();

const items = computed(() => {
    const s = props.summary;
    return [
        { label: '机房', value: s.roomTotal, unit: ' 个', color: '#38bdf8' },
        { label: '机柜在线', value: `${s.rackOnline}/${s.rackTotal}`, unit: ' 台', color: '#38bdf8' },
        {
            label: 'U 位占用',
            value: s.uTotal ? Math.round((s.uUsed / s.uTotal) * 100) : 0,
            unit: '%',
            color: '#8b5cf6',
        },
        { label: '总功耗', value: s.powerKw, unit: ' kW', color: '#22c55e' },
        { label: '平均 PUE', value: s.avgPue, unit: '', color: '#22d3ee' },
        { label: '告警', value: s.alarmCount, unit: ' 条', color: '#ef4444' },
        { label: '离线机柜', value: s.offlineCount, unit: ' 台', color: '#64748b' },
    ];
});
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.kpi-bar {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: @gap-md;

    &__item {
        padding: @gap-md;
        background: @idc-panel;
        border: 1px solid @idc-border;
        border-left: 3px solid var(--kpi-color);
        border-radius: @radius-md;
    }

    &__label {
        font-size: @font-sm;
        color: @text-secondary;
    }

    &__value {
        margin-top: 4px;
        font-size: 20px;
        font-weight: 600;
        color: var(--kpi-color);
        font-variant-numeric: tabular-nums;
    }

    &__unit {
        font-size: @font-sm;
        font-weight: 400;
        color: @text-secondary;
    }
}
</style>
