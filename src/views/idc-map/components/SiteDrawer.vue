<template>
    <div class="site-drawer">
        <div class="panel__title">{{ site.name }}</div>
        <div class="site-drawer__body">
            <div class="site-drawer__meta">
                <span>{{ site.province }}{{ site.city }}</span>
                <el-tag size="small" :type="tagType">{{ statusLabel }}</el-tag>
            </div>
            <dl class="site-drawer__stats">
                <div v-for="s in stats" :key="s.label" class="site-drawer__stat">
                    <dt>{{ s.label }}</dt>
                    <dd>{{ s.value }}</dd>
                </div>
            </dl>
            <div class="site-drawer__rooms">
                <div class="site-drawer__rooms-title">机房</div>
                <button
                    v-for="r in site.rooms"
                    :key="r.id"
                    class="site-drawer__room"
                    @click="emit('pick-room', r.id)"
                >
                    <span class="site-drawer__dot" :style="{ background: STATUS_COLOR[r.status] }" />
                    <span class="site-drawer__room-name">{{ r.name }}</span>
                    <span class="site-drawer__room-num">{{ r.rackTotal }} 台 / {{ r.powerKw }} kW</span>
                    <span class="site-drawer__arrow">›</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/** 站点详情：地图点击后展示该站点汇总与机房入口 */
import { STATUS_LABEL, type Site } from '@/api/idc';
import { STATUS_COLOR } from '@/api/idc/palette';
import { ArrowRight } from '@element-plus/icons-vue';

const props = defineProps<{ site: Site }>();
const emit = defineEmits<{ (e: 'pick-room', roomId: string): void }>();

const statusLabel = computed(() => STATUS_LABEL[props.site.status]);

const tagType = computed(() => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
        normal: 'success',
        warning: 'warning',
        alarm: 'danger',
        offline: 'info',
    };
    return map[props.site.status];
});

const stats = computed(() => {
    const s = props.site;
    return [
        { label: '机柜', value: `${s.rackOnline}/${s.rackTotal} 台` },
        { label: 'U 位', value: `${s.uUsed}/${s.uTotal}` },
        { label: '功率', value: `${s.powerKw}/${s.ratedPowerKw} kW` },
        { label: 'PUE', value: String(s.pue) },
        { label: '平均进风', value: `${s.tempAvg} ℃` },
        { label: '湿度', value: `${s.humidity} %` },
    ];
});
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.site-drawer {
    .idc-panel();
    display: flex;
    flex-direction: column;
    min-height: 0;

    &__body {
        padding: @gap-md;
        overflow-y: auto;
    }

    &__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: @font-sm;
        color: @idc-text-dim;
    }

    &__stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: @gap-sm;
        margin: @gap-md 0;
    }

    &__stat {
        padding: @gap-sm;
        background: @idc-panel-soft;
        border-radius: @radius-sm;

        dt {
            font-size: @font-xs;
            color: @idc-text-dim;
        }

        dd {
            margin-top: 2px;
            font-size: @font-md;
            color: @idc-text;
            font-variant-numeric: tabular-nums;
        }
    }

    &__rooms-title {
        margin-bottom: @gap-sm;
        font-size: @font-sm;
        color: @idc-text-dim;
    }

    &__room {
        display: flex;
        align-items: center;
        gap: @gap-sm;
        width: 100%;
        padding: @gap-sm;
        color: @idc-text;
        background: @idc-panel-soft;
        border: 1px solid @idc-border;
        border-radius: @radius-sm;
        font-size: @font-sm;
        cursor: pointer;
        transition: border-color 0.2s;

        & + & {
            margin-top: @gap-sm;
        }

        &:hover {
            border-color: fade(@idc-brand, 65%);

            .site-drawer__arrow {
                color: @idc-brand;
                transform: translateX(2px);
            }
        }
    }

    &__arrow {
        color: @idc-text-dim;
        transition: color 0.2s, transform 0.2s;
    }

    &__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex: none;
    }

    &__room-name {
        color: @idc-text;
    }

    &__room-num {
        margin-left: auto;
        color: @idc-text-dim;
        font-variant-numeric: tabular-nums;
    }
}
</style>
