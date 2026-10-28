<template>
    <div class="idc-kpi" :style="{ '--idc-kpi-cols': items.length }">
        <div v-for="k in items" :key="k.label" class="idc-kpi__item" :style="{ '--kpi-color': k.color }">
            <div class="idc-kpi__label">{{ k.label }}</div>
            <div class="idc-kpi__value">
                {{ k.value }}<span class="idc-kpi__unit">{{ k.unit ?? '' }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/** 暗色指标条，地图页与平面图页共用，数值由调用方决定 */
export interface KpiItem {
    label: string;
    value: string | number;
    unit?: string;
    color?: string;
}

defineProps<{ items: KpiItem[] }>();
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.idc-kpi {
    display: grid;
    grid-template-columns: repeat(var(--idc-kpi-cols), minmax(0, 1fr));
    gap: @gap-md;

    &__item {
        padding: @gap-md;
        background: @idc-panel;
        border: 1px solid @idc-border;
        border-left: 3px solid var(--kpi-color, @idc-accent);
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
        color: @idc-text-dim;
    }

    &__value {
        margin-top: 4px;
        font-size: 20px;
        font-weight: 600;
        color: var(--kpi-color, @idc-accent);
        font-variant-numeric: tabular-nums;
    }

    &__unit {
        font-size: @font-sm;
        font-weight: 400;
        color: @idc-text-dim;
    }
}
</style>
