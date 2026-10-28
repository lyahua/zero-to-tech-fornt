<template>
    <div class="kpi-bar">
        <div
            v-for="k in items"
            :key="k.label"
            class="kpi-bar__item"
            :class="{ 'is-marked': k.marked }"
            :style="{ '--kpi-color': k.color }"
        >
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
        { label: '机房', value: s.roomTotal, unit: ' 个', color: '#38bdf8', marked: false },
        { label: '机柜在线', value: `${s.rackOnline}/${s.rackTotal}`, unit: ' 台', color: '#38bdf8', marked: false },
        {
            label: 'U 位占用',
            value: s.uTotal ? Math.round((s.uUsed / s.uTotal) * 100) : 0,
            unit: '%',
            color: '#8b5cf6',
            marked: false,
        },
        { label: '总功耗', value: s.powerKw, unit: ' kW', color: '#22c55e', marked: true },
        { label: '平均 PUE', value: s.avgPue, unit: '', color: '#22d3ee', marked: false },
        { label: '告警', value: s.alarmCount, unit: ' 条', color: '#ef4444', marked: false },
        { label: '离线机柜', value: s.offlineCount, unit: ' 台', color: '#64748b', marked: false },
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
        transition: border-top-color 0.2s, border-right-color 0.2s, border-bottom-color 0.2s;

        // hover 只改上右下三边：border-color 会连左侧语义竖条一起覆盖掉
        &:hover {
            border-top-color: fade(@idc-brand, 55%);
            border-right-color: fade(@idc-brand, 55%);
            border-bottom-color: fade(@idc-brand, 55%);
        }
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

    // 成绩指标只加一条极窄下划线做衬底，数值本身的颜色保持语义不变。
    // 渐变尾端收在金色上：暗红单独出现会读成告警，配金才读成「规模/成绩」
    &__item.is-marked .kpi-bar__value {
        position: relative;
        display: inline-block;
        padding-bottom: 4px;

        &::after {
            content: '';
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            height: 2px;
            border-radius: 1px;
            background: linear-gradient(90deg, @idc-brand, @idc-gold);
        }
    }
}
</style>
