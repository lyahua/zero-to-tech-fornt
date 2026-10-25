<template>
    <div class="idc-fp">
        <div class="idc-fp__toolbar">
            <div class="idc-fp__seg">
                <button
                    v-for="m in METRICS"
                    :key="m.key"
                    class="idc-fp__segbtn"
                    :class="{ 'is-on': metric === m.key }"
                    @click="metric = m.key"
                >{{ m.label }}</button>
            </div>
            <div class="idc-fp__legend">
                <template v-if="metric === 'status'">
                    <span v-for="s in STATUS_LEGEND" :key="s.v" class="idc-fp__lg">
                        <i :style="{ background: s.c }"></i>{{ s.t }}
                    </span>
                </template>
                <span v-else class="idc-fp__lg idc-fp__lg--bar">
                    <i class="idc-fp__bar" :style="{ background: gradOf(metric) }"></i>
                    {{ minLabel }} ~ {{ maxLabel }}
                </span>
                <span class="idc-fp__lg"><i class="idc-fp__ripple"></i>告警定位</span>
            </div>
        </div>
        <div ref="chartRef" class="idc-fp__canvas"></div>
    </div>
</template>

<script setup>
/**
 * IDC 机房平面视图（ECharts custom series）
 *
 * 用真实米制坐标绘制，保留冷通道间距与分区归属；点击机柜上抛 rackId。
 * 坐标常量与引擎 idc/engine/scene3d.js 保持一致，改布局要同步改那边。
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { init, use } from 'echarts/core';
import { CustomChart, EffectScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import '@idc/data.js';

use([CustomChart, EffectScatterChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
    /** 初始指标：status | temp | load */
    metric: { type: String, default: 'status' },
    height: { type: String, default: '100%' },
});
const emit = defineEmits(['select']);

const RACK_W = 1.2, RACK_D = 1.1;
const ROOM = { x0: -9.5, x1: 9.5, z0: -17, z1: 11 };
const AISLE_Z = [-12, -3, 6];
const ZONE_BANDS = [
    { label: 'A 区', z0: -14.9, z1: -9.1 },
    { label: 'B 区', z0: -5.9, z1: -0.1 },
    { label: 'C 区', z0: 3.1, z1: 8.9 },
];

const METRICS = [
    { key: 'status', label: '运行状态' },
    { key: 'temp', label: '进风温度' },
    { key: 'load', label: '负载率' },
];
const STATUS_LEGEND = [
    { v: 'normal', t: '正常', c: '#22c55e' },
    { v: 'alarm', t: '告警', c: '#ff4d4f' },
    { v: 'offline', t: '离线', c: '#5b6b80' },
];
const STATUS_COLOR = { normal: '#1f9d55', alarm: '#ff4d4f', offline: '#42536a' };

/** 温度分段色，与引擎 scene3d.js 的 TEMP_STOPS 同档 */
function tempColor(t) {
    const stops = [[21.5, '#3b82f6'], [24.5, '#22d3ee'], [27, '#22c55e'], [29, '#eab308'], [30.5, '#f59e0b'], [32, '#ef4444']];
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
            const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
            return mix(c0, c1, (t - t0) / (t1 - t0));
        }
    }
    return stops[stops.length - 1][1];
}
function loadColor(p) {
    return mix('#22d3ee', '#ff4d4f', Math.max(0, Math.min(1, (p - 40) / 45)));
}
function mix(a, b, k) {
    const pa = hex(a), pb = hex(b);
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function hex(h) {
    const s = h.replace('#', '');
    return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
}
function gradOf(m) {
    if (m === 'temp') return 'linear-gradient(90deg,#3b82f6,#22d3ee,#22c55e,#eab308,#f59e0b,#ef4444)';
    return 'linear-gradient(90deg,#22d3ee,#7dd3fc,#eab308,#f59e0b,#ff4d4f)';
}

const chartRef = ref(null);
const chart = shallowRef(null);
const metric = ref(props.metric);
const selectedId = ref('');
const data = computed(() => window.IDC?.data || null);
const minLabel = computed(() => (metric.value === 'temp' ? '21.5℃' : '40%'));
const maxLabel = computed(() => (metric.value === 'temp' ? '32℃' : '85%'));

function colorOf(r) {
    if (metric.value === 'temp') return r.status === 'offline' ? STATUS_COLOR.offline : tempColor(r.tempIn);
    if (metric.value === 'load') return r.status === 'offline' ? STATUS_COLOR.offline : loadColor(r.loadPct);
    return STATUS_COLOR[r.status] || STATUS_COLOR.normal;
}
function valueOf(r) {
    if (metric.value === 'temp') return r.tempIn.toFixed(1) + '℃';
    if (metric.value === 'load') return r.loadPct + '%';
    return { normal: '正常', alarm: '告警', offline: '离线' }[r.status];
}

function bgItem(api) {
    /* 分区底色 + 冷通道 + 分区名，一次性画在底层 */
    const rects = [];
    ZONE_BANDS.forEach((z) => {
        const [x0, y0] = api.coord([ROOM.x0, z.z0]);
        const [x1, y1] = api.coord([ROOM.x1, z.z1]);
        rects.push({
            type: 'rect', shape: { x: x0, y: Math.min(y0, y1), width: x1 - x0, height: Math.abs(y1 - y0) },
            style: { fill: 'rgba(34,211,238,.045)', stroke: 'rgba(34,211,238,.14)', lineWidth: 1 },
        });
        rects.push({
            type: 'text', style: {
                text: z.label, x: x0 + 10, y: Math.min(y0, y1) + 8,
                fill: 'rgba(138,160,189,.75)', font: 'bold 12px system-ui',
            },
        });
    });
    AISLE_Z.forEach((az) => {
        const [x0, y0] = api.coord([-5.9, az - 1.15]);
        const [x1, y1] = api.coord([5.9, az + 1.15]);
        rects.push({
            type: 'rect', shape: { x: x0, y: Math.min(y0, y1), width: x1 - x0, height: Math.abs(y1 - y0) },
            style: { fill: 'rgba(56,189,248,.07)' },
            silent: true,
        });
        rects.push({
            type: 'text', style: {
                text: '冷通道', x: x1 - 46, y: (y0 + y1) / 2 - 6,
                fill: 'rgba(56,189,248,.4)', font: '10px system-ui',
            },
            silent: true,
        });
    });
    return { type: 'group', children: rects };
}

/**
 * renderItem 的 params 不含原始 data 项，自定义系列只能靠 dataIndex 回查，
 * 这里保留与 series.data 同序的机柜数组供 rackItem / tooltip / click 取数
 */
let rackList = [];

function rackItem(params, api) {
    const r = rackList[params.dataIndex];
    if (!r) return null;
    const [cx, cy] = api.coord([r.x, r.z]);
    const hw = Math.abs(api.coord([r.x + RACK_W / 2, r.z])[0] - cx);
    const hh = Math.abs(api.coord([r.x, r.z + RACK_D / 2])[1] - cy);
    const x = cx - hw, y = cy - hh, w = hw * 2, h = hh * 2;
    const fill = colorOf(r);
    const selected = r.id === selectedId.value;
    return {
        type: 'group',
        children: [
            {
                type: 'rect',
                shape: { x, y, width: w, height: h, r: 2 },
                style: {
                    fill, fillOpacity: r.status === 'offline' ? .5 : .85,
                    stroke: selected ? '#ffffff' : 'rgba(255,255,255,.26)',
                    lineWidth: selected ? 2 : 1,
                    shadowBlur: selected ? 12 : 0, shadowColor: '#35e0ff',
                },
            },
            {
                type: 'text',
                style: {
                    text: r.id, x: cx, y: cy,
                    textAlign: 'center', textVerticalAlign: 'middle',
                    fill: r.status === 'offline' ? '#cfdcec' : '#04121f',
                    font: 'bold 10px system-ui',
                },
            },
        ],
    };
}

function tooltipFmt(params) {
    const r = rackList[params.dataIndex] || params.data?.rack;
    if (!r) return '';
    const al = data.value.alarmOfRack(r.id);
    const row = (k, v) => `<div style="display:flex;justify-content:space-between;gap:18px"><span style="color:#8aa0bd">${k}</span><span style="color:#dce9ff">${v}</span></div>`;
    return `<div style="font-size:12px;line-height:1.9;min-width:170px">
      <div style="color:#35e0ff;font-weight:700;margin-bottom:2px">${r.id} · ${r.zoneLabel}</div>
      ${row('状态', `<span style="color:${STATUS_COLOR[r.status]}">${valueOf(r)}</span>`)}
      ${row('进风温度', r.tempIn + '℃')}
      ${row('负载率', r.loadPct + '% （' + r.powerKW + ' kW）')}
      ${row('U 位占用', r.uUsed + ' / ' + r.uTotal + 'U')}
      ${row('设备数', r.devices.length + ' 台')}
      ${al ? row('告警', `<span style="color:#ff4d4f">${al.title}</span>`) : ''}
      <div style="color:#5f7791;margin-top:4px">点击查看柜内设备</div>
    </div>`;
}

function buildOption() {
    const d = data.value;
    rackList = d.racks;
    return {
        animationDuration: 260,
        grid: { left: 44, right: 20, top: 18, bottom: 26 },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(9,22,38,.96)',
            borderColor: 'rgba(64,180,255,.38)',
            borderWidth: 1,
            padding: [8, 12],
            extraCssText: 'box-shadow:0 6px 24px rgba(0,0,0,.6);border-radius:3px',
            formatter: tooltipFmt,
        },
        xAxis: {
            type: 'value', min: ROOM.x0, max: ROOM.x1, interval: 1,
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { color: '#5f7791', fontSize: 10, formatter: v => v + 'm' },
            splitLine: { lineStyle: { color: 'rgba(64,180,255,.06)' } },
        },
        yAxis: {
            type: 'value', min: ROOM.z0, max: ROOM.z1, interval: 2, inverse: true,
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { color: '#5f7791', fontSize: 10, formatter: v => v + 'm' },
            splitLine: { lineStyle: { color: 'rgba(64,180,255,.06)' } },
        },
        series: [
            {
                type: 'custom', id: 'bg', name: 'bg', silent: true,
                renderItem: (p, api) => bgItem(api),
                data: [0], tooltip: { show: false }, z: 1,
            },
            {
                type: 'custom', id: 'rack', name: 'rack',
                renderItem: rackItem,
                data: d.racks.map(r => ({ value: [r.x, r.z] })),
                z: 3,
            },
            {
                type: 'effectScatter', id: 'alarm', name: 'alarm',
                coordinateSystem: 'cartesian2d',
                /* 涟漪放在机柜左上角，避免盖住柜号 */
                symbolSize: 8, rippleEffect: { scale: 3, brushType: 'stroke' },
                itemStyle: { color: '#ff4d4f', shadowColor: '#ff4d4f', shadowBlur: 8 },
                data: d.racks.filter(r => r.status === 'alarm')
                    .map(r => ({ value: [r.x - RACK_W / 2, r.z - RACK_D / 2], rack: r })),
                tooltip: { show: false }, z: 5, silent: true,
            },
        ],
    };
}

let ro = null;
let offTick = null;
let alarmKey = '';

const rackData = d => d.racks.map(r => ({ value: [r.x, r.z] }));
const alarmData = d => d.racks.filter(r => r.status === 'alarm')
    .map(r => ({ value: [r.x - RACK_W / 2, r.z - RACK_D / 2], rack: r }));
const alarmKeyOf = d => d.racks.filter(r => r.status === 'alarm').map(r => r.id).join(',');

function renderFull() {
    if (!chart.value || !data.value) return;
    chart.value.setOption(buildOption());
    alarmKey = alarmKeyOf(data.value);
}

/* 心跳只改颜色不改拓扑：增量更新机柜，告警集合没变就不碰 effectScatter，避免涟漪动画被重置 */
function renderTick() {
    if (!chart.value || !data.value) return;
    const d = data.value;
    const series = [{ id: 'rack', data: rackData(d) }];
    const k = alarmKeyOf(d);
    if (k !== alarmKey) {
        series.push({ id: 'alarm', data: alarmData(d) });
        alarmKey = k;
    }
    chart.value.setOption({ series });
}

onMounted(() => {
    if (!data.value) {
        console.error('[IdcFloorplan] IDC.data 未就绪，检查 @idc 别名');
        return;
    }
    chart.value = init(chartRef.value);
    renderFull();
    chart.value.on('click', (p) => {
        const r = p.seriesId === 'rack' ? rackList[p.dataIndex] : null;
        if (!r) return;
        selectedId.value = r.id;
        chart.value.setOption({ series: [{ id: 'rack', data: rackData(data.value) }] });
        emit('select', r.id);
    });
    ro = new ResizeObserver(() => chart.value?.resize());
    ro.observe(chartRef.value);
    offTick = window.IDC.bus.on('data:tick', renderTick);
});

onBeforeUnmount(() => {
    ro?.disconnect();
    if (typeof offTick === 'function') offTick();
    chart.value?.dispose();
    chart.value = null;
});

watch(metric, renderFull);
</script>

<style scoped>
.idc-fp {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: v-bind('props.height');
    background: radial-gradient(120% 90% at 50% 0%, #0a1729 0%, #05080f 70%);
    border: 1px solid rgba(64, 180, 255, .18);
    border-radius: 4px;
    overflow: hidden;
    font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}
.idc-fp__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(64, 180, 255, .14);
}
.idc-fp__seg { display: flex; gap: 4px; }
.idc-fp__segbtn {
    padding: 3px 12px;
    font-size: 12px;
    color: #8aa0bd;
    background: rgba(10, 21, 36, .8);
    border: 1px solid rgba(64, 180, 255, .2);
    border-radius: 2px;
    cursor: pointer;
}
.idc-fp__segbtn.is-on {
    color: #04121f;
    background: #22d3ee;
    border-color: #22d3ee;
    font-weight: 700;
}
.idc-fp__legend { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #8aa0bd; }
.idc-fp__lg { display: inline-flex; align-items: center; gap: 5px; }
.idc-fp__lg i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.idc-fp__lg--bar i { width: 72px; height: 8px; border-radius: 4px; }
.idc-fp__ripple {
    background: #ff4d4f !important;
    border-radius: 50% !important;
    box-shadow: 0 0 0 3px rgba(255, 77, 79, .25);
}
.idc-fp__canvas { flex: 1; min-height: 0; }
</style>
