<template>
    <div class="fp">
        <header class="fp__hd">
            <div class="fp__brand">
                <h1 class="fp__title">机房平面视图</h1>
                <span class="fp__sub">IDC · 3 区 6 排 {{ kpi.racks }} 柜 {{ kpi.devices }} 台设备</span>
            </div>
            <div class="fp__stats">
                <span class="fp__stat"><b>{{ kpi.normal }}</b>正常</span>
                <span class="fp__stat fp__stat--alarm"><b>{{ kpi.alarm }}</b>告警</span>
                <span class="fp__stat fp__stat--off"><b>{{ kpi.offline }}</b>离线</span>
                <span class="fp__stat"><b>{{ kpi.pue }}</b>PUE</span>
            </div>
            <router-link class="fp__link" to="/idc">三维总览 →</router-link>
        </header>

        <main class="fp__main">
            <IdcFloorplan @select="onSelect" />
        </main>

        <footer class="fp__ft">
            数据每 2.5 秒随仿真心跳刷新 · 点击机柜查看柜内设备 · 指标切换在左上角
        </footer>

        <IdcRackDrawer v-model="drawerVisible" :rack-id="rackId" />
    </div>
</template>

<script setup>
/**
 * 机房平面视图页（ECharts 二维）
 *
 * 与 /idc 三维总览互补：本页只依赖 idc/engine/data.js，不加载 three，
 * 适合嵌到普通后台、需要轻量平面图的场景。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import IdcFloorplan from '@/components/IdcFloorplan.vue';
import IdcRackDrawer from '@/components/IdcRackDrawer.vue';

const drawerVisible = ref(false);
const rackId = ref('');

const data = computed(() => window.IDC?.data || null);
const kpi = computed(() => {
    const d = data.value;
    if (!d) return { racks: 0, devices: 0, normal: 0, alarm: 0, offline: 0, pue: '--' };
    const c = { normal: 0, alarm: 0, offline: 0 };
    d.racks.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return {
        racks: d.racks.length,
        devices: d.kpi.deviceTotal,
        normal: c.normal, alarm: c.alarm, offline: c.offline,
        pue: d.kpi.pue,
    };
});

function onSelect(id) {
    rackId.value = id;
    drawerVisible.value = true;
}

let timer = null;
onMounted(() => {
    /* 页面自己驱动心跳；三维页卸载后不会有第二个 tick 源 */
    timer = setInterval(() => window.IDC?.data?.tick(), 2500);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<style scoped lang="less">
.fp {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #05080f;
    color: #dce9ff;
    font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}
.fp__hd {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(64, 180, 255, .18);
}
.fp__brand { display: flex; align-items: baseline; gap: 10px; }
.fp__title { margin: 0; font-size: 18px; letter-spacing: 2px; color: #35e0ff; }
.fp__sub { font-size: 12px; color: #8aa0bd; }
.fp__stats { display: flex; gap: 18px; margin-left: auto; }
.fp__stat {
    font-size: 12px;
    color: #8aa0bd;
    b { margin-right: 4px; font-size: 17px; color: #22c55e; }
    &--alarm b { color: #ff4d4f; }
    &--off b { color: #90a4bd; }
    &:last-child b { color: #dce9ff; }
}
.fp__link {
    padding: 4px 12px;
    font-size: 12px;
    color: #9fe8ff;
    text-decoration: none;
    border: 1px solid rgba(64, 180, 255, .3);
    border-radius: 2px;
    &:hover { background: rgba(34, 211, 238, .12); }
}
.fp__main { flex: 1; min-height: 0; padding: 12px 16px; }
.fp__ft {
    padding: 6px 16px 10px;
    font-size: 11px;
    color: #5f7791;
}
</style>
