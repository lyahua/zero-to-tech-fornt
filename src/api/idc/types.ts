/**
 * 机房可视化的数据契约
 *
 * 视图层只依赖这里定义的结构，不关心数据来自 mock 还是后端。
 * 换真实接口时只改 src/api/idc/index.ts，类型保持稳定。
 */

/** 运行状态，机柜 / 设备 / 站点共用一套语义 */
export type RunStatus = 'normal' | 'warning' | 'alarm' | 'offline';

/** 站点等级：核心 / 区域 / 边缘 */
export type SiteLevel = 'core' | 'region' | 'edge';

/** 机柜内的设备类型 */
export type DeviceType = 'server' | 'storage' | 'network' | 'security';

/** 站点（一个城市机房群） */
export interface Site {
    id: string;
    name: string;
    /** 行政区划码，地图下钻与 region 匹配的唯一可靠键 */
    adcode: string;
    province: string;
    city: string;
    /** 省行政区划码，全国视图按它给省份着色 */
    provinceAdcode: string;
    /** 站点在地图上的定位点，WGS-84 经纬度 */
    lng: number;
    lat: number;
    /** 机房数量 */
    roomCount: number;
    /** 站点状态取其下最严重的机房状态 */
    status: RunStatus;
    rackTotal: number;
    rackOnline: number;
    uUsed: number;
    uTotal: number;
    powerKw: number;
    ratedPowerKw: number;
    /** 电源使用效率 */
    pue: number;
    tempAvg: number;
    humidity: number;
    alarmCount: number;
    offlineCount: number;
    rooms: MachineRoom[];
}

/** 站点间骨干链路 */
export interface Link {
    from: string;
    to: string;
    /** 带宽 Mbps */
    bwMbps: number;
    /** 当前利用率百分比 */
    usedPct: number;
    status: RunStatus;
}

/** 机房 */
export interface MachineRoom {
    id: string;
    name: string;
    siteId: string;
    /** 机房定位点，城市级地图的散点坐标 */
    lng: number;
    lat: number;
    /** 平面图的物理尺寸，单位米 */
    width: number;
    depth: number;
    status: RunStatus;
    rackTotal: number;
    uUsed: number;
    uTotal: number;
    powerKw: number;
    ratedPowerKw: number;
    tempAvg: number;
    pue: number;
    alarmCount: number;
}

/** 机柜内设备 */
export interface Device {
    id: string;
    name: string;
    model: string;
    type: DeviceType;
    /** 起始 U 位，1 表示最底层 */
    uStart: number;
    /** 占用 U 数 */
    uSize: number;
    status: RunStatus;
}

/** 机柜 */
export interface Rack {
    id: string;
    siteId: string;
    roomId: string;
    /** 所属排列号 */
    row: string;
    /** 该排列内的序号，从 1 开始 */
    rowIndex: number;
    /** 平面图坐标，单位米 */
    x: number;
    z: number;
    /** 机柜朝向，弧度 */
    rot: number;
    status: RunStatus;
    uUsed: number;
    uTotal: number;
    powerKw: number;
    ratedPowerKw: number;
    loadPct: number;
    tempIn: number;
    tempOut: number;
    humidity: number;
    devices: Device[];
}

/** 平面图里的功能分区 */
export interface Zone {
    id: string;
    label: string;
    x0: number;
    x1: number;
    z0: number;
    z1: number;
}

/** 机房平面图 */
export interface Floorplan {
    roomId: string;
    roomName: string;
    siteId: string;
    siteName: string;
    room: { w: number; d: number };
    zones: Zone[];
    /** 冷热通道，axis 为 z 表示沿 z 方向延伸的横向通道 */
    aisles: { axis: 'x' | 'z'; at: number; width: number; label: string }[];
    racks: Rack[];
}

/** 全国汇总 */
export interface Summary {
    siteTotal: number;
    roomTotal: number;
    rackTotal: number;
    rackOnline: number;
    uUsed: number;
    uTotal: number;
    powerKw: number;
    ratedPowerKw: number;
    avgPue: number;
    alarmCount: number;
    offlineCount: number;
}

/** 告警条目 */
export interface Alarm {
    id: string;
    siteId: string;
    siteName: string;
    roomId: string;
    rackId: string;
    level: 'info' | 'warning' | 'critical';
    title: string;
    detail: string;
    /** 毫秒时间戳 */
    ts: number;
}

/** 实时指标快照 */
export interface Metrics {
    summary: Summary;
    sites: Site[];
    /** 站点间骨干链路，状态取两端站点中较坏的一个 */
    links: Link[];
    alarms: Alarm[];
    /** 毫秒时间戳 */
    ts: number;
}

/** 指标订阅回调，返回解绑函数 */
export type MetricsListener = (m: Metrics) => void;
