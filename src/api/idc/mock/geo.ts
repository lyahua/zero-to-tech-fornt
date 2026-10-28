/**
 * 站点静态台账（mock）
 *
 * 真实项目里这部分来自 CMDB 接口，只保留「不随时间变化」的字段；
 * 功耗、温度、告警数等动态指标由 mock/runtime.ts 推进。
 */
import type { DeviceType, RunStatus, SiteLevel } from '../types';

/** 排列配置：排列号 + 该排列的机柜数 */
export interface RowSpec {
    row: string;
    count: number;
}

/** 机房静态定义 */
export interface RoomSpec {
    id: string;
    name: string;
    siteId: string;
    level: SiteLevel;
    /** 机房定位点，城市级地图的散点坐标 */
    lng: number;
    lat: number;
    rows: RowSpec[];
    /** 额定功率，单机柜 kW */
    ratedPowerPerRackKw: number;
    /** 人为指定的告警机柜，用于演示告警链路 */
    alarmRacks?: string[];
    /** 人为指定的离线机柜 */
    offlineRacks?: string[];
}

/** 站点静态定义 */
export interface SiteSpec {
    id: string;
    name: string;
    adcode: string;
    province: string;
    city: string;
    provinceAdcode: string;
    lng: number;
    lat: number;
    level: SiteLevel;
    pue: number;
    rooms: RoomSpec[];
}

/** 机柜 U 位总数 */
export const U_TOTAL = 42;

/** 机柜外形尺寸（米）：宽沿 x，深沿 z */
export const RACK_W = 1.2;
export const RACK_D = 1.1;

/** 同排列内机柜中心间距（米） */
export const RACK_PITCH_X = 1.9;

/** 相邻排列中心间距（米） */
export const ROW_PITCH_Z = 3.0;

/** 设备类型池，权重按出现次数体现 */
export const DEVICE_TYPES: DeviceType[] = [
    'server',
    'server',
    'server',
    'server',
    'storage',
    'storage',
    'network',
    'security',
];

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
    server: '服务器',
    storage: '存储',
    network: '网络',
    security: '安全',
};

export const STATUS_LABEL: Record<RunStatus, string> = {
    normal: '正常',
    warning: '预警',
    alarm: '告警',
    offline: '离线',
};

export const SITES: SiteSpec[] = [
    {
        id: 'ZH',
        name: '珠海机房',
        adcode: '440400',
        province: '广东省',
        city: '珠海市',
        provinceAdcode: '440000',
        lng: 113.57,
        lat: 22.27,
        level: 'core',
        pue: 1.38,
        rooms: [
            {
                id: 'ZH-R1',
                name: '珠海一号机房',
                siteId: 'ZH',
                level: 'core',
                lng: 113.543,
                lat: 22.221,
                rows: [
                    { row: 'A', count: 8 },
                    { row: 'B', count: 8 },
                    { row: 'C', count: 8 },
                    { row: 'D', count: 8 },
                ],
                ratedPowerPerRackKw: 8,
                alarmRacks: ['B-03', 'D-06'],
                offlineRacks: ['C-07'],
            },
            {
                id: 'ZH-R2',
                name: '珠海二号机房',
                siteId: 'ZH',
                level: 'region',
                lng: 113.574,
                lat: 22.271,
                rows: [
                    { row: 'A', count: 6 },
                    { row: 'B', count: 6 },
                    { row: 'C', count: 6 },
                ],
                ratedPowerPerRackKw: 6,
                alarmRacks: ['C-02'],
            },
        ],
    },
    {
        id: 'HZ',
        name: '杭州机房',
        adcode: '330100',
        province: '浙江省',
        city: '杭州市',
        provinceAdcode: '330000',
        lng: 120.21,
        lat: 30.25,
        level: 'core',
        pue: 1.41,
        rooms: [
            {
                id: 'HZ-R1',
                name: '杭州一号机房',
                siteId: 'HZ',
                level: 'core',
                lng: 120.21,
                lat: 30.25,
                rows: [
                    { row: 'A', count: 8 },
                    { row: 'B', count: 8 },
                    { row: 'C', count: 8 },
                    { row: 'D', count: 8 },
                    { row: 'E', count: 8 },
                    { row: 'F', count: 8 },
                ],
                ratedPowerPerRackKw: 10,
                alarmRacks: ['A-05', 'C-01', 'E-04'],
                offlineRacks: ['F-08'],
            },
            {
                id: 'HZ-R2',
                name: '杭州二号机房',
                siteId: 'HZ',
                level: 'region',
                lng: 120.32,
                lat: 30.28,
                rows: [
                    { row: 'A', count: 7 },
                    { row: 'B', count: 7 },
                    { row: 'C', count: 7 },
                    { row: 'D', count: 7 },
                ],
                ratedPowerPerRackKw: 8,
                alarmRacks: ['B-05'],
            },
        ],
    },
    {
        id: 'CD',
        name: '成都机房',
        adcode: '510100',
        province: '四川省',
        city: '成都市',
        provinceAdcode: '510000',
        lng: 104.07,
        lat: 30.57,
        level: 'region',
        pue: 1.45,
        rooms: [
            {
                id: 'CD-R1',
                name: '成都一号机房',
                siteId: 'CD',
                level: 'region',
                lng: 104.066,
                lat: 30.572,
                rows: [
                    { row: 'A', count: 8 },
                    { row: 'B', count: 8 },
                    { row: 'C', count: 8 },
                    { row: 'D', count: 8 },
                    { row: 'E', count: 8 },
                ],
                ratedPowerPerRackKw: 8,
                alarmRacks: ['E-02'],
                offlineRacks: ['B-06'],
            },
            {
                id: 'CD-R2',
                name: '成都二号机房',
                siteId: 'CD',
                level: 'edge',
                lng: 104.13,
                lat: 30.62,
                rows: [
                    { row: 'A', count: 6 },
                    { row: 'B', count: 6 },
                    { row: 'C', count: 6 },
                ],
                ratedPowerPerRackKw: 6,
            },
        ],
    },
    {
        id: 'BJ',
        name: '北京机房',
        adcode: '110000',
        province: '北京市',
        city: '北京市',
        provinceAdcode: '110000',
        lng: 116.41,
        lat: 39.9,
        level: 'core',
        pue: 1.36,
        rooms: [
            {
                id: 'BJ-R1',
                name: '北京一号机房',
                siteId: 'BJ',
                level: 'core',
                lng: 116.44,
                lat: 39.92,
                rows: [
                    { row: 'A', count: 8 },
                    { row: 'B', count: 8 },
                    { row: 'C', count: 8 },
                    { row: 'D', count: 8 },
                    { row: 'E', count: 8 },
                    { row: 'F', count: 8 },
                ],
                ratedPowerPerRackKw: 10,
                alarmRacks: ['A-02', 'D-07'],
            },
            {
                id: 'BJ-R2',
                name: '北京二号机房',
                siteId: 'BJ',
                level: 'region',
                lng: 116.3,
                lat: 39.85,
                rows: [
                    { row: 'A', count: 7 },
                    { row: 'B', count: 7 },
                    { row: 'C', count: 7 },
                    { row: 'D', count: 7 },
                ],
                ratedPowerPerRackKw: 8,
                offlineRacks: ['B-05'],
            },
        ],
    },
    {
        id: 'WQ',
        name: '武清机房',
        // 武清是天津下辖区，下钻底图沿用天津市（120000）区县级边界
        adcode: '120000',
        province: '天津市',
        city: '天津市',
        provinceAdcode: '120000',
        lng: 117.04,
        lat: 39.38,
        level: 'core',
        pue: 1.39,
        rooms: [
            {
                id: 'WQ-R1',
                name: '武清一号机房',
                siteId: 'WQ',
                level: 'core',
                lng: 117.03,
                lat: 39.38,
                rows: [
                    { row: 'A', count: 8 },
                    { row: 'B', count: 8 },
                    { row: 'C', count: 8 },
                    { row: 'D', count: 8 },
                ],
                ratedPowerPerRackKw: 10,
                alarmRacks: ['B-04'],
            },
            {
                id: 'WQ-R2',
                name: '武清二号机房',
                siteId: 'WQ',
                level: 'edge',
                lng: 117.1,
                lat: 39.42,
                rows: [
                    { row: 'A', count: 6 },
                    { row: 'B', count: 6 },
                    { row: 'C', count: 6 },
                ],
                ratedPowerPerRackKw: 6,
            },
        ],
    },
    {
        id: 'XA',
        name: '西安机房',
        adcode: '610100',
        province: '陕西省',
        city: '西安市',
        provinceAdcode: '610000',
        lng: 108.94,
        lat: 34.34,
        level: 'region',
        pue: 1.43,
        rooms: [
            {
                id: 'XA-R1',
                name: '西安一号机房',
                siteId: 'XA',
                level: 'region',
                lng: 108.9,
                lat: 34.34,
                rows: [
                    { row: 'A', count: 8 },
                    { row: 'B', count: 8 },
                    { row: 'C', count: 8 },
                    { row: 'D', count: 8 },
                    { row: 'E', count: 8 },
                ],
                ratedPowerPerRackKw: 8,
                alarmRacks: ['C-03'],
                offlineRacks: ['E-06'],
            },
            {
                id: 'XA-R2',
                name: '西安二号机房',
                siteId: 'XA',
                level: 'edge',
                lng: 109.0,
                lat: 34.4,
                rows: [
                    { row: 'A', count: 6 },
                    { row: 'B', count: 6 },
                    { row: 'C', count: 6 },
                ],
                ratedPowerPerRackKw: 6,
            },
        ],
    },
];

/** adcode → 站点，地图下钻时按行政区划码定位 */
export const SITE_BY_ADCODE = new Map(SITES.map(s => [s.adcode, s]));

export const SITE_BY_ID = new Map(SITES.map(s => [s.id, s]));

export function findRoom(roomId: string): RoomSpec | undefined {
    for (const site of SITES) {
        const hit = site.rooms.find(r => r.id === roomId);
        if (hit) return hit;
    }
    return undefined;
}

/** 由排列配置推算机房物理尺寸与排列 z 坐标（米，原点在机房中心） */
export function roomGeometry(rows: RowSpec[]) {
    const maxCount = Math.max(...rows.map(r => r.count));
    const w = maxCount * RACK_PITCH_X + 4;
    const d = rows.length * ROW_PITCH_Z + 5;
    const rowZ = new Map<string, number>();
    rows.forEach((r, i) => {
        rowZ.set(r.row, ((rows.length - 1) / 2 - i) * ROW_PITCH_Z);
    });
    const rackX = (index: number, count: number) => (index - (count - 1) / 2) * RACK_PITCH_X;
    return { w, d, rowZ, rackX };
}
