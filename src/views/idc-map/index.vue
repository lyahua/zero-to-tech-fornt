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
    // 页面按 100vh 设计，任何子项溢出都不该顶出页面级滚动条
    overflow: hidden;

    // 顶边整幅品牌线：红色唯一可以放心铺满宽度的位置，
    // 因为它在标题之上、不属于任何数据面板，不会被读成告警区
    &::before {
        content: '';
        flex: none;
        height: 2px;
        margin: 0 -@gap-md @gap-sm;
        background: linear-gradient(90deg, @idc-brand-bright, @idc-brand 30%, @idc-brand-deep 65%, fade(@idc-brand-deep, 5%));
    }

    &__head {
        display: flex;
        align-items: center;
        height: 56px;
        flex: none;
        padding-bottom: @gap-sm;
        border-bottom: 1px solid transparent;
        border-image: linear-gradient(90deg, @idc-brand-bright, @idc-brand 20%, @idc-brand-deep 48%, fade(@idc-brand-deep, 5%)) 1;
    }

    &__title {
        flex: 1;
        // 左侧 3px 竖条改用背景绘制：border-left 无法渐变
        padding-left: 13px;
        font-size: @font-lg;
        font-weight: 500;
        color: @idc-text;
        background-image: linear-gradient(180deg, @idc-brand-bright, @idc-brand, @idc-brand-deep);
        background-repeat: no-repeat;
        background-position: left center;
        background-size: 3px 100%;
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
        // 下钻后侧栏是「站点详情 + 规模榜 + 实时告警」三块，
        // 矮屏下总高必然超过可用高度，只能让侧栏自己滚，
        // 否则会顶出页面级滚动条
        overflow-y: auto;
    }

    &__site {
        // 详情面板内部 __body 自带滚动，所以允许它收缩；
        // 不给 min-height 会被压到只剩标题，给了 132px 至少留出一行指标
        flex: 0 1 auto;
        min-height: 132px;
    }

    &__rank {
        flex: none;
    }

    &__alarm {
        // 不写 flex: 1 是因为矮屏下它会被压到几像素，列表整块看不见，
        // 内容溢出面板后还会顶出页面级滚动条
        flex: 1 1 160px;
        min-height: 160px;
    }
}
</style>
