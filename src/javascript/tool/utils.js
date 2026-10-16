/**
 * 纯工具函数
 *
 * 本目录下导出的具名函数会由 unplugin-auto-import 自动注入，业务代码无需 import。
 * 保持无副作用，方便后续接 Vitest 做单测。
 */

/**
 * 防抖
 */
export function debounce(fn, wait = 300) {
    let timer = null;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

/**
 * 节流
 */
export function throttle(fn, wait = 300) {
    let last = 0;
    return (...args) => {
        const now = Date.now();
        if (now - last >= wait) {
            last = now;
            fn(...args);
        }
    };
}

/**
 * 深拷贝（简单场景，复杂对象建议用 structuredClone）
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 是否为空值：null / undefined / '' / [] / {}
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    if (typeof value === 'string') return value.trim() === '';
    return false;
}