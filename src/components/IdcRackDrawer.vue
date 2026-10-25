<template>
    <el-drawer
        :model-value="modelValue"
        :size="drawerSize"
        :with-header="false"
        class="idc-drawer"
        @update:model-value="v => emit('update:modelValue', v)"
    >
        <div v-if="rack" class="idc-rd">
            <header class="idc-rd__hd">
                <div>
                    <h3 class="idc-rd__title">{{ rack.id }}</h3>
                    <p class="idc-rd__sub">{{ rack.zoneLabel }} · {{ rack.row }} 排 {{ rack.rowIndex }} 号</p>
                </div>
                <span class="idc-rd__badge" :class="'is-' + rack.status">{{ statusText(rack.status) }}</span>
                <button class="idc-rd__close" @click="emit('update:modelValue', false)">×</button>
            </header>

            <div class="idc-rd__kpis">
                <div class="idc-rd__kpi"><span>进风温度</span><b :style="{ color: tempColor(rack.tempIn) }">{{ rack.tempIn }}℃</b></div>
                <div class="idc-rd__kpi"><span>负载率</span><b>{{ rack.loadPct }}%</b></div>
                <div class="idc-rd__kpi"><span>功耗</span><b>{{ rack.powerKW }} kW</b></div>
                <div class="idc-rd__kpi"><span>湿度</span><b>{{ rack.humidity }}%</b></div>
                <div class="idc-rd__kpi"><span>U 位</span><b>{{ rack.uUsed }}/{{ rack.uTotal }}</b></div>
            </div>

            <p v-if="alarm" class="idc-rd__alarm">{{ alarm.title }} · {{ alarm.time }}</p>

            <div class="idc-rd__body">
                <!-- 42U 位图：一格 1U，从上往下 U42 → U1，与实地机柜一致 -->
                <div class="idc-rd__uru">
                    <div
                        v-for="u in uSlots"
                        :key="u"
                        class="idc-rd__slot"
                        :class="{ 'is-filled': !!slotMap[u] }"
                    >
                        <span class="idc-rd__unum">{{ u }}</span>
                        <div
                            v-if="slotMap[u] === u"
                            class="idc-rd__dev"
                            :class="'is-' + slotMap[u + '_dev'].status"
                            :style="{ height: slotMap[u + '_dev'].uSize * 100 + '%' }"
                            :title="slotMap[u + '_dev'].name + '（' + slotMap[u + '_dev'].model + '）'"
                            @click="pick(slotMap[u + '_dev'])"
                        >
                            <span class="idc-rd__devname">{{ slotMap[u + '_dev'].name }}</span>
                        </div>
                    </div>
                </div>

                <div class="idc-rd__list">
                    <div class="idc-rd__listHd">
                        <span>柜内设备（{{ devices.length }} 台）</span>
                        <span class="idc-rd__counts">
                            <i class="is-alarm">告警 {{ countOf('alarm') }}</i>
                            <i class="is-offline">离线 {{ countOf('offline') }}</i>
                        </span>
                    </div>
                    <el-table :data="devices" size="small" height="100%" @row-click="pick">
                        <el-table-column label="U 位" width="78">
                            <template #default="{ row }">U{{ row.uStart }}-{{ row.uStart + row.uSize - 1 }}</template>
                        </el-table-column>
                        <el-table-column prop="name" label="名称" min-width="86" show-overflow-tooltip />
                        <el-table-column prop="model" label="型号" min-width="120" show-overflow-tooltip />
                        <el-table-column label="状态" width="76">
                            <template #default="{ row }">
                                <span class="idc-rd__tag" :class="'is-' + row.status">{{ statusText(row.status) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="温度" width="66">
                            <template #default="{ row }">{{ row.temp }}℃</template>
                        </el-table-column>
                        <el-table-column label="容量" width="110">
                            <template #default="{ row }">
                                <span class="idc-rd__bar"><i :style="{ width: row.capacityPct + '%' }"></i></span>
                                <em>{{ row.capacityPct }}%</em>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>

            <p v-if="picked" class="idc-rd__picked">
                已选：{{ picked.name }} · {{ picked.model }} · {{ typeName(picked.type) }}
            </p>
        </div>
    </el-drawer>
</template>

<script setup>
/**
 * 机柜详情抽屉：42U 位图 + 柜内设备表
 * 数据来源 window.IDC.data（引擎 idc/engine/data.js）
 */
import { computed, ref, watch } from 'vue';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    rackId: { type: String, default: '' },
    /* min() 保证窄屏自动铺满，不会被 780px 撑出横向滚动 */
    size: { type: [String, Number], default: 'min(780px, 100%)' },
});
const emit = defineEmits(['update:modelValue']);

const U_TOTAL = 42;
const drawerSize = computed(() => (typeof props.size === 'number' ? props.size + 'px' : props.size));

const data = computed(() => window.IDC?.data || null);
const rack = computed(() => (data.value && props.rackId ? data.value.getRack(props.rackId) : null));
const devices = computed(() => (rack.value ? [...rack.value.devices].sort((a, b) => b.uStart - a.uStart) : []));
const alarm = computed(() => (rack.value ? data.value.alarmOfRack(rack.value.id) : null));

/* 从上往下排：U42 在最上，U1 在最下 */
const uSlots = computed(() => Array.from({ length: U_TOTAL }, (_, i) => U_TOTAL - i));

/** slotMap[u] = u 表示该 U 是设备起始格；slotMap[u+'_dev'] 指向设备对象 */
const slotMap = computed(() => {
    const m = {};
    devices.value.forEach(d => {
        m[d.uStart] = d.uStart;
        m[d.uStart + '_dev'] = d;
        for (let i = 1; i < d.uSize; i++) m[d.uStart + i] = d.uStart;
    });
    return m;
});

const picked = ref(null);
watch(() => props.rackId, () => { picked.value = null; });
function pick(row) { picked.value = row; }

function countOf(s) { return devices.value.filter(d => d.status === s).length; }
function statusText(s) {
    return { normal: '正常', warn: '预警', alarm: '告警', offline: '离线' }[s] || s;
}
function typeName(t) {
    return { server: '服务器', storage: '存储', network: '网络设备', security: '安全设备' }[t] || t;
}
function tempColor(t) {
    if (t >= 30) return '#ff4d4f';
    if (t >= 28) return '#f59e0b';
    return '#dce9ff';
}
</script>

<style scoped lang="less">
.idc-rd {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 14px 16px;
    box-sizing: border-box;
    background: #0a1729;
    color: #dce9ff;
    font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}
.idc-rd__hd {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(64, 180, 255, .16);
}
.idc-rd__title { margin: 0; font-size: 18px; color: #35e0ff; letter-spacing: 1px; }
.idc-rd__sub { margin: 2px 0 0; font-size: 12px; color: #8aa0bd; }
.idc-rd__badge {
    padding: 2px 10px;
    font-size: 12px;
    border-radius: 2px;
    color: #04121f;
    background: #22c55e;
    &.is-alarm { background: #ff4d4f; color: #fff; }
    &.is-offline { background: #5b6b80; color: #dbe6f3; }
}
.idc-rd__close {
    margin-left: auto;
    width: 26px; height: 26px;
    font-size: 18px; line-height: 1;
    color: #8aa0bd;
    background: transparent;
    border: 1px solid rgba(64, 180, 255, .24);
    border-radius: 2px;
    cursor: pointer;
    &:hover { color: #fff; border-color: #35e0ff; }
}
.idc-rd__kpis { display: flex; gap: 8px; padding: 10px 0; flex-wrap: wrap; }
.idc-rd__kpi {
    flex: 1 1 96px;
    padding: 6px 8px;
    background: rgba(10, 21, 36, .8);
    border: 1px solid rgba(64, 180, 255, .14);
    border-radius: 2px;
    span { display: block; font-size: 11px; color: #8aa0bd; }
    b { font-size: 15px; font-weight: 700; }
}
.idc-rd__alarm {
    margin: 0 0 8px;
    padding: 6px 10px;
    font-size: 12px;
    color: #ffb4b4;
    background: rgba(255, 77, 79, .12);
    border-left: 2px solid #ff4d4f;
}
.idc-rd__body {
    display: flex;
    gap: 14px;
    flex: 1;
    min-height: 0;
}
/* ---------- U 位图 ---------- */
.idc-rd__uru {
    display: flex;
    flex-direction: column;
    width: 148px;
    flex: none;
    border: 1px solid rgba(64, 180, 255, .2);
    background: #06101d;
}
.idc-rd__slot {
    position: relative;
    flex: 1 1 0;
    min-height: 0;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(64, 180, 255, .07);
    &.is-filled { background: rgba(64, 180, 255, .05); }
}
.idc-rd__unum {
    position: absolute;
    left: 3px; top: 50%;
    transform: translateY(-50%);
    font-size: 8px;
    color: #4c6280;
    z-index: 2;
}
.idc-rd__dev {
    position: absolute;
    left: 24px; right: 2px; bottom: 0;
    box-sizing: border-box;
    padding-left: 4px;
    display: flex;
    align-items: center;
    overflow: hidden;
    border-radius: 1px;
    background: #1f9d55;
    cursor: pointer;
    transition: filter .12s;
    &:hover { filter: brightness(1.25); }
    &.is-warn { background: #eab308; }
    &.is-alarm { background: #ff4d4f; }
    &.is-offline { background: #42536a; }
}
.idc-rd__devname {
    font-size: 9px;
    line-height: 1.2;
    color: #04121f;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.idc-rd__dev.is-offline .idc-rd__devname { color: #cfdcec; }
/* ---------- 设备表 ---------- */
.idc-rd__list { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.idc-rd__listHd {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 6px;
    font-size: 12px;
    color: #8aa0bd;
}
.idc-rd__counts i { font-style: normal; margin-left: 10px; }
.idc-rd__counts .is-alarm { color: #ff8080; }
.idc-rd__counts .is-offline { color: #90a4bd; }
.idc-rd__tag {
    padding: 1px 6px;
    font-size: 11px;
    border-radius: 2px;
    color: #04121f;
    background: #22c55e;
    &.is-warn { background: #eab308; }
    &.is-alarm { background: #ff4d4f; color: #fff; }
    &.is-offline { background: #5b6b80; color: #dbe6f3; }
}
.idc-rd__bar {
    display: inline-block;
    width: 54px; height: 6px;
    margin-right: 4px;
    vertical-align: middle;
    background: rgba(64, 180, 255, .16);
    border-radius: 3px;
    overflow: hidden;
    i { display: block; height: 100%; background: #22d3ee; }
}
.idc-rd__list em { font-style: normal; font-size: 11px; }
.idc-rd__picked {
    margin: 8px 0 0;
    padding: 6px 10px;
    font-size: 12px;
    color: #9fe8ff;
    background: rgba(34, 211, 238, .1);
    border-left: 2px solid #22d3ee;
}
</style>

<style lang="less">
/* el-drawer 内容区默认白底内边距，深色主题需覆盖 */
.idc-drawer .el-drawer__body { padding: 0; background: #0a1729; }
.idc-drawer.el-drawer { border-left: 1px solid rgba(64, 180, 255, .22); }
/* 表格深色适配 */
.idc-rd .el-table {
    --el-table-bg-color: transparent;
    --el-table-tr-bg-color: transparent;
    --el-table-header-bg-color: rgba(10, 21, 36, .9);
    --el-table-border-color: rgba(64, 180, 255, .12);
    --el-table-text-color: #c7d8ee;
    --el-table-header-text-color: #8aa0bd;
    --el-table-row-hover-bg-color: rgba(34, 211, 238, .1);
    background: transparent;
}
.idc-rd .el-table__inner-wrapper::before { background-color: rgba(64, 180, 255, .12); }
</style>
