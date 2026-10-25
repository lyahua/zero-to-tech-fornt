<template>
    <div ref="hostRef" class="idc-host">
        <canvas ref="canvasRef" class="idc-gl"></canvas>
        <div ref="hudRef" id="hud-root" class="idc-hud-layer"></div>
        <div id="toast-root" class="idc-toast"></div>
    </div>
</template>

<script setup>
/**
 * IDC 机房总览（三维数字孪生 + HUD 大屏）壳组件
 *
 * 引擎是原生 ES Module 编写的黑盒（见 @idc 别名指向的 idc-visual-ops 仓库），
 * 本组件只负责三件事：准备容器 → 驱动渲染循环 → 卸载时释放 GPU 资源。
 *
 * ★ 为什么 onBeforeUnmount 里必须调 IDC.scene.dispose()：
 *   scene3d.js 是模块级单例，init() 首行 `if (ready) return api`。
 *   不 dispose 就再次挂载会拿到「ready=true 但 canvas 已销毁」的实例 → 全黑，
 *   且 WebGL 上下文与 200+ 张贴图永久驻留显存。补了 dispose 后本组件可反复挂载。
 *
 * ★ 画质档：引擎在模块加载时读 location.search。本项目路由是 hash 模式，
 *   参数要写在 # 之前才生效：http://localhost:5173/?quality=low#/idc
 */
import { ref, onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue';

import '@idc/host-vue.css';
import '@idc/styles.css';
import '@idc/data.js';
import '@idc/scene3d.js';
import '@idc/hud.js';

const props = defineProps({
    /** HUD 页签：overview | monitor | assets | energy | alarms | workorder | donghuan */
    page: { type: String, default: 'overview' },
    /** 数据心跳间隔（毫秒），引擎示例数据靠它推进 */
    tickInterval: { type: Number, default: 2500 },
});

const hostRef = ref(null);
const canvasRef = ref(null);
const hudRef = ref(null);

let rafId = 0;
let ro = null;
let timer = 0;
let running = false;

function resize() {
    const IDC = window.IDC;
    const el = hostRef.value;
    if (!IDC?.scene || !el) return;
    IDC.scene.resize(el.clientWidth, el.clientHeight);
}

function loop(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    const IDC = window.IDC;
    if (IDC?.scene?.ready) IDC.scene.frame(ts, null);
}

onMounted(() => {
    const IDC = window.IDC;
    if (!IDC?.scene || !IDC?.hud) {
        console.error('[IdcOverview] IDC 引擎未加载，检查 @idc 别名是否指向引擎目录');
        return;
    }

    IDC.scene.init(canvasRef.value, { data: IDC.data });
    IDC.hud.mount(hudRef.value, IDC.data, IDC.scene);
    IDC.hud.setPage(props.page);
    IDC.scene.setMode('status');
    IDC.scene.setAlarmBeacons((IDC.data.alarms || []).map(a => a.rackId).filter(Boolean));
    IDC.scene.setView('overview');

    ro = new ResizeObserver(resize);
    ro.observe(hostRef.value);
    resize();

    running = true;
    rafId = requestAnimationFrame(loop);
    timer = window.setInterval(() => IDC.data.tick(), props.tickInterval);
});

onBeforeUnmount(() => {
    running = false;
    cancelAnimationFrame(rafId);
    ro?.disconnect();
    window.clearInterval(timer);
    const IDC = window.IDC;
    IDC?.scene?.dispose();
    if (hudRef.value) hudRef.value.innerHTML = '';
});

// 页面被 keep-alive 缓存时，切走停帧、切回续帧，避免后台空转吃满 GPU
onDeactivated(() => {
    running = false;
    cancelAnimationFrame(rafId);
});
onActivated(() => {
    if (!window.IDC?.scene?.ready) return;
    resize();
    running = true;
    rafId = requestAnimationFrame(loop);
});
</script>

<style scoped>
.idc-host {
    position: relative;
    width: 100%;
    height: 100vh;
    min-height: 560px;
}
</style>
