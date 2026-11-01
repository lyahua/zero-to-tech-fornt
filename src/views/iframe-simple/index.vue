<template>
    <div class="simple">
        <AppHeader title="iframe 通信（极简版）" />

        <main class="simple__body">
            <p class="simple__intro">
                跨域 iframe 之间只有一对 API：<b>postMessage</b> 发，
                <b>message 事件</b>收。本页演示父子互发，代码各 10 行左右。
            </p>

            <!-- ── 父 → 子 ────────────────────────────────────────── -->
            <section class="simple__box">
                <h4>① 父 → iframe</h4>
                <div class="simple__row">
                    <el-input v-model="toChild" placeholder="说点什么，发给子页" />
                    <el-button type="primary" @click="sendToChild">发送</el-button>
                </div>
                <p class="simple__code">
                    frameRef.value.contentWindow.postMessage({ from: 'parent', text }, 对方origin)
                </p>
            </section>

            <!-- ── iframe ─────────────────────────────────────────── -->
            <!-- 边框保留，方便看清 iframe 的边界；iframe 内部是另一个页面 -->
            <section class="simple__box">
                <h4>② iframe（子页：public/iframe-simple/index.html）</h4>
                <iframe ref="frameRef" class="simple__frame" src="/iframe-simple/index.html" />
            </section>

            <!-- ── 子 → 父 ────────────────────────────────────────── -->
            <section class="simple__box">
                <h4>③ iframe → 父（父页收到的消息）</h4>
                <ul class="simple__list">
                    <li v-for="(item, i) in fromChild" :key="i">{{ item }}</li>
                    <li v-if="!fromChild.length" class="simple__empty">
                        还没有消息，去上面的 iframe 里发一条
                    </li>
                </ul>
                <p class="simple__code">
                    window.addEventListener('message', e =&gt; { if (e.origin === 对方origin) ... })
                </p>
            </section>

            <!-- ── 要点 ───────────────────────────────────────────── -->
            <section class="simple__box">
                <h4>只要记住三件事</h4>
                <ol class="simple__notes">
                    <li>
                        <b>发送目标不同</b>：父页发给子页用
                        <code>iframe.contentWindow.postMessage</code>；子页发给父页用
                        <code>window.parent.postMessage</code>。
                    </li>
                    <li>
                        <b>第二个参数必须写对方 origin</b>，写 <code>'*'</code>
                        等于把消息广播给任意被劫持的框架；接收方也要校验
                        <code>e.origin</code>，否则任何页面都能伪造消息进来。
                    </li>
                    <li>
                        <b>只能传可序列化的数据</b>：数字/字符串/普通对象可以，函数、
                        DOM 节点、Vue 实例传不过去（会抛 DataCloneError）。
                    </li>
                </ol>
                <p class="simple__tip">
                    本演示父子同源（都跑在同一个 dev server），所以两边 origin 都取
                    <code>location.origin</code>。真实嵌第三方页面时，父页写死对方
                    origin，跨域后 iframe.contentDocument 会被同源策略拦截，只剩
                    postMessage 这一条路。
                </p>
            </section>
        </main>
    </div>
</template>

<script setup>
/**
 * 极简版：只用 postMessage + message 事件演示父子互发。
 * 握手排队、请求-响应、高度自适应等工程化处理见 @/views/iframse/index.vue。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AppHeader from '@/components/layout/AppHeader.vue';

/** 本演示子页与父页同源；跨域时改成写死对方 origin，如 'https://other-site.com' */
const CHILD_ORIGIN = location.origin;

const frameRef = ref();
const toChild = ref('');
const fromChild = ref([]);

/** 父 → 子：拿到 iframe 的 contentWindow 再发 */
function sendToChild() {
    const text = toChild.value.trim();
    if (!text) return;
    frameRef.value.contentWindow.postMessage({ from: 'parent', text }, CHILD_ORIGIN);
    toChild.value = '';
}

/** 子 → 父：父页监听自己的 window 就能收到 */
function onMessage(e) {
    if (e.origin !== CHILD_ORIGIN) return;
    if (!e.data || e.data.from !== 'child') return;
    fromChild.value.unshift(`${e.data.text}（来自 ${e.origin}）`);
    if (fromChild.value.length > 20) fromChild.value.pop();
}

onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));
</script>

<style scoped lang="less">
.simple {
    min-height: 100vh;
    background: @background;

    &__body {
        padding: @gap-md;
    }

    &__intro {
        margin: 0 0 @gap-md;
        font-size: @font-md;
        line-height: 1.8;
    }

    &__box {
        padding: @gap-md;
        margin-bottom: @gap-md;
        background: @background-white;
        border-radius: @radius-md;
    }

    h4 {
        margin: 0 0 @gap-sm;
        font-size: @font-md;
        font-weight: 500;
    }

    &__row {
        display: flex;
        gap: @gap-sm;
    }

    &__frame {
        display: block;
        width: 100%;
        height: 260px;
        border: 1px solid @primary-color;
        border-radius: @radius-sm;
        background: @background-white;
    }

    &__list {
        margin: 0;
        padding: @gap-sm;
        max-height: 160px;
        overflow: auto;
        list-style: none;
        border: 1px dashed @border-color;
        border-radius: @radius-sm;
        font-size: @font-sm;
    }

    &__empty {
        color: @text-secondary;
    }

    &__code {
        margin: @gap-sm 0 0;
        font-family: Consolas, Menlo, monospace;
        font-size: @font-sm;
        color: @text-secondary;
        word-break: break-all;
    }

    &__notes {
        margin: 0;
        padding-left: 20px;
        font-size: @font-md;
        line-height: 1.9;
    }

    &__tip {
        margin: @gap-md 0 0;
        padding: @gap-sm;
        background: @background;
        border-radius: @radius-sm;
        font-size: @font-sm;
        line-height: 1.8;
        color: @text-regular;
    }
}
</style>
