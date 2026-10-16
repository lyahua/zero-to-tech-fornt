/**
 * @fileoverview 原生容器能力封装
 * @description 统一收口企业 IM WebView 的原生能力调用
 *
 * 原项目里 window.Bridge / GTJABridge.callNative 散落在 4 个文件、40+ 处调用，
 * 且没有能力检测——原生 API 缺失时直接抛错白屏。
 *
 * 本模块的约定：**能力检测 + Web 兜底**，
 * 业务代码只管调用，不感知当前处于原生容器还是普通浏览器。
 */
import { ref } from 'vue';

/**
 * 容器类型
 */
export const ContainerType = {
    NATIVE: 'native',
    WEB: 'web',
};

/**
 * 当前容器类型（模块加载时判定一次）
 */
export const containerType = ref(ContainerType.WEB);

/**
 * 检测原生容器
 *
 * 不同 IM 容器的注入对象不同，这里做多路探测。
 * 新增容器时在数组里追加判断即可。
 */
function detectContainer() {
    if (typeof window === 'undefined') return ContainerType.WEB;

    // iOS WKWebView
    if (window.webkit?.messageHandlers?.postMessage) return ContainerType.NATIVE;
    // Android JSBridge
    if (window.prompt && window._bridge) return ContainerType.NATIVE;

    return ContainerType.WEB;
}

containerType.value = detectContainer();

/**
 * 是否在原生容器中
 */
export function isNative() {
    return containerType.value === ContainerType.NATIVE;
}

/**
 * 调用原生能力
 *
 * @param {string} method 原生方法名
 * @param {object} params 参数
 * @returns {Promise<any>} 原生返回结果；原生环境不可用时 resolve(null)，**不 reject**
 *
 * 注意：这里刻意不抛错。原生能力是增强项而非必需项，
 * 缺失时降级为 Web 实现，不应中断业务流程。
 */
export function invoke(method, params = {}) {
    return new Promise(resolve => {
        if (!isNative()) {
            console.warn(`[useNative] 非原生容器，忽略调用: ${method}`);
            resolve(null);
            return;
        }

        try {
            // iOS 通道
            if (window.webkit?.messageHandlers?.postMessage) {
                window.webkit.messageHandlers.postMessage.postMessage(
                    JSON.stringify({ method, params })
                );
                resolve(null);
                return;
            }

            // Android 通道
            if (window._bridge?.call) {
                resolve(window._bridge.call(method, JSON.stringify(params)));
                return;
            }

            resolve(null);
        } catch (error) {
            console.error(`[useNative] 调用失败: ${method}`, error);
            resolve(null);
        }
    });
}

/**
 * 设置返回手势（iOS 边缘滑动返回）
 */
export function setGoBackGesture(enable = true) {
    return invoke('setGoBackGesture', { needGoBack: enable ? '1' : '0' });
}

/**
 * 调起系统分享面板
 * 降级：使用 Web Share API，浏览器不支持时复制到剪贴板
 */
export async function share({ title, url, text } = {}) {
    if (isNative()) {
        await invoke('openShare', { title, url, text });
        return true;
    }

    if (navigator.share) {
        try {
            await navigator.share({ title, url, text });
            return true;
        } catch {
            // 用户取消，不视为失败
            return false;
        }
    }

    if (navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        return true;
    }

    return false;
}

/**
 * 调起相册选择
 * @returns {Promise<string|null>} 选中的本地文件 base64，原生不可用时为 null
 */
export async function openAlbum() {
    if (!isNative()) {
        // Web 降级：用 input[type=file]
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = () => {
                const file = input.files?.[0];
                if (!file) return resolve(null);

                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }

    const res = await invoke('openAlbum', {});
    return res?.base64 ?? null;
}