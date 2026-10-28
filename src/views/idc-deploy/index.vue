<template>
    <div class="idc-deploy">
        <header class="idc-deploy__head">
            <h1 class="idc-deploy__title">机房平面布置图</h1>
            <div class="idc-deploy__tools">
                <el-select v-model="roomId" size="small" class="idc-deploy__select" @change="onRoomChange">
                    <el-option
                        v-for="r in rooms"
                        :key="r.id"
                        :label="`${r.siteName} · ${r.name}`"
                        :value="r.id"
                    />
                </el-select>
                <span class="idc-deploy__clock">{{ clock }}</span>
                <el-button size="small" text @click="router.push('/idc-map')">全国地图</el-button>
                <el-button size="small" text @click="router.push('/')">返回菜单</el-button>
            </div>
        </header>

        <div class="idc-deploy__kpi">
            <IdcKpiBar :items="kpiItems" />
        </div>

        <div class="idc-deploy__main">
            <section class="idc-deploy__plan">
                <RackFloorplan :plan="plan" :selected-id="selectedRackId" @pick="onPick" />
            </section>
            <aside class="idc-deploy__side">
                <RackGauge :u-pct="uPct" :load-pct="loadPct" />
                <DeviceMix :racks="plan.racks" />
                <RowLoad :racks="plan.racks" />
            </aside>
        </div>

        <el-drawer
            v-model="drawerVisible"
            :title="`${plan.roomName} 机柜详情`"
            direction="rtl"
            size="380px"
            class="idc-deploy__drawer"
        >
            <RackDrawer v-if="selectedRack" :rack="selectedRack" />
        </el-drawer>
    </div>
</template>

<script setup lang="ts">
/**
 * 机房平面布置图
 *
 * plan 每收到一次指标推送就整体重取：机柜坐标是静态的，
 * 温度/功率/状态跟着 mock 走，重新取比逐字段合并更不容易出错。
 */
import {
    getFloorplan,
    getMetricsSnapshot,
    getRooms,
    subscribeMetrics,
    type Floorplan,
    type Metrics,
} from '@/api/idc';
import type { KpiItem } from '@/components/idc/IdcKpiBar.vue';
import IdcKpiBar from '@/components/idc/IdcKpiBar.vue';
import RackFloorplan from './components/RackFloorplan.vue';
import RackDrawer from './components/RackDrawer.vue';
import RackGauge from './components/RackGauge.vue';
import DeviceMix from './components/DeviceMix.vue';
import RowLoad from './components/RowLoad.vue';

defineOptions({ name: 'idc-deploy' });

const route = useRoute();
const router = useRouter();
const rooms = getRooms();

const initialRoom = () => {
    const q = route.query.room;
    const hit = typeof q === 'string' ? rooms.find(r => r.id === q) : undefined;
    return hit?.id ?? rooms[0]?.id ?? '';
};

const roomId = ref(initialRoom());
const metrics = ref<Metrics>(getMetricsSnapshot());
const selectedRackId = ref(typeof route.query.rack === 'string' ? route.query.rack : '');
const drawerVisible = ref(false);

/** 空值兜底，避免机房 id 非法时整页模板取值报错 */
const EMPTY_PLAN: Floorplan = {
    roomId: '',
    roomName: '-',
    siteId: '',
    siteName: '-',
    room: { w: 12, d: 8 },
    zones: [],
    aisles: [],
    racks: [],
};

/**
 * 每次指标推送都整体重取平面图
 *
 * 机柜坐标是静态的，但温度/功率/状态在 mock 里持续变化，
 * 依赖 metrics.ts 重新取一份比逐字段合并更不容易漏更新。
 */
const plan = computed(() => {
    void metrics.value.ts;
    return getFloorplan(roomId.value) ?? EMPTY_PLAN;
});
const selectedRack = computed(() => plan.value.racks.find(r => r.id === selectedRackId.value));

const kpiItems = computed<KpiItem[]>(() => {
    const p = plan.value;
    const online = p.racks.filter(r => r.status !== 'offline');
    return [
        { label: '所属站点', value: p.siteName, color: '#38bdf8' },
        { label: '机柜', value: p.racks.length, unit: ' 台', color: '#38bdf8' },
        {
            label: '在线',
            value: online.length,
            unit: ' 台',
            color: online.length === p.racks.length ? '#22c55e' : '#eab308',
        },
        { label: 'U 位', value: `${p.racks.reduce((s, r) => s + r.uUsed, 0)}`, unit: ' U', color: '#8b5cf6' },
        {
            label: '总功率',
            value: Math.round(online.reduce((s, r) => s + r.powerKw, 0)),
            unit: ' kW',
            color: '#22c55e',
        },
        {
            label: '平均进风',
            value: online.length
                ? Math.round((online.reduce((s, r) => s + r.tempIn, 0) / online.length) * 10) / 10
                : 0,
            unit: ' ℃',
            color: '#f97316',
        },
        {
            label: '告警机柜',
            value: p.racks.filter(r => r.status === 'alarm').length,
            unit: ' 台',
            color: '#ef4444',
        },
    ];
});

const uPct = computed(() => {
    const total = plan.value.racks.reduce((s, r) => s + r.uTotal, 0);
    return total ? Math.round((plan.value.racks.reduce((s, r) => s + r.uUsed, 0) / total) * 100) : 0;
});

const loadPct = computed(() => {
    const online = plan.value.racks.filter(r => r.status !== 'offline');
    if (!online.length) return 0;
    return Math.round(online.reduce((s, r) => s + r.loadPct, 0) / online.length);
});

const clock = computed(() => dayjs(metrics.value.ts).format('YYYY-MM-DD HH:mm:ss'));

function onPick(rack: { id: string }) {
    selectedRackId.value = rack.id;
    drawerVisible.value = true;
}

function onRoomChange(id: string) {
    selectedRackId.value = '';
    drawerVisible.value = false;
    router.replace({ path: '/idc-deploy', query: { room: id } });
}

let unsubscribe: (() => void) | null = null;
onMounted(() => {
    unsubscribe = subscribeMetrics(m => {
        metrics.value = m;
    });
    // 从告警列表跳转过来时直接展开该机柜
    if (selectedRackId.value) drawerVisible.value = true;
});
onBeforeUnmount(() => {
    unsubscribe?.();
    unsubscribe = null;
});
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.idc-deploy {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 0 @gap-md @gap-md;
    background: @idc-bg;

    // 与全国地图页保持一致的顶边品牌线，两页来回跳转时头部才连得上
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

    &__select {
        width: 220px;
    }

    &__clock {
        font-size: @font-sm;
        color: @idc-text-dim;
        font-variant-numeric: tabular-nums;
    }

    &__kpi {
        margin-bottom: @gap-md;
    }

    &__main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: @gap-md;
        flex: 1;
        min-height: 0;
    }

    &__plan {
        .idc-panel();
        overflow: hidden;
    }

    &__side {
        display: flex;
        flex-direction: column;
        gap: @gap-md;
        min-height: 0;
        overflow-y: auto;
    }
}

:deep(.idc-deploy__drawer .el-drawer__header) {
    margin-bottom: 0;
    padding: @gap-md;
    color: @idc-text;
    background: @idc-panel;
    border-bottom: 1px solid @idc-border;
}

:deep(.idc-deploy__drawer .el-drawer__body) {
    padding: 0;
    background: @idc-bg;
}
</style>
