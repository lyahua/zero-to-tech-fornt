<template>
    <div class="iframe-demo">
        <AppHeader title="iframe 跨窗口通信">
            <template #right>
                <el-button link @click="logVisible = !logVisible">
                    {{ logVisible ? '收起日志' : '展开日志' }}
                </el-button>
            </template>
        </AppHeader>

        <main class="iframe-demo__body">
            <!-- ── 控制区 ─────────────────────────────────────────── -->
            <section class="iframe-demo__panel">
                <div class="iframe-demo__field">
                    <span class="iframe-demo__label">子页地址</span>
                    <el-input v-model="childSrc" placeholder="http://localhost:4173/iframe-child/" />
                    <el-button @click="frameKey += 1">重新加载</el-button>
                </div>
                <p class="iframe-demo__tip">
                    同源演示：默认加载本项目
                    <code>public/iframe-child/index.html</code>，与父页同 origin，同样会走
                    origin / source 校验。想验证跨域，另开一个端口
                    <code>npx vite preview --port 4173</code>，把上面地址改成
                    <code>http://localhost:4173/iframe-child/</code> 即可。
                </p>

                <div class="iframe-demo__actions">
                    <el-tag :type="ready ? 'success' : 'warning'" size="small">
                        {{ ready ? '子页已握手 (ready)' : '等待子页 ready' }}
                    </el-tag>
                    <el-tag type="info" size="small">iframe 高度 {{ height || '未上报' }}</el-tag>

                    <el-button size="small" :disabled="!ready" @click="doPing">
                        request: ping
                    </el-button>
                    <el-button size="small" :disabled="!ready" @click="doStats">
                        request: queryStats
                    </el-button>
                    <el-button size="small" :disabled="!ready" @click="setTheme('dark')">
                        暗色主题
                    </el-button>
                    <el-button size="small" :disabled="!ready" @click="setTheme('light')">
                        亮色主题
                    </el-button>
                    <el-button size="small" :disabled="!ready" @click="sendNav">
                        send: navigate（不等回包）
                    </el-button>
                </div>

                <el-alert
                    v-if="blocked"
                    type="error"
                    :closable="false"
                    show-icon
                    title="子页迟迟没有 ready"
                    description="多半是对方用 X-Frame-Options / CSP frame-ancestors 拒绝被嵌入，前端无解：要么对方加白名单，要么由后端反向代理成同源地址。"
                />
            </section>

            <!-- ── iframe ─────────────────────────────────────────── -->
            <section class="iframe-demo__frame">
                <iframe
                    ref="frameRef"
                    :key="frameKey"
                    :src="resolvedSrc"
                    :height="height || 640"
                    frameborder="0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    referrerpolicy="no-referrer-when-downgrade"
                    @load="onFrameLoad"
                />
            </section>

            <!-- ── 日志 ───────────────────────────────────────────── -->
            <section v-show="logVisible" class="iframe-demo__panel">
                <div class="iframe-demo__field">
                    <span class="iframe-demo__label">父页收到的消息</span>
                    <el-button link size="small" @click="logs = []">清空</el-button>
                </div>
                <div class="iframe-demo__log">
                    <div
                        v-for="(item, i) in logs"
                        :key="i"
                        :class="['iframe-demo__line', item.kind]"
                    >
                        {{ item.time }}
                        {{ item.kind === 'in' ? '←' : item.kind === 'out' ? '→' : '×' }}
                        {{ item.text }}
                    </div>
                    <p v-if="!logs.length" class="iframe-demo__tip">暂无消息</p>
                </div>
            </section>
        </main>
    </div>
</template>

<script setup>
/**
 * iframe 嵌入第三方页面 + postMessage 双向通信的可运行示例。
 * 握手排队、origin/source 校验、请求-响应都在 useIframeBridge 里，
 * 本页只演示父页侧怎么用：send / request / on / reset。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import AppHeader from '@/components/layout/AppHeader.vue';
import { useIframeBridge } from '@/javascript/hooks/useIframeBridge';

/** 子页默认复用本项目 public 下的静态页，同源即可跑通全流程 */
const DEFAULT_SRC = '/iframe-child/index.html';

/** 子页超过这个时间没握手，提示大概率被 X-Frame-Options / CSP 拦了 */
const HANDSHAKE_TIMEOUT = 6000;

const childSrc = ref(DEFAULT_SRC);
const frameRef = ref();
const frameKey = ref(0);
const logVisible = ref(true);
const blocked = ref(false);
const logs = ref([]);

/** 子页与父页同源时 origin 就是当前站点；跨域时改成写死对方 origin */
const childOrigin = computed(() => {
    try {
        return new URL(childSrc.value, location.href).origin;
    } catch {
        return '';
    }
});

/** 把父页 origin 透传给子页，子页据此校验并回发消息 */
const resolvedSrc = computed(() => {
    const url = new URL(childSrc.value, location.href);
    // about:blank 等无 origin 的地址不能拼 query
    if (url.origin !== 'null') url.searchParams.set('parent', location.origin);
    return url.toString();
});

const { ready, height, send, request, on, reset } = useIframeBridge({
    frameRef,
    origin: childOrigin,
    initPayload: () => ({ theme: 'light', ticket: `ticket-${Date.now()}` }),
});

function log(kind, text) {
    logs.value.unshift({ kind, text, time: new Date().toLocaleTimeString() });
    if (logs.value.length > 100) logs.value.pop();
}

let timer = 0;

/** 每次重新加载都重新计时，超时仍未握手才判定为被拦截 */
function armHandshakeCheck() {
    blocked.value = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
        if (!ready.value) blocked.value = true;
    }, HANDSHAKE_TIMEOUT);
}

/**
 * 握手状态只能在「地址变了 / 重新挂载」时重置，不能在 load 里重置：
 * 子页的 ready 是异步消息，完全可能先于父页的 load 事件送达，
 * 在 load 里 reset 会把刚建立的握手状态清掉，父页就永远停在"等待 ready"。
 */
watch([resolvedSrc, frameKey], () => {
    reset();
    armHandshakeCheck();
    log('out', `iframe 地址变更，握手状态已重置（origin: ${childOrigin.value}）`);
});

onBeforeUnmount(() => clearTimeout(timer));

function onFrameLoad() {
    log('out', `iframe load（${childOrigin.value}）`);
}

// ── 父 → 子：请求-响应，拿得到返回值 ────────────────────────────
async function doPing() {
    try {
        const data = await request('ping', { from: 'parent' });
        log('in', `ping 回包: ${JSON.stringify(data)}`);
    } catch (e) {
        log('err', e.message);
        ElMessage.error(e.message);
    }
}

async function doStats() {
    try {
        const data = await request('queryStats');
        log('in', `queryStats 回包: 在线 ${data.online}，负载 ${data.load}`);
    } catch (e) {
        log('err', e.message);
    }
}

async function setTheme(theme) {
    try {
        await request('setTheme', { theme });
        log('out', `setTheme -> ${theme}`);
    } catch (e) {
        log('err', e.message);
    }
}

/** 单向通知，不关心结果时用 send；未握手会自动排队 */
function sendNav() {
    const sent = send('navigate', { title: `父页指定标题 ${Date.now() % 10000}` });
    log('out', `navigate ${sent ? '已发出' : '未握手，已入队'}`);
}

// ── 子 → 父：订阅子页事件 ──────────────────────────────────────
on('ready', payload => {
    blocked.value = false;
    clearTimeout(timer);
    log('in', `ready ${JSON.stringify(payload)}`);
});

on('resize', payload => log('in', `resize -> ${payload?.height}px`));

on('child-event', payload => log('in', `child-event ${JSON.stringify(payload)}`));

on('close', payload => {
    log('in', `close ${JSON.stringify(payload)}，演示为把 src 置空`);
    childSrc.value = 'about:blank';
    ElMessage.info('子页请求关闭，已清空 iframe');
});

armHandshakeCheck();
</script>

<style scoped lang="less">
.iframe-demo {
    min-height: 100vh;
    background: @background;

    &__body {
        padding: @gap-md;
    }

    &__panel {
        padding: @gap-md;
        margin-bottom: @gap-md;
        background: @background-white;
        border-radius: @radius-md;
    }

    &__field {
        display: flex;
        align-items: center;
        gap: @gap-sm;
    }

    &__label {
        flex: none;
        font-size: @font-sm;
        color: @text-secondary;
    }

    &__tip {
        margin: @gap-sm 0 0;
        font-size: @font-sm;
        line-height: 1.7;
        color: @text-secondary;
    }

    &__actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: @gap-sm;
        margin-top: @gap-md;
    }

    &__frame iframe {
        display: block;
        width: 100%;
        border-radius: @radius-md;
        background: @background-white;
    }

    &__log {
        max-height: 220px;
        overflow: auto;
        margin-top: @gap-sm;
        padding: @gap-sm;
        border: 1px dashed @border-color;
        border-radius: @radius-sm;
        font-family: Consolas, Menlo, monospace;
        font-size: @font-sm;
    }

    &__line {
        white-space: pre-wrap;
        word-break: break-all;

        &.in {
            color: @primary-color;
        }
        &.out {
            color: @success-color;
        }
        &.err {
            color: @danger-color;
        }
    }
}
</style>
