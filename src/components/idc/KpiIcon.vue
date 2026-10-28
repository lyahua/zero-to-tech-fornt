<template>
    <svg class="kpi-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <defs>
            <!--
                上亮下暗的描边渐变，让线性图标读出一根被顶光照到的凸起线条。
                坐标系必须用 userSpaceOnUse：默认的 objectBoundingBox 按每条 path
                自身的包围盒算，而「感叹号的点」「关机竖杠」这类笔画包围盒宽或高为 0，
                按规范此时渐变不渲染，整条 path 会直接消失。
            -->
            <linearGradient :id="gid" gradientUnits="userSpaceOnUse" x1="12" y1="2" x2="9" y2="22">
                <stop offset="0%" stop-color="currentColor" stop-opacity="1" />
                <stop offset="55%" stop-color="currentColor" stop-opacity="0.7" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.3" />
            </linearGradient>
        </defs>
        <path v-for="d in paths" :key="d" :d="d" :style="{ stroke: `url(#${gid})` }" />
    </svg>
</template>

<script setup lang="ts">
/**
 * 指标卡水印图标
 *
 * 统一 24×24 线性描边，颜色只取 currentColor，浓淡与定位由调用方决定，
 * 这样同一份图形既能压成背景水印，也能在需要时提亮当普通图标用。
 */
export type KpiIconName =
    | 'building'
    | 'rack'
    | 'gauge'
    | 'bolt'
    | 'trend'
    | 'warning'
    | 'power'
    | 'location'
    | 'check'
    | 'temp';

const ICONS: Record<KpiIconName, string[]> = {
    building: [
        'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16',
        'M14 9h4a2 2 0 0 1 2 2v10',
        'M2 21h20',
        'M8 7h2M8 11h2M8 15h2',
    ],
    rack: [
        'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
        'M4 9h16M4 15h16',
        'M8 6h4M8 12h4M8 18h4',
    ],
    gauge: ['M4 18a8 8 0 1 1 16 0', 'M12 18l3.6-4.2', 'M11 18h.01'],
    bolt: ['M13 2 4 14h6l-1 8 9-12h-6l1-8z'],
    trend: ['M3 17l6-6 4 4 7-7', 'M15 8h5v5'],
    warning: ['M10.3 3.95 2.05 18a2 2 0 0 0 1.7 3h16.5a2 2 0 0 0 1.7-3L13.7 3.95a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
    power: ['M18.36 6.64a9 9 0 1 1-12.73 0', 'M12 2v10'],
    location: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    check: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8.5 12.5l2.5 2.5 4.5-5.5'],
    temp: ['M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0z', 'M12 9v6.5'],
};

const props = defineProps<{ name: KpiIconName }>();

const paths = computed(() => ICONS[props.name] ?? []);

/**
 * 渐变 id 必须每实例唯一，否则同页多个图标会共用最先注册的那份 defs。
 * useId 带冒号，不是合法的 url(#...) 片段，必须洗掉。
 */
const gid = `kpi-ico-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
</script>

<style scoped lang="less">
.kpi-icon {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
}
</style>
