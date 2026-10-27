<template>
    <div class="geo-map">
        <div class="geo-map__crumb">
            <el-breadcrumb separator="/">
                <el-breadcrumb-item>
                    <a @click="emit('back')">全国</a>
                </el-breadcrumb-item>
                <el-breadcrumb-item v-if="site">{{ site.name }}</el-breadcrumb-item>
            </el-breadcrumb>
            <el-button v-if="site" size="small" text @click="emit('back')">返回全国</el-button>
        </div>
        <div ref="mapEl" class="geo-map__canvas" />
        <div v-if="loading" class="geo-map__mask">地图数据加载中…</div>
        <div v-if="error" class="geo-map__mask geo-map__mask--error">{{ error }}</div>
    </div>
</template>

<script setup lang="ts">
/**
 * 全国 → 城市 两级机房分布地图
 *
 * 地图数据来自 public/geo 下的本地 GeoJSON，不请求外网：
 * 内网部署拿不到 DataV 的 CDN，外链地图必然白屏。
 */
import { getGeoJson, getMetricsSnapshot, subscribeMetrics } from '@/api/idc';
import { CANVAS, STATUS_COLOR } from '@/api/idc/palette';
import type { Site } from '@/api/idc';
import { registerMap, useEchart } from '@/javascript/hooks/useEchart';

const props = defineProps<{ siteAdcode?: string }>();
const emit = defineEmits<{
    (e: 'drill', adcode: string): void;
    (e: 'back'): void;
    (e: 'pick-room', roomId: string): void;
}>();

const mapEl = ref<HTMLElement>();
const loading = ref(false);
const error = ref('');
const site = ref<Site>();

/**
 * 已成功渲染的地图名
 *
 * subscribeMetrics 订阅时会同步回调一次，此时 GeoJSON 还在 fetch，
 * 直接 setOption 会报 "Map not exists" 并打断首帧渲染，必须靠它拦掉。
 */
const drawnMap = ref('');

/** 已注册过的地图，避免同一份 GeoJSON 反复 registerMap */
const registered = new Set<string>();

const { setOption } = useEchart(mapEl, {
    events: {
        click: (params: any) => {
            // 机房散点优先级最高：城市视图里直接进平面布置图
            if (params.componentType === 'series' && params.data?.roomId) {
                emit('pick-room', params.data.roomId);
                return;
            }
            if (params.componentType === 'series' && params.data?.adcode) {
                emit('drill', String(params.data.adcode));
                return;
            }
            // 省份点击只能拿到名称，用名称反查 adcode，命中站点所在省才下钻
            if (params.componentType === 'geo') {
                const hit = getMetricsSnapshot().sites.find(s => s.province === params.name);
                if (hit) emit('drill', hit.adcode);
            }
        },
    },
});

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** 站点散点：异常站点单独走 effectScatter，正常站点用普通 scatter */
function sitePoints(sites: Site[]) {
    const normal: any[] = [];
    const bad: any[] = [];
    for (const s of sites) {
        const item = {
            name: s.name,
            value: [s.lng, s.lat, s.rackTotal],
            adcode: s.adcode,
            status: s.status,
            uPct: pct(s.uUsed, s.uTotal),
            alarmCount: s.alarmCount,
        };
        (s.status === 'alarm' || s.status === 'warning' ? bad : normal).push(item);
    }
    return { normal, bad };
}

/** 全国视图：省份底色 + 站点散点 + 骨干链路 */
async function renderNational() {
    loading.value = true;
    error.value = '';
    try {
        if (!registered.has('100000')) {
            registerMap('100000', (await getGeoJson('100000')) as any);
            registered.add('100000');
        }
        const m = getMetricsSnapshot();
        const { normal, bad } = sitePoints(m.sites);
        const byId = new Map(m.sites.map(s => [s.id, s]));

        const linkLines = m.links
            .map(l => {
                const a = byId.get(l.from);
                const b = byId.get(l.to);
                if (!a || !b) return null;
                return {
                    coords: [
                        [a.lng, a.lat],
                        [b.lng, b.lat],
                    ],
                    link: l,
                    lineStyle: { color: STATUS_COLOR[l.status] },
                };
            })
            .filter(Boolean);

        setOption(
            {
                backgroundColor: CANVAS.bg,
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(17,26,46,.94)',
                    borderColor: CANVAS.border,
                    textStyle: { color: CANVAS.text, fontSize: 12 },
                    formatter: (params: any) => {
                        const d = params.data ?? {};
                        if (params.seriesType === 'lines') {
                            const l = d.link ?? {};
                            return `带宽：${(l.bwMbps / 1000).toFixed(0)} Gbps<br/>利用率：${l.usedPct}%`;
                        }
                        if (params.componentType === 'series') {
                            return [
                                `<b>${params.name}</b>`,
                                `机柜：${d.value?.[2] ?? '-'} 台`,
                                `U 位占用：${d.uPct ?? '-'}%`,
                                `告警：${d.alarmCount ?? 0} 条`,
                                `<span style="color:#64748b">点击进入城市视图</span>`,
                            ].join('<br/>');
                        }
                        return params.name;
                    },
                },
                geo: {
                    map: '100000',
                    roam: true,
                    zoom: 1.15,
                    center: [104.5, 36],
                    label: { show: false },
                    itemStyle: {
                        areaColor: '#152238',
                        borderColor: '#2b3d5c',
                        borderWidth: 0.8,
                    },
                    emphasis: {
                        label: { show: true, color: '#e2e8f0', fontSize: 11 },
                        itemStyle: { areaColor: '#1e3a5f' },
                    },
                    // 有站点的省份按状态着色。用 regions 而不是另挂 series，
                    // 避免地图被覆盖后点不中区域
                    regions: m.sites.map(s => ({
                        name: s.province,
                        itemStyle: { areaColor: `${STATUS_COLOR[s.status]}44` },
                    })),
                },
                series: [
                    {
                        id: 'links',
                        type: 'lines',
                        coordinateSystem: 'geo',
                        geoIndex: 0,
                        zlevel: 1,
                        effect: { show: true, period: 5, trailLength: 0.35, symbolSize: 4, color: '#7dd3fc' },
                        lineStyle: { width: 1.4, opacity: 0.7, curveness: 0.22 },
                        data: linkLines,
                    },
                    {
                        id: 'site-normal',
                        type: 'scatter',
                        coordinateSystem: 'geo',
                        geoIndex: 0,
                        zlevel: 2,
                        symbolSize: (v: number[]) => 8 + Math.min(14, (v[2] ?? 0) / 6),
                        itemStyle: { color: STATUS_COLOR.normal, borderColor: '#0b1220', borderWidth: 1 },
                        label: {
                            show: true,
                            position: 'right',
                            formatter: '{b}',
                            color: '#94a3b8',
                            fontSize: 11,
                        },
                        data: normal,
                    },
                    {
                        id: 'site-bad',
                        type: 'effectScatter',
                        coordinateSystem: 'geo',
                        geoIndex: 0,
                        zlevel: 3,
                        rippleEffect: { brushType: 'stroke', scale: 3.2 },
                        symbolSize: (v: number[]) => 10 + Math.min(14, (v[2] ?? 0) / 6),
                        label: {
                            show: true,
                            position: 'right',
                            formatter: '{b}',
                            color: '#fca5a5',
                            fontSize: 11,
                        },
                        data: bad,
                    },
                ],
            },
            // 切图必须 notMerge，否则上一级 series 会残留在新地图上
            { notMerge: true }
        );
        drawnMap.value = '100000';
    } catch (e) {
        error.value = (e as Error).message;
    } finally {
        loading.value = false;
    }
}

/** 城市视图：区县底图 + 机房散点 */
async function renderCity(adcode: string) {
    loading.value = true;
    error.value = '';
    try {
        const hit = getMetricsSnapshot().sites.find(s => s.adcode === adcode);
        if (!hit) {
            error.value = `暂无 ${adcode} 的机房数据`;
            return;
        }
        if (!registered.has(adcode)) {
            registerMap(adcode, (await getGeoJson(adcode)) as any);
            registered.add(adcode);
        }
        site.value = hit;

        const rooms = hit.rooms.map(r => ({
            name: r.name,
            value: [r.lng, r.lat, r.rackTotal],
            roomId: r.id,
            status: r.status,
            uPct: pct(r.uUsed, r.uTotal),
            powerKw: r.powerKw,
            tempAvg: r.tempAvg,
        }));

        setOption(
            {
                backgroundColor: CANVAS.bg,
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(17,26,46,.94)',
                    borderColor: CANVAS.border,
                    textStyle: { color: CANVAS.text, fontSize: 12 },
                    formatter: (params: any) => {
                        const d = params.data ?? {};
                        if (!d.roomId) return params.name;
                        return [
                            `<b>${params.name}</b>`,
                            `机柜：${d.value?.[2] ?? '-'} 台`,
                            `U 位占用：${d.uPct}%`,
                            `功率：${d.powerKw} kW`,
                            `平均进风：${d.tempAvg}℃`,
                            `<span style="color:#64748b">点击进入平面布置图</span>`,
                        ].join('<br/>');
                    },
                },
                geo: {
                    map: adcode,
                    roam: true,
                    zoom: 1.12,
                    label: { show: true, color: '#64748b', fontSize: 10 },
                    itemStyle: {
                        areaColor: '#152238',
                        borderColor: '#2b3d5c',
                        borderWidth: 0.8,
                    },
                    emphasis: {
                        label: { show: true, color: '#e2e8f0' },
                        itemStyle: { areaColor: '#1e3a5f' },
                    },
                },
                series: [
                    {
                        id: 'rooms',
                        type: 'effectScatter',
                        coordinateSystem: 'geo',
                        geoIndex: 0,
                        rippleEffect: { brushType: 'stroke', scale: 3 },
                        symbolSize: (v: number[]) => 12 + Math.min(16, (v[2] ?? 0) / 3),
                        itemStyle: {
                            color: (p: any) =>
                                STATUS_COLOR[(p.data?.status ?? 'normal') as keyof typeof STATUS_COLOR],
                            borderColor: '#0b1220',
                            borderWidth: 1,
                        },
                        label: {
                            show: true,
                            position: 'right',
                            formatter: '{b}',
                            color: '#cbd5e1',
                            fontSize: 11,
                        },
                        data: rooms,
                    },
                ],
            },
            { notMerge: true }
        );
        drawnMap.value = adcode;
    } catch (e) {
        error.value = (e as Error).message;
    } finally {
        loading.value = false;
    }
}

/**
 * 定时刷新只替换 series 数据（merge 模式，按 series.id 命中）。
 * 整图 notMerge 重设会把用户缩放平移过的视角弹回初始状态。
 */
function patch() {
    // 目标地图尚未画好（首帧 GeoJSON 还在加载 / 正在切换），等渲染完成后自然带上最新数据
    if (drawnMap.value !== (props.siteAdcode || '100000')) return;
    const m = getMetricsSnapshot();
    if (!props.siteAdcode) {
        const { normal, bad } = sitePoints(m.sites);
        const byId = new Map(m.sites.map(s => [s.id, s]));
        const linkLines = m.links
            .map(l => {
                const a = byId.get(l.from);
                const b = byId.get(l.to);
                if (!a || !b) return null;
                return {
                    coords: [
                        [a.lng, a.lat],
                        [b.lng, b.lat],
                    ],
                    link: l,
                    lineStyle: { color: STATUS_COLOR[l.status] },
                };
            })
            .filter(Boolean);
        setOption({
            geo: {
                regions: m.sites.map(s => ({
                    name: s.province,
                    itemStyle: { areaColor: `${STATUS_COLOR[s.status]}44` },
                })),
            },
            series: [
                { id: 'links', data: linkLines },
                { id: 'site-normal', data: normal },
                { id: 'site-bad', data: bad },
            ],
        });
        return;
    }
    const hit = m.sites.find(s => s.adcode === props.siteAdcode);
    if (!hit) return;
    site.value = hit;
    setOption({
        series: [
            {
                id: 'rooms',
                data: hit.rooms.map(r => ({
                    name: r.name,
                    value: [r.lng, r.lat, r.rackTotal],
                    roomId: r.id,
                    status: r.status,
                    uPct: pct(r.uUsed, r.uTotal),
                    powerKw: r.powerKw,
                    tempAvg: r.tempAvg,
                })),
            },
        ],
    });
}

watch(
    () => props.siteAdcode,
    adcode => (adcode ? renderCity(adcode) : renderNational()),
    { immediate: true }
);

let unsubscribe: (() => void) | null = null;
onMounted(() => {
    unsubscribe = subscribeMetrics(patch);
});
onBeforeUnmount(() => {
    unsubscribe?.();
    unsubscribe = null;
});
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.geo-map {
    position: relative;
    height: 100%;
    min-height: 420px;
    background: #0b1220;

    &__canvas {
        width: 100%;
        height: 100%;
    }

    &__crumb {
        position: absolute;
        top: 12px;
        left: 16px;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: @gap-md;
    }

    &__mask {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: @text-secondary;
        background: rgba(11, 18, 32, 0.6);

        &--error {
            color: #f87171;
        }
    }
}

:deep(.el-breadcrumb__inner),
:deep(.el-breadcrumb__inner a) {
    color: @text-secondary;
}
</style>
