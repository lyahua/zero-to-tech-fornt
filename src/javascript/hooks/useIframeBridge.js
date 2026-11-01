/**
 * @fileoverview iframe 跨窗口通信封装（父页面侧）
 * @description
 * 跨域 iframe 之间只能靠 postMessage 通信，但裸用 postMessage 有三个必踩的坑：
 *
 * 1. **时序**：iframe 的 load 事件只代表 DOM 加载完，不代表子页的 message 监听器
 *    已经注册。父页在 load 里立刻发消息，子页大概率收不到 → 必须让子页主动发
 *    ready 做握手，握手前的消息先排队。
 * 2. **安全**：postMessage(data, '*') 等于把消息广播给任意被劫持的框架；接收端不
 *    校验 event.origin / event.source，任何第三方框架都能伪造消息进来。这里双向
 *    都校验，并且 targetOrigin 缺失时直接拒发，绝不退化成 '*'。
 * 3. **回包**：postMessage 本身没有返回值，"请求-响应"要自己带 requestId。这里用
 *    信封里的 replyTo 字段实现 request()，带超时与错误传递。
 *
 * 消息信封（父子共用，子页见 public/iframe-child/index.html）：
 *   { source: 'iframe-parent' | 'iframe-child', type: string, payload: any, replyTo?: string }
 *
 * 约定：
 *   父 → 子   init（握手后自动下发）、command、任意自定义 type
 *   子 → 父   ready（握手）、resize（高度自适应）、rpc-reply（回包）、自定义事件
 *   带 replyTo 的消息，对端需用 type: 'rpc-reply' 回一包，
 *   payload 形如 { ok: true, data } 或 { ok: false, error }
 */
import { onBeforeUnmount, onMounted, ref, unref } from 'vue';

/** 信封标识，子页需与 CHILD 保持一致 */
export const IFRAME_SOURCE = {
    PARENT: 'iframe-parent',
    CHILD: 'iframe-child',
};

/** 请求-响应的回包类型 */
const REPLY_TYPE = 'rpc-reply';

/**
 * @param {object} options
 * @param {import('vue').Ref|import('vue').ShallowRef} options.frameRef iframe 元素的模板 ref
 * @param {string|import('vue').Ref|Function} options.origin 子页 origin，**必填**，不允许 '*'
 * @param {number} [options.timeout] request 默认超时（毫秒）
 * @param {number} [options.minHeight] resize 上报高度的下限
 * @param {number} [options.maxHeight] resize 上报高度的上限
 * @param {string} [options.readyType] 握手信号类型
 * @param {Function} [options.initPayload] 握手成功后下发的初始化数据
 */
export function useIframeBridge(options = {}) {
    const {
        frameRef,
        origin,
        timeout = 5000,
        minHeight = 200,
        maxHeight = 4000,
        readyType = 'ready',
        initPayload,
    } = options;

    /** 子页是否已完成握手 */
    const ready = ref(false);
    /** 子页上报的自适应高度，0 表示还没收到 */
    const height = ref(0);

    /** 握手前的待发队列 */
    const queue = [];
    /** replyId -> { resolve, reject, timer } */
    const pending = new Map();
    /** type -> Set<handler>；'*' 为通配，用于日志/调试 */
    const listeners = new Map();

    function resolveOrigin() {
        const value = typeof origin === 'function' ? origin() : unref(origin);
        return typeof value === 'string' && value !== '*' ? value : '';
    }

    /** 模板 ref 可能拿到组件实例，统一取到真正的 iframe */
    function frameEl() {
        const el = unref(frameRef);
        if (!el) return null;
        return el.contentWindow ? el : el.$el || null;
    }

    function rawPost(type, payload, replyTo) {
        const target = resolveOrigin();
        const win = frameEl()?.contentWindow;
        if (!win) return false;
        if (!target) {
            console.warn('[useIframeBridge] origin 未解析，已拒绝发送（禁止用 * 广播）');
            return false;
        }
        win.postMessage({ source: IFRAME_SOURCE.PARENT, type, payload, replyTo }, target);
        return true;
    }

    /**
     * 单向发送。未握手时入队，握手后自动补发
     * @returns {boolean} 是否已立即发出
     */
    function send(type, payload) {
        if (ready.value) return rawPost(type, payload);
        queue.push([type, payload]);
        return false;
    }

    /**
     * 请求-响应
     * @param {string} type
     * @param {object} [payload]
     * @param {number} [ms] 超时时间
     * @returns {Promise<any>} 子页 reject 时以 Error 形式带出 error 字段
     */
    function request(type, payload = {}, ms = timeout) {
        return new Promise((resolve, reject) => {
            const replyId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            pending.set(replyId, {
                resolve,
                reject,
                timer: setTimeout(() => {
                    pending.delete(replyId);
                    reject(new Error(`iframe 请求超时: ${type}`));
                }, ms),
            });

            if (ready.value) {
                rawPost(type, payload, replyId);
            } else {
                // 未握手：保留 pending，等 flush 时带上 replyId 一起补发
                queue.push([type, payload, replyId]);
            }
        });
    }

    /**
     * 订阅子页消息
     * @param {string} type 消息类型，'*' 表示全部
     * @param {Function} handler (payload, event) => void
     * @returns {Function} 取消订阅
     */
    function on(type, handler) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(handler);
        return () => off(type, handler);
    }

    function off(type, handler) {
        listeners.get(type)?.delete(handler);
    }

    function emit(type, payload, event) {
        listeners.get(type)?.forEach(fn => fn(payload, event));
        if (type !== '*') listeners.get('*')?.forEach(fn => fn(payload, event, type));
    }

    function dropPending(error) {
        pending.forEach(({ reject, timer }) => {
            clearTimeout(timer);
            reject(error);
        });
        pending.clear();
    }

    /** 子页重新加载 / 切换地址后重置握手状态，未完成的请求一并作废 */
    function reset() {
        ready.value = false;
        queue.length = 0;
        dropPending(new Error('iframe 已重新加载，请求被丢弃'));
    }

    function handleMessage(event) {
        const target = resolveOrigin();
        if (!target || event.origin !== target) return;

        const frame = frameEl();
        if (!frame || event.source !== frame.contentWindow) return;

        const msg = event.data;
        if (!msg || msg.source !== IFRAME_SOURCE.CHILD || typeof msg.type !== 'string') return;

        if (msg.type === readyType) {
            ready.value = true;
            if (initPayload) rawPost('init', initPayload());
            queue.splice(0).forEach(([type, payload, replyId]) => rawPost(type, payload, replyId));
        }

        if (msg.type === 'resize') {
            const next = Number(msg.payload?.height) || 0;
            height.value = Math.min(Math.max(next, minHeight), maxHeight);
        }

        if (msg.type === REPLY_TYPE && pending.has(msg.replyTo)) {
            const { resolve, reject, timer } = pending.get(msg.replyTo);
            clearTimeout(timer);
            pending.delete(msg.replyTo);
            if (msg.payload?.ok === false) reject(new Error(msg.payload.error || '子页处理失败'));
            else resolve(msg.payload?.data);
        }

        emit(msg.type, msg.payload, event);
    }

    onMounted(() => window.addEventListener('message', handleMessage));

    onBeforeUnmount(() => {
        window.removeEventListener('message', handleMessage);
        dropPending(new Error('父页面已卸载'));
        listeners.clear();
    });

    return { ready, height, send, request, on, off, reset };
}
