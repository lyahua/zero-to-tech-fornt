<template>
    <div class="rack-drawer">
        <div class="panel__title">
            {{ rack.id }}
            <el-tag size="small" :type="tagType">{{ STATUS_LABEL[rack.status] }}</el-tag>
        </div>
        <div class="rack-drawer__body">
            <dl class="rack-drawer__stats">
                <div v-for="s in stats" :key="s.label" class="rack-drawer__stat">
                    <dt>{{ s.label }}</dt>
                    <dd>{{ s.value }}</dd>
                </div>
            </dl>

            <div class="rack-drawer__section">
                <div class="rack-drawer__section-title">
                    U 位占用
                    <span class="rack-drawer__section-extra">{{ rack.uUsed }}/{{ rack.uTotal }} U</span>
                </div>
                <!-- 42U 立面图：从上往下编号，空位画虚线框，一眼看出哪几 U 是空的 -->
                <div class="rack-drawer__u">
                    <div
                        v-for="u in uCells"
                        :key="u.key"
                        class="rack-drawer__cell"
                        :class="{ 'is-empty': !u.device }"
                        :style="u.device ? { background: DEVICE_COLOR[u.device.type] } : undefined"
                        :title="u.device ? `${u.device.name} · ${u.device.model}` : `U${u.no} 空`"
                    >
                        <span v-if="u.device && !u.hidden" class="rack-drawer__cell-text">
                            {{ u.device.name }} · {{ u.device.uSize }}U
                        </span>
                        <span v-else-if="!u.device && !u.hidden" class="rack-drawer__cell-no">U{{ u.no }}</span>
                    </div>
                </div>
            </div>

            <div class="rack-drawer__section">
                <div class="rack-drawer__section-title">
                    设备清单
                    <span class="rack-drawer__section-extra">{{ rack.devices.length }} 台</span>
                </div>
                <el-table :data="rack.devices" size="small" height="180" class="rack-drawer__table">
                    <el-table-column prop="name" label="名称" min-width="80" />
                    <el-table-column prop="model" label="型号" min-width="110" />
                    <el-table-column label="类型" width="70">
                        <template #default="{ row }">
                            <span :style="{ color: DEVICE_COLOR[row.type as DeviceType] }">
                                {{ DEVICE_TYPE_LABEL[row.type as DeviceType] }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="U 位" width="90">
                        <template #default="{ row }">U{{ row.uStart }}-{{ row.uStart + row.uSize - 1 }}</template>
                    </el-table-column>
                </el-table>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/** 机柜详情抽屉：指标 + 42U 立面 + 设备清单 */
import {
    DEVICE_TYPE_LABEL,
    STATUS_LABEL,
    type Device,
    type DeviceType,
    type Rack,
} from '@/api/idc';
import { DEVICE_COLOR } from '@/api/idc/palette';

const props = defineProps<{ rack: Rack }>();

const tagType = computed(() => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
        normal: 'success',
        warning: 'warning',
        alarm: 'danger',
        offline: 'info',
    };
    return map[props.rack.status];
});

const stats = computed(() => {
    const r = props.rack;
    return [
        { label: '进风', value: `${r.tempIn} ℃` },
        { label: '出风', value: `${r.tempOut} ℃` },
        { label: '湿度', value: `${r.humidity} %` },
        { label: '功率', value: `${r.powerKw} kW` },
        { label: '负载率', value: `${r.loadPct} %` },
        { label: '位置', value: `${r.row}-${String(r.rowIndex).padStart(2, '0')}` },
    ];
});

interface UCell {
    key: number;
    no: number;
    device?: Device;
    /** 同一设备占多 U 时只在首格显示文字，避免文字重叠 */
    hidden: boolean;
}

const uCells = computed<UCell[]>(() => {
    const byStart = new Map(props.rack.devices.map(d => [d.uStart, d]));
    const cells: UCell[] = [];
    for (let no = props.rack.uTotal; no >= 1; no -= 1) {
        const hit = byStart.get(no);
        cells.push({ key: no, no, device: hit, hidden: false });
    }
    // 非起始格的设备，标记为隐藏文字
    const covered = new Set<number>();
    props.rack.devices.forEach(d => {
        for (let u = d.uStart + 1; u < d.uStart + d.uSize; u += 1) covered.add(u);
    });
    return cells.map(c =>
        !c.device && covered.has(c.no) ? { ...c, hidden: true } : c
    );
});
</script>

<style scoped lang="less">
@import '@/styles/idc-dark.less';

.rack-drawer {
    .idc-panel();
    display: flex;
    flex-direction: column;
    min-height: 0;

    &__body {
        padding: @gap-md;
        overflow-y: auto;
    }

    &__stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: @gap-sm;
    }

    &__stat {
        padding: @gap-sm;
        background: @idc-panel-soft;
        border-radius: @radius-sm;

        dt {
            font-size: @font-xs;
            color: @idc-text-dim;
        }

        dd {
            margin-top: 2px;
            font-size: @font-md;
            color: @idc-text;
            font-variant-numeric: tabular-nums;
        }
    }

    &__section {
        margin-top: @gap-lg;
    }

    &__section-title {
        display: flex;
        align-items: center;
        margin-bottom: @gap-sm;
        font-size: @font-sm;
        color: @idc-text-dim;
    }

    &__section-extra {
        margin-left: auto;
        color: @idc-text;
    }

    &__u {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: @gap-sm;
        background: @idc-panel-soft;
        border-radius: @radius-sm;
    }

    &__cell {
        height: 13px;
        line-height: 13px;
        border-radius: 2px;
        overflow: hidden;

        &.is-empty {
            background: transparent;
            border: 1px dashed #223049;
        }
    }

    &__cell-text,
    &__cell-no {
        display: block;
        padding-left: 4px;
        font-size: @font-xs;
        color: rgba(11, 18, 32, 0.85);
        white-space: nowrap;
    }

    &__cell-no {
        color: #334155;
    }

    &__table {
        background: transparent;
        --el-table-bg-color: transparent;
        --el-table-tr-bg-color: transparent;
        --el-table-header-bg-color: @idc-panel-soft;
        --el-table-border-color: @idc-border;
        --el-table-text-color: @idc-text;
        --el-table-header-text-color: @idc-text-dim;
    }
}
</style>
