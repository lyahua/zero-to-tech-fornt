/**
 * ECharts 实例生命周期封装
 *
 * 三件事必须做对，否则会踩坑：
 * 1. 实例用 shallowRef 保存。用 ref 会让 Vue 深度代理 ECharts 实例，
 *    内部大量状态被反复劫持，表现为交互卡顿甚至状态错乱。
 * 2. 组件卸载必须 dispose，否则切换页面后 canvas 与显存不释放。
 * 3. 容器尺寸靠 ResizeObserver 驱动 resize，父级折叠/抽屉展开时才不会留白。
 *
 * 按需注册放在模块顶层，多次 import 幂等。
 */
import * as echarts from 'echarts/core';
import {
    BarChart,
    CustomChart,
    EffectScatterChart,
    GaugeChart,
    HeatmapChart,
    LineChart,
    LinesChart,
    MapChart,
    PieChart,
    ScatterChart,
} from 'echarts/charts';
import {
    DataZoomComponent,
    GeoComponent,
    GraphicComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    BarChart,
    CustomChart,
    EffectScatterChart,
    GaugeChart,
    HeatmapChart,
    LineChart,
    LinesChart,
    MapChart,
    PieChart,
    ScatterChart,
    DataZoomComponent,
    GeoComponent,
    GraphicComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    VisualMapComponent,
    CanvasRenderer,
]);

export type EChartsInstance = echarts.EChartsType;
export type EChartsOption = echarts.EChartsCoreOption;

/** 注册本地 GeoJSON，map 名与后续 geo.map / series.map 保持一致 */
export const registerMap = echarts.registerMap;

/** 事件绑定登记表：key 为事件名，value 为处理函数 */
export type ChartEvents = Record<string, (params: any) => void>;

export interface UseEchartOptions {
    /** 初始化主题，如 'dark' */
    theme?: string | object;
    /** 事件绑定，实例重建后会自动重绑 */
    events?: ChartEvents;
    /** 初始 option，容器就绪后立即应用 */
    option?: EChartsOption;
    /**
     * 容器尺寸变化回调。图表自身只 resize 不重算 option，
     * 需要按像素比例重算坐标轴的场景（如等比平面图）在这里重绘。
     */
    onResize?: () => void;
}

export function useEchart(
    elRef: Ref<HTMLElement | undefined | null>,
    options: UseEchartOptions = {}
) {
    const chart = shallowRef<EChartsInstance>();
    const events = options.events ?? {};
    let observer: ResizeObserver | null = null;

    const bindAll = (instance: EChartsInstance) => {
        Object.entries(events).forEach(([name, handler]) => instance.on(name, handler));
    };

    /** 记录上一次绘制用的尺寸，用于过滤 ResizeObserver 的无效回调 */
    let lastW = 0;
    let lastH = 0;

    /** 实例未就绪时暂存的 option */
    let pending: { option: EChartsOption; notMerge?: boolean | object } | null = null;

    const create = () => {
        const el = elRef.value;
        if (!el || chart.value) return;
        // 容器宽高为 0 时 init 会得到一个画不出来的实例
        if (!el.clientWidth || !el.clientHeight) return;
        chart.value = echarts.init(el, options.theme, { renderer: 'canvas' });
        lastW = el.clientWidth;
        lastH = el.clientHeight;
        bindAll(chart.value);
        if (options.option) chart.value.setOption(options.option);
        observe(el);
    };

    const observe = (el: HTMLElement) => {
        if (observer) observer.disconnect();
        // observe() 会立即回调一次，此时若刚 init 过就等于重复 resize，
        // ECharts 会报 "resize should not be called during main process"
        observer = new ResizeObserver(() => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            if (!w || !h || (w === lastW && h === lastH)) return;
            lastW = w;
            lastH = h;
            chart.value?.resize();
            options.onResize?.();
        });
        observer.observe(el);
    };

    const destroy = () => {
        observer?.disconnect();
        observer = null;
        chart.value?.dispose();
        chart.value = undefined;
    };

    const setOption = (option: EChartsOption, notMerge?: boolean | object) => {
        create();
        // 容器还没挂载（如 watch immediate 早于 mounted）时先缓存，
        // 否则这次 setOption 会被静默丢弃，挂载后图表一片空白
        if (!chart.value) {
            pending = { option, notMerge };
            return;
        }
        if (pending) {
            chart.value.setOption(pending.option, pending.notMerge as never);
            pending = null;
        }
        chart.value.setOption(option, notMerge as never);
    };

    const resize = () => chart.value?.resize();

    onMounted(() => {
        create();
        if (chart.value && pending) {
            chart.value.setOption(pending.option, pending.notMerge as never);
            pending = null;
        }
    });
    onBeforeUnmount(destroy);

    // 容器被 v-if 卸载再挂载时，旧实例已随 DOM 失效，需要重建
    watch(elRef, (el, prev) => {
        if (!el && prev) destroy();
        else if (el && !chart.value) create();
    });

    return { chart, setOption, resize, create, destroy };
}
