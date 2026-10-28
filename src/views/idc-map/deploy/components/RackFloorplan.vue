<template>
    <div class="floorplan">
        <div class="floorplan__bar">
            <el-radio-group v-model="colorMode" size="small">
                <el-radio-button value="temp">温度</el-radio-button>
                <el-radio-button value="status">状态</el-radio-button>
                <el-radio-button value="u">U 位</el-radio-button>
            </el-radio-group>
            <div class="floorplan__legend">
                <template v-if="colorMode === 'temp'">
                    <span v-for="t in TEMP_LEGEND" :key="t.v" class="floorplan__legend-item">
                        <i :style="{ background: tempColor(t.v) }" />{{ t.label }}
                    </span>
                </template>
                <template v-else-if="colorMode === 'status'">
                    <span v-for="(c, k) in STATUS_COLOR" :key="k" class="floorplan__legend-item">
                        <i :style="{ background: c }" />{{ STATUS_LABEL[k as RunStatus] }}
                    </span>
                </template>
                <span class="floorplan__hint">滚轮缩放 / 拖拽平移 / 点击机柜看设备</span>
            </div>
        </div>
        <div ref="chartEl" class="floorplan__canvas" />
    </div>
</template>

<script setup lang="ts">
/**
 * 机房平面布置图（ECharts custom series）
 *
 * 坐标系用米制 value 轴：机柜坐标、通道、分区都按真实物理尺寸画，
 * 缩放平移交给 dataZoom，不需要自己实现变换矩阵。
 */
import type { Floorplan, Rack, RunStatus } from '@/api/idc';
import { STATUS_LABEL } from '@/api/idc';
import { STATUS_COLOR, tempColor } from '@/api/idc/palette';
import { rackSize } from '@/api/idc/mock/runtime';
import { useEchart } from '@/javascript/hooks/useEchart';

const props = defineProps<{
    plan: Floorplan;
    selectedId?: string;
}>();

const emit = defineEmits<{ (e: 'pick', rack: Rack): void }>();

type ColorMode = 'temp' | 'status' | 'u';

const TEMP_LEGEND = [
    { v: 22, label: '≤22℃' },
    { v: 25, label: '25℃' },
    { v: 27.5, label: '27℃' },
    { v: 30, label: '30℃' },
    { v: 32, label: '≥32℃' },
];

const colorMode = ref<ColorMode>('temp');
const chartEl = ref<HTMLElement>();

/** grid 内边距，与下面 option.grid 保持一致 */
const GRID = { left: 40, right: 18, top: 20, bottom: 30 };

const rackColor = (r: Rack) => {
    if (colorMode.value === 'status' || r.status === 'offline') return STATUS_COLOR[r.status];
    if (colorMode.value === 'u') {
        const p = r.uTotal ? r.uUsed / r.uTotal : 0;
        return `hsl(${210 - p * 180}, 70%, ${38 + p * 14}%)`;
    }
    return tempColor(r.tempIn);
};

const { setOption } = useEchart(chartEl, {
    events: {
        click: (params: any) => {
            if (params.componentType === 'series' && params.data?.rack) emit('pick', params.data.rack);
        },
    },
    // 轴范围只跟机房物理尺寸有关，重绘只为让 custom series 按新像素密度重算机柜矩形
    onResize: () => render(),
});

function renderItem(params: any, api: any) {
    // 直接用 dataIndex 回查原始对象，避免依赖「value 数组里塞对象」这种非官方写法
    const rack = props.plan.racks[params.dataIndex];
    if (!rack) return;
    const selected = rack.id === props.selectedId;
    const [cx, cy] = api.coord([rack.x, -rack.z]);
    // 两轴各自换算像素：x 轴铺满绘图区宽度，机柜才会呈扁平矩形而非方块
    const wPx = api.size([rackSize.w, 0])[0];
    const hPx = api.size([0, rackSize.d])[1];

    const rect = {
        type: 'rect',
        shape: {
            x: cx - wPx / 2,
            y: cy - hPx / 2,
            width: wPx,
            height: hPx,
            r: 2,
        },
        style: api.style(),
        styleEmphasis: api.styleEmphasis(),
    };
    const text = {
        type: 'text',
        style: {
            x: cx,
            y: cy,
            text: rack.id,
            textAlign: 'center',
            textVerticalAlign: 'middle',
            fill: '#0b1220',
            fontSize: Math.max(9, Math.min(13, hPx * 0.5)),
            fontWeight: 600,
        },
        silent: true,
    };
    return {
        type: 'group',
        children: [
            rect,
            text,
            // 选中描边单独叠一层，不改 rect 的 style，避免整条 series 重绘
            ...(selected
                ? [
                      {
                          type: 'rect',
                          shape: { ...rect.shape, r: 3 },
                          style: { fill: 'transparent', stroke: '#f8fafc', lineWidth: 2 },
                          silent: true,
                      },
                  ]
                : []),
        ],
    };
}

/** 轴端点保留一位小数，避免浮点尾数直接出现在刻度标签上 */
const round1 = (n: number) => Math.round(n * 10) / 10;

function render() {
    const { plan } = props;
    const pad = 1.5;

    // 两轴各自按物理尺寸铺满绘图区：不再做等比反推，
    // 否则宽扁容器会把 y 轴范围撑大，机柜被压成正方形小块
    const xSpan = plan.room.w + pad * 2;
    const ySpan = plan.room.d + pad * 2;
    const xMin = round1(-xSpan / 2);
    const xMax = round1(xSpan / 2);
    const yMin = round1(-ySpan / 2);
    const yMax = round1(ySpan / 2);
    const xInterval = xSpan > 26 ? 6 : 4;
    const yInterval = ySpan > 26 ? 6 : 4;

    setOption(
        {
            backgroundColor: '#0b1220',
            animation: false,
            grid: { ...GRID, containLabel: false },
            tooltip: {
                backgroundColor: 'rgba(17,26,46,.94)',
                borderColor: '#1e293b',
                textStyle: { color: '#cbd5e1', fontSize: 12 },
                formatter: (p: any) => {
                    const r: Rack | undefined = p.data?.rack;
                    if (!r) return '';
                    return [
                        `<b>${r.id}</b>（${STATUS_LABEL[r.status]}）`,
                        `进风/出风：${r.tempIn}℃ / ${r.tempOut}℃`,
                        `功率：${r.powerKw}/${r.ratedPowerKw} kW（${r.loadPct}%）`,
                        `U 位：${r.uUsed}/${r.uTotal}（设备 ${r.devices.length} 台）`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                min: xMin,
                max: xMax,
                interval: xInterval,
                axisLabel: {
                    color: '#64748b',
                    fontSize: 10,
                    formatter: (v: number) => `${round1(v)}m`,
                },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#141e33' } },
            },
            yAxis: {
                type: 'value',
                min: yMin,
                max: yMax,
                interval: yInterval,
                axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${round1(v)}` },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#141e33' } },
            },
            dataZoom: [
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
                { type: 'inside', yAxisIndex: 0, filterMode: 'none' },
            ],
            series: [
                {
                    // 功能分区与墙体：静态底图，不参与交互
                    id: 'structure',
                    type: 'custom',
                    coordinateSystem: 'cartesian2d',
                    silent: true,
                    z: 1,
                    renderItem: (_p: any, api: any) => {
                        const { plan: p } = props;
                        const children: any[] = [];
                        // 外墙
                        children.push({
                            type: 'rect',
                            shape: {
                                x: api.coord([-p.room.w / 2, 0])[0],
                                y: api.coord([0, -p.room.d / 2])[1],
                                width: api.coord([p.room.w / 2, 0])[0] - api.coord([-p.room.w / 2, 0])[0],
                                height:
                                    api.coord([0, p.room.d / 2])[1] - api.coord([0, -p.room.d / 2])[1],
                            },
                            style: { fill: 'transparent', stroke: '#2b3d5c', lineWidth: 2 },
                        });
                        // 分区：虚线框 + 左侧标签。标签靠左是因为主机区与机柜行同高，
                        // 居中会把文字压在机柜上，机房左侧本就留有一条空白走道
                        p.zones.forEach(z => {
                            const [bx0, by0] = api.coord([z.x0, -z.z1]);
                            const [bx1, by1] = api.coord([z.x1, -z.z0]);
                            children.push({
                                type: 'rect',
                                shape: { x: bx0, y: by0, width: bx1 - bx0, height: by1 - by0 },
                                style: {
                                    fill: 'transparent',
                                    stroke: '#1c2942',
                                    lineWidth: 1,
                                    lineDash: [4, 4],
                                },
                            });
                            children.push({
                                type: 'text',
                                style: {
                                    x: bx0 + 6,
                                    y: (by0 + by1) / 2,
                                    text: z.label,
                                    textAlign: 'left',
                                    textVerticalAlign: 'middle',
                                    fill: '#475569',
                                    fontSize: 11,
                                },
                            });
                        });
                        // 通道底色：冷热通道交替，帮助判断风向组织
                        p.aisles.forEach(a => {
                            const half = a.width / 2 - 0.15;
                            const [x0] = api.coord([-p.room.w / 2 + 0.4, 0]);
                            const [x1] = api.coord([p.room.w / 2 - 0.4, 0]);
                            const [y0, y1] = [api.coord([0, -(a.at + half)])[1], api.coord([0, -(a.at - half)])[1]];
                            children.push({
                                type: 'rect',
                                shape: { x: x0, y: Math.min(y0, y1), width: x1 - x0, height: Math.abs(y1 - y0) },
                                style: {
                                    fill: a.label === '冷通道' ? 'rgba(56,189,248,0.07)' : 'rgba(239,68,68,0.05)',
                                },
                            });
                        });
                        return { type: 'group', children };
                    },
                    data: [0],
                },
                {
                    id: 'racks',
                    type: 'custom',
                    coordinateSystem: 'cartesian2d',
                    z: 2,
                    renderItem,
                    data: props.plan.racks.map(r => ({
                        // y 取负值：平面图 z 轴向前，转换成 ECharts 向上的屏幕坐标
                        value: [r.x, -r.z],
                        rack: r,
                        itemStyle: {
                            color: rackColor(r),
                            borderColor: '#0b1220',
                            borderWidth: 1,
                            opacity: r.status === 'offline' ? 0.45 : 1,
                        },
                    })),
                },
            ],
        },
        { notMerge: false }
    );
}

watch(() => [props.plan, props.selectedId, colorMode.value], render, { deep: true, immediate: true });
onMounted(render);
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.floorplan {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;

    &__bar {
        display: flex;
        align-items: center;
        gap: @gap-lg;
        padding: @gap-sm @gap-md;
        border-bottom: 1px solid @idc-border;
    }

    &__legend {
        display: flex;
        align-items: center;
        gap: @gap-md;
        flex: 1;
        font-size: @font-sm;
        color: @idc-text-dim;
    }

    &__legend-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;

        i {
            width: 10px;
            height: 10px;
            border-radius: 2px;
        }
    }

    &__hint {
        margin-left: auto;
        font-size: @font-xs;
    }

    &__canvas {
        flex: 1;
        min-height: 360px;
    }
}
</style>
