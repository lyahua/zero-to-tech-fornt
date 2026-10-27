/**
 * 机房可视化数据入口
 *
 * 视图层只 import 本文件。当前实现走 mock/runtime，
 * 接真实后端时把下面几个函数换成 request 调用即可，函数签名保持不变。
 */
import type { Floorplan, Metrics, MetricsListener, Site } from './types';
import {
    getFloorplan as readFloorplan,
    getMetrics,
    listRooms,
    subscribe,
} from './mock/runtime';

export type {
    Alarm,
    Device,
    DeviceType,
    Floorplan,
    Link,
    MachineRoom,
    Metrics,
    MetricsListener,
    Rack,
    RunStatus,
    Site,
    SiteLevel,
    Summary,
    Zone,
} from './types';
export { DEVICE_TYPE_LABEL, STATUS_LABEL } from './mock/geo';

/**
 * 加载行政区划边界
 *
 * 必须用 BASE_URL 拼接：项目 base 为相对路径且使用 hash 路由，
 * 直接 fetch('geo/xx.json') 会跟着当前 URL 解析，刷新即 404。
 */
export async function getGeoJson(adcode: string): Promise<unknown> {
    const url = `${import.meta.env.BASE_URL}geo/${adcode}_full.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`加载地图数据失败：${adcode}（${res.status}）`);
    return res.json();
}

/** 全国汇总 + 各站点当前指标 */
export function getMetricsSnapshot(): Metrics {
    return getMetrics();
}

/** 订阅实时指标，返回解绑函数 */
export function subscribeMetrics(listener: MetricsListener): () => void {
    return subscribe(listener);
}

/** 站点列表 */
export function getSites(): Site[] {
    return getMetrics().sites;
}

/** 按行政区划码取站点 */
export function getSiteByAdcode(adcode: string): Site | undefined {
    return getMetrics().sites.find(s => s.adcode === adcode);
}

/** 按站点 id 取站点 */
export function getSiteById(id: string): Site | undefined {
    return getMetrics().sites.find(s => s.id === id);
}

/** 机房简表，用于页面上的机房切换 */
export function getRooms() {
    return listRooms();
}

/** 机房平面图 */
export function getFloorplan(roomId: string): Floorplan | null {
    // 真实接口形如：return get('/idc/room/floorplan', { roomId })
    return readFloorplan(roomId);
}
