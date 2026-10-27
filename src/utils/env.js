/**
 * 环境判断工具
 */

/**
 * 运行模式
 * 用 import.meta.env.DEV 判断，不要用 window.isDev
 * （后者从未赋值，恒为 undefined，会导致生产环境走进开发分支）
 */
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
