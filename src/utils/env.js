/**
 * 环境判断工具
 */

/**
 * 是否 iOS —— 部分移动端 WebView 的行为在 iOS 上有差异，需分支处理时用
 */
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * 是否 Android
 */
export const isAndroid = /Android/i.test(navigator.userAgent);

/**
 * 是否微信内置浏览器
 */
export const isWeixin = /MicroMessenger/i.test(navigator.userAgent);

/**
 * 运行模式
 * 用 import.meta.env.DEV 判断，不要用 window.isDev
 * （后者从未赋值，恒为 undefined，会导致生产环境走进开发分支）
 */
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;