/**
 * 机房可视化的配色约定
 *
 * 状态色与温度色阶在平面图、地图、抽屉里必须一致，
 * 否则同一个机柜在两处颜色不同，看的人会误判。
 */
import type { DeviceType, RunStatus } from './types';

export const STATUS_COLOR: Record<RunStatus, string> = {
    normal: '#22c55e',
    warning: '#eab308',
    alarm: '#ef4444',
    offline: '#64748b',
};

export const DEVICE_COLOR: Record<DeviceType, string> = {
    server: '#3b82f6',
    storage: '#8b5cf6',
    network: '#06b6d4',
    security: '#f97316',
};

/** 地图底色，与平面图共用，保证两页视觉连续 */
export const CANVAS = {
    bg: '#0b1220',
    panel: '#111a2e',
    border: '#1e293b',
    text: '#cbd5e1',
    textDim: '#64748b',
    accent: '#38bdf8',
};

/** 温度色阶：进风温度 ℃ → 颜色 */
const TEMP_STOPS: [number, string][] = [
    [21.5, '#3b82f6'],
    [24.5, '#22d3ee'],
    [27, '#22c55e'],
    [29, '#eab308'],
    [30.5, '#f59e0b'],
    [32, '#ef4444'],
];

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number) {
    return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** 线性插值取温度色，超出两端取端点色 */
export function tempColor(t: number): string {
    if (t <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1];
    const last = TEMP_STOPS[TEMP_STOPS.length - 1];
    if (t >= last[0]) return last[1];
    for (let i = 0; i < TEMP_STOPS.length - 1; i += 1) {
        const [v0, c0] = TEMP_STOPS[i];
        const [v1, c1] = TEMP_STOPS[i + 1];
        if (t >= v0 && t <= v1) {
            const k = (t - v0) / (v1 - v0);
            const a = hexToRgb(c0);
            const b = hexToRgb(c1);
            return rgbToHex(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
        }
    }
    return last[1];
}

export const TEMP_GRADIENT = TEMP_STOPS.map(([v, c]) => `${c} ${v}℃`).join(' → ');
