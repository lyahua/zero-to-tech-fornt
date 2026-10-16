/**
 * 编译期注入的常量
 * 由 vite.config.js 的 define 提供，无需 import
 */
declare const __VITE_VERSION__: string;

interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string;
    readonly VITE_API_BASE: string;
    readonly VITE_PORT: string;
    readonly VITE_PROXY_TARGET: string;
    readonly VITE_ENV: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/**
 * 路由 meta 扩展
 * 声明后 route.meta.xxx 才有类型提示
 */
declare module 'vue-router' {
    interface RouteMeta {
        /** 页面标题，router.afterEach 会写入 document.title */
        title?: string;
        /** 是否走 keep-alive */
        keepAlive?: boolean;
        /** 是否需要登录，默认 true */
        auth?: boolean;
    }
}

/** 声明以 .vue 结尾的模块 */
declare module '*.vue' {
    import type { DefineComponent } from 'vue';

    const component: DefineComponent<{}, {}, any>;
    export default component;
}