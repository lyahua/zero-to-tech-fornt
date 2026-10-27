/**
 * 实时指标模拟（mock）
 *
 * 一次性生成全部机柜与设备的静态结构，之后每 2.5s 做一次随机游走，
 * 模拟温度 / 功耗 / U 位占用的小幅波动，并按需翻转机柜状态。
 *
 * 定时器由首个订阅者启动、最后一个订阅者离开时停止，
 * 避免多个页面同时挂载时定时器叠加。
 */
import type {
    Alarm,
    Device,
    Floorplan,
    Link,
    MachineRoom,
    Metrics,
    MetricsListener,
    Rack,
    RunStatus,
    Site,
    Summary,
    Zone,
} from '../types';
import {
    DEVICE_TYPES,
    RACK_D,
    RACK_PITCH_X,
    RACK_W,
    ROW_PITCH_Z,
    SITES,
    U_TOTAL,
    findRoom,
    roomGeometry,
    type RoomSpec,
    type SiteSpec,
} from './geo';

/** 随机游走步长上限 */
const WALK = {
    temp: 0.18,
    power: 0.12,
    humidity: 0.4,
};

/** 状态严重度，取站点/机房状态时比较用 */
const SEVERITY: Record<RunStatus, number> = {
    offline: 3,
    alarm: 2,
    warning: 1,
    normal: 0,
};

/** mulberry32：固定种子的伪随机，保证每次刷新布局一致 */
function createRandom(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const round = (v: number, digits = 1) => {
    const p = 10 ** digits;
    return Math.round(v * p) / p;
};

const pick = <T>(arr: T[], rnd: () => number) => arr[Math.floor(rnd() * arr.length)];

/** 在 42U 内顺序摆放设备，返回设备清单与已用 U 数 */
function packDevices(rackId: string, targetUsed: number, rnd: () => number): Device[] {
    const devices: Device[] = [];
    let cursor = 1;
    let seq = 1;
    while (cursor <= targetUsed) {
        const type = pick(DEVICE_TYPES, rnd);
        const sizeTable = type === 'storage' ? [4, 6, 8] : type === 'network' ? [1, 2] : [1, 2, 4];
        let size = pick(sizeTable, rnd);
        if (cursor + size - 1 > U_TOTAL) size = U_TOTAL - cursor + 1;
        if (size <= 0) break;
        const status: RunStatus = rnd() < 0.03 ? 'warning' : 'normal';
        devices.push({
            id: `${rackId}-U${cursor}`,
            name: `${type.toUpperCase()}-${String(seq).padStart(2, '0')}`,
            model:
                type === 'server'
                    ? `R4900-G${Math.ceil(rnd() * 3)}`
                    : type === 'storage'
                      ? `OceanStor-${Math.ceil(rnd() * 5)}00`
                      : type === 'network'
                        ? `CE68${Math.ceil(rnd() * 8)}0`
                        : `USG-${Math.ceil(rnd() * 6)}00`,
            type,
            uStart: cursor,
            uSize: size,
            status,
        });
        cursor += size;
        seq += 1;
    }
    return devices;
}

interface RackState {
    rack: Rack;
    ratedPowerKw: number;
    /** 该机柜被人工指定为告警/离线，随机游走不得覆盖 */
    pinned: RunStatus | null;
}

function buildRoomRacks(site: SiteSpec, room: RoomSpec): RackState[] {
    const { rowZ, rackX } = roomGeometry(room.rows);
    const alarmSet = new Set(room.alarmRacks ?? []);
    const offlineSet = new Set(room.offlineRacks ?? []);
    const states: RackState[] = [];

    room.rows.forEach((rowSpec, rowIndex) => {
        for (let i = 0; i < rowSpec.count; i += 1) {
            const index = i + 1;
            const id = `${rowSpec.row}-${String(index).padStart(2, '0')}`;
            const rnd = createRandom(
                room.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 1000 +
                    rowIndex * 100 +
                    index
            );
            const offline = offlineSet.has(id);
            const alarm = alarmSet.has(id);
            const loadPct = offline ? 0 : alarm ? 82 + rnd() * 14 : 30 + rnd() * 45;
            const uUsed = offline ? 0 : Math.round(U_TOTAL * (alarm ? 0.9 : 0.45 + rnd() * 0.4));
            const devices = offline ? [] : packDevices(id, uUsed, rnd);
            const realUsed = devices.reduce((sum, d) => sum + d.uSize, 0);
            const baseTemp = 22 + rnd() * 4 + (alarm ? 5.5 : 0);
            const ratedPowerKw = room.ratedPowerPerRackKw;

            states.push({
                ratedPowerKw,
                pinned: offline ? 'offline' : alarm ? 'alarm' : null,
                rack: {
                    id,
                    siteId: site.id,
                    roomId: room.id,
                    row: rowSpec.row,
                    rowIndex: index,
                    x: rackX(i, rowSpec.count),
                    z: rowZ.get(rowSpec.row) ?? 0,
                    rot: 0,
                    status: offline ? 'offline' : alarm ? 'alarm' : 'normal',
                    uUsed: realUsed,
                    uTotal: U_TOTAL,
                    powerKw: round((ratedPowerKw * loadPct) / 100, 2),
                    ratedPowerKw,
                    loadPct: round(loadPct),
                    tempIn: round(baseTemp),
                    tempOut: round(baseTemp + 3 + rnd() * 2.5),
                    humidity: round(42 + rnd() * 10),
                    devices,
                },
            });
        }
    });
    return states;
}

/** 全量机柜状态，按机房分组保存 */
const rackStates = new Map<string, RackState[]>();
/** roomId → SiteSpec/RoomSpec 反查 */
const roomSiteMap = new Map<string, { site: SiteSpec; room: RoomSpec }>();

for (const site of SITES) {
    for (const room of site.rooms) {
        rackStates.set(room.id, buildRoomRacks(site, room));
        roomSiteMap.set(room.id, { site, room });
    }
}

function worst(list: RunStatus[]): RunStatus {
    return list.reduce((acc, s) => (SEVERITY[s] > SEVERITY[acc] ? s : acc), 'normal' as RunStatus);
}

function buildRoom(site: SiteSpec, room: RoomSpec, states: RackState[]): MachineRoom {
    const racks = states.map(s => s.rack);
    const alarmCount = racks.filter(r => r.status === 'alarm').length;
    const offlineCount = racks.filter(r => r.status === 'offline').length;
    const online = racks.filter(r => r.status !== 'offline');
    const rated = online.reduce((sum, r) => sum + r.ratedPowerKw, 0);
    return {
        id: room.id,
        name: room.name,
        siteId: site.id,
        lng: room.lng,
        lat: room.lat,
        width: roomGeometry(room.rows).w,
        depth: roomGeometry(room.rows).d,
        status: worst(racks.map(r => r.status)),
        rackTotal: racks.length,
        uUsed: racks.reduce((sum, r) => sum + r.uUsed, 0),
        uTotal: racks.length * U_TOTAL,
        powerKw: round(online.reduce((sum, r) => sum + r.powerKw, 0)),
        ratedPowerKw: round(rated),
        tempAvg: round(online.length ? online.reduce((s, r) => s + r.tempIn, 0) / online.length : 0),
        pue: room.level === 'edge' ? site.pue + 0.06 : site.pue,
        alarmCount,
    };
}

function buildSite(site: SiteSpec): Site {
    const rooms = site.rooms.map(room =>
        buildRoom(site, room, rackStates.get(room.id) ?? [])
    );
    const powerKw = rooms.reduce((s, r) => s + r.powerKw, 0);
    const pue = powerKw ? rooms.reduce((s, r) => s + r.pue * r.powerKw, 0) / powerKw : site.pue;
    return {
        id: site.id,
        name: site.name,
        adcode: site.adcode,
        province: site.province,
        city: site.city,
        provinceAdcode: site.provinceAdcode,
        lng: site.lng,
        lat: site.lat,
        roomCount: rooms.length,
        status: worst(rooms.map(r => r.status)),
        rackTotal: rooms.reduce((s, r) => s + r.rackTotal, 0),
        rackOnline: rooms.reduce(
            (s, r) => s + (rackStates.get(r.id) ?? []).filter(x => x.rack.status !== 'offline').length,
            0
        ),
        uUsed: rooms.reduce((s, r) => s + r.uUsed, 0),
        uTotal: rooms.reduce((s, r) => s + r.uTotal, 0),
        powerKw: round(powerKw),
        ratedPowerKw: round(rooms.reduce((s, r) => s + r.ratedPowerKw, 0)),
        pue: round(pue, 2),
        tempAvg: round(
            rooms.length ? rooms.reduce((s, r) => s + r.tempAvg, 0) / rooms.length : 0
        ),
        humidity: round(
            (() => {
                const list = site.rooms.flatMap(rm =>
                    (rackStates.get(rm.id) ?? []).map(x => x.rack)
                );
                return list.length ? list.reduce((s, r) => s + r.humidity, 0) / list.length : 0;
            })()
        ),
        alarmCount: rooms.reduce((s, r) => s + r.alarmCount, 0),
        offlineCount: rooms.reduce(
            (s, r) => s + (rackStates.get(r.id) ?? []).filter(x => x.rack.status === 'offline').length,
            0
        ),
        rooms,
    };
}

function buildSummary(sites: Site[]): Summary {
    const powerKw = sites.reduce((s, x) => s + x.powerKw, 0);
    return {
        siteTotal: sites.length,
        roomTotal: sites.reduce((s, x) => s + x.roomCount, 0),
        rackTotal: sites.reduce((s, x) => s + x.rackTotal, 0),
        rackOnline: sites.reduce((s, x) => s + x.rackOnline, 0),
        uUsed: sites.reduce((s, x) => s + x.uUsed, 0),
        uTotal: sites.reduce((s, x) => s + x.uTotal, 0),
        powerKw: round(powerKw),
        ratedPowerKw: round(sites.reduce((s, x) => s + x.ratedPowerKw, 0)),
        avgPue: round(powerKw ? sites.reduce((s, x) => s + x.pue * x.powerKw, 0) / powerKw : 0, 2),
        alarmCount: sites.reduce((s, x) => s + x.alarmCount, 0),
        offlineCount: sites.reduce((s, x) => s + x.offlineCount, 0),
    };
}

const ALARM_TEMPLATES: Record<string, (r: Rack) => { title: string; detail: string }> = {
    temp: r => ({
        title: '进风温度超阈值',
        detail: `${r.id} 进风 ${r.tempIn}℃，超过上限 27℃`,
    }),
    power: r => ({
        title: '单机柜功率超限',
        detail: `${r.id} 实测 ${r.powerKw}kW，额定 ${r.ratedPowerKw}kW`,
    }),
    offline: r => ({
        title: '机柜失联',
        detail: `${r.id} 采集中断，最后心跳 ${new Date(Date.now() - 600_000).toLocaleTimeString()}`,
    }),
};

function buildAlarms(sites: Site[]): Alarm[] {
    const list: Alarm[] = [];
    for (const site of sites) {
        for (const room of site.rooms) {
            for (const { rack } of rackStates.get(room.id) ?? []) {
                if (rack.status === 'offline') {
                    const t = ALARM_TEMPLATES.offline(rack);
                    list.push({
                        id: `${rack.id}-offline`,
                        siteId: site.id,
                        siteName: site.name,
                        roomId: room.id,
                        rackId: rack.id,
                        level: 'critical',
                        title: t.title,
                        detail: t.detail,
                        ts: Date.now() - 9 * 60_000,
                    });
                } else if (rack.status === 'alarm') {
                    const hot = rack.tempIn > 28;
                    const t = hot ? ALARM_TEMPLATES.temp(rack) : ALARM_TEMPLATES.power(rack);
                    list.push({
                        id: `${rack.id}-alarm`,
                        siteId: site.id,
                        siteName: site.name,
                        roomId: room.id,
                        rackId: rack.id,
                        level: hot ? 'critical' : 'warning',
                        title: t.title,
                        detail: t.detail,
                        ts: Date.now() - Math.round(Math.random() * 8 * 60_000),
                    });
                }
            }
        }
    }
    return list.sort((a, b) => b.ts - a.ts);
}

/** 骨干链路拓扑：核心站点两两互联，区域站点上联最近核心 */
const LINK_SPECS = [
    { from: 'ZH', to: 'HZ', bwMbps: 100_000 },
    { from: 'HZ', to: 'CD', bwMbps: 40_000 },
    { from: 'ZH', to: 'CD', bwMbps: 40_000 },
];

function buildLinks(sites: Site[]): Link[] {
    const byId = new Map(sites.map(s => [s.id, s]));
    return LINK_SPECS.map(spec => {
        const a = byId.get(spec.from);
        const b = byId.get(spec.to);
        // 任一端离线/告警，链路即视为受影响，地图上直接体现故障波及面
        const worst = [a, b].reduce(
            (acc, s) => (s && SEVERITY[s.status] > SEVERITY[acc] ? s.status : acc),
            'normal' as RunStatus
        );
        const usedPct = Math.round(28 + ((spec.bwMbps / 1000) % 47) + Math.random() * 8);
        return {
            from: spec.from,
            to: spec.to,
            bwMbps: spec.bwMbps,
            usedPct: Math.min(98, usedPct),
            status: worst,
        };
    });
}

let snapshot: Metrics | null = null;

function refresh(): Metrics {
    const sites = SITES.map(buildSite);
    snapshot = {
        summary: buildSummary(sites),
        sites,
        links: buildLinks(sites),
        alarms: buildAlarms(sites),
        ts: Date.now(),
    };
    return snapshot;
}

/** 随机游走：温度、功耗、湿度小幅波动，偶发预警态 */
function walk() {
    for (const states of rackStates.values()) {
        for (const state of states) {
            const r = state.rack;
            if (r.status === 'offline') continue;
            r.tempIn = round(Math.min(34, Math.max(19, r.tempIn + (Math.random() - 0.5) * WALK.temp * 2)));
            r.tempOut = round(Math.max(r.tempIn + 1.5, r.tempOut + (Math.random() - 0.5) * WALK.temp * 2));
            r.humidity = round(
                Math.min(65, Math.max(35, r.humidity + (Math.random() - 0.5) * WALK.humidity * 2))
            );
            r.powerKw = round(
                Math.min(state.ratedPowerKw, Math.max(0.4, r.powerKw + (Math.random() - 0.5) * WALK.power * 2)),
                2
            );
            r.loadPct = round((r.powerKw / state.ratedPowerKw) * 100);
            if (!state.pinned) {
                // 未固定的机柜在临界区随机进出预警态，让画面有呼吸感
                const hot = r.tempIn > 27.5 || r.loadPct > 92;
                r.status = hot ? 'warning' : 'normal';
            }
        }
    }
    refresh();
}

let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<MetricsListener>();

function emit() {
    const m = snapshot ?? refresh();
    listeners.forEach(fn => fn(m));
}

/** 订阅实时指标，返回解绑函数 */
export function subscribe(listener: MetricsListener): () => void {
    listeners.add(listener);
    listener(snapshot ?? refresh());
    if (!timer) timer = setInterval(walk, 2500);
    return () => {
        listeners.delete(listener);
        if (!listeners.size && timer) {
            clearInterval(timer);
            timer = null;
        }
    };
}

/** 拉取一次当前快照 */
export function getMetrics(): Metrics {
    return snapshot ?? refresh();
}

/** 取机房平面图（静态结构 + 当前指标） */
export function getFloorplan(roomId: string): Floorplan | null {
    const hit = roomSiteMap.get(roomId);
    if (!hit) return null;
    const { site, room } = hit;
    const { w, d, rowZ } = roomGeometry(room.rows);
    const rows = room.rows.map(r => r.row);
    const firstZ = rowZ.get(rows[0]) ?? 0;
    const lastZ = rowZ.get(rows[rows.length - 1]) ?? 0;

    const zones: Zone[] = [
        {
            id: 'zone-main',
            label: '主机区',
            x0: -w / 2 + 0.6,
            x1: w / 2 - 0.6,
            z0: lastZ - 1.5,
            z1: firstZ + 1.5,
        },
        { id: 'zone-power', label: '配电区', x0: -w / 2 + 0.6, x1: w / 2 - 0.6, z0: -d / 2 + 0.4, z1: lastZ - 1.5 },
        { id: 'zone-cool', label: '制冷区', x0: -w / 2 + 0.6, x1: w / 2 - 0.6, z0: firstZ + 1.5, z1: d / 2 - 0.4 },
    ];

    const aisles: Floorplan['aisles'] = [];
    rows.forEach((row, i) => {
        if (i === rows.length - 1) return;
        const a = rowZ.get(row) ?? 0;
        const b = rowZ.get(rows[i + 1]) ?? 0;
        aisles.push({
            axis: 'x',
            at: (a + b) / 2,
            width: ROW_PITCH_Z - RACK_D,
            label: i % 2 === 0 ? '冷通道' : '热通道',
        });
    });

    return {
        roomId: room.id,
        roomName: room.name,
        siteId: site.id,
        siteName: site.name,
        room: { w, d },
        zones,
        aisles,
        racks: (rackStates.get(room.id) ?? []).map(s => ({ ...s.rack, devices: [...s.rack.devices] })),
    };
}

/** 列出全部机房，供页面做机房切换 */
export function listRooms() {
    return SITES.flatMap(site =>
        site.rooms.map(room => {
            const { w, d } = roomGeometry(room.rows);
            const racks = (rackStates.get(room.id) ?? []).map(s => s.rack);
            return {
                id: room.id,
                name: room.name,
                siteId: site.id,
                siteName: site.name,
                rackTotal: racks.length,
                width: w,
                depth: d,
            };
        })
    );
}

/** 机柜外形尺寸，平面图绘制时复用 */
export const rackSize = { w: RACK_W, d: RACK_D, pitchX: RACK_PITCH_X };
