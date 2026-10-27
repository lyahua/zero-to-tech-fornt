<template>
    <div class="idc-map">
        <header class="idc-map__head">
            <h1 class="idc-map__title">全国机房分布总览</h1>
            <div class="idc-map__tools">
                <span class="idc-map__clock">{{ clock }}</span>
                <el-button size="small" text @click="router.push('/idc-deploy')">平面布置图</el-button>
                <el-button size="small" text @click="router.push('/')">返回菜单</el-button>
            </div>
        </header>

        <div class="idc-map__kpi">
            <KpiBar :summary="metrics.summary" />
        </div>

        <div class="idc-map__main">
            <section class="idc-map__map">
                <GeoMap
                    :site-adcode="activeAdcode"
                    @drill="onDrill"
                    @back="activeAdcode = ''"
                    @pick-room="openFloorplan"
                />
            </section>

            <aside class="idc-map__side">
                <SiteDrawer
                    v-if="activeSite"
                    :site="activeSite"
                    class="idc-map__site"
                    @pick-room="openFloorplan"
                />
                <div class="idc-map__rank idc-panel">
                    <RankPanel :sites="metrics.sites" />
                </div>
                <AlarmFeed class="idc-map__alarm" :alarms="metrics.alarms" @pick="onAlarmPick" />
            </aside>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * 全国机房分布总览
 *
 * 数据只从 @/api/idc 取，页面自身不持有业务状态；
 * 每 2.5s 的指标推送通过 subscribeMetrics 回调覆盖 metrics。
 */
import { getMetricsSnapshot, subscribeMetrics, type Metrics } from '@/api/idc';
import KpiBar from './components/KpiBar.vue';
import GeoMap from './components/GeoMap.vue';
import RankPanel from './components/RankPanel.vue';
import AlarmFeed from './components/AlarmFeed.vue';
import SiteDrawer from './components/SiteDrawer.vue';

defineOptions({ name: 'idc-map' });

const router = useRouter();
const metrics = ref<Metrics>(getMetricsSnapshot());
const activeAdcode = ref('');
/** 点选机房后固定展示的站点；为空时按地图下钻的 adcode 推断 */
const activeSiteId = ref('');

const activeSite = computed(() => {
    const byId = metrics.value.sites.find(s => s.id === activeSiteId.value);
    if (byId) return byId;
    return metrics.value.sites.find(s => s.adcode === activeAdcode.value);
});

const clock = computed(() => dayjs(metrics.value.ts).format('YYYY-MM-DD HH:mm:ss'));

function onDrill(adcode: string) {
    activeAdcode.value = adcode;
    activeSiteId.value = '';
}

function openFloorplan(roomId: string) {
    router.push({ path: '/idc-deploy', query: { room: roomId } });
}

function onAlarmPick(alarm: { roomId: string; rackId: string }) {
    router.push({ path: '/idc-deploy', query: { room: alarm.roomId, rack: alarm.rackId } });
}

let unsubscribe: (() => void) | null = null;
onMounted(() => {
    unsubscribe = subscribeMetrics(m => {
        metrics.value = m;
    });
});
onBeforeUnmount(() => {
    unsubscribe?.();
    unsubscribe = null;
});
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.idc-map {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 0 @gap-md @gap-md;
    background: @idc-bg;

    &__head {
        display: flex;
        align-items: center;
        height: 56px;
        flex: none;
    }

    &__title {
        flex: 1;
        font-size: @font-lg;
        font-weight: 500;
        color: @idc-text;
    }

    &__tools {
        display: flex;
        align-items: center;
        gap: @gap-md;
    }

    &__clock {
        font-size: @font-sm;
        color: @idc-text-dim;
        font-variant-numeric: tabular-nums;
    }

    &__kpi {
        margin: @gap-md 0;
    }

    &__main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: @gap-md;
        flex: 1;
        min-height: 0;
    }

    &__map {
        .idc-panel();
        overflow: hidden;
    }

    &__side {
        display: flex;
        flex-direction: column;
        gap: @gap-md;
        min-height: 0;
    }

    &__rank {
        flex: none;
    }

    &__alarm {
        flex: 1;
    }
}
</style>
