/**
 * @fileoverview 路由配置
 * @description 基于 vite-plugin-pages 的文件式路由 + 手写路由合并
 *
 * 文件路由表规则见 vite.config.js 中的 Pages 配置：
 * - src/views/home/index.vue   → /
 * - src/views/user/profile.vue → /user/profile
 * - src/views/_shared/x.vue    → 不生成（_ 前缀目录整体忽略）
 */
import { createRouter, createWebHashHistory } from 'vue-router';
import routes from 'virtual:generated-pages';

/**
 * 手写路由：需要独立 Layout、鉴权包装、或由后端菜单动态下发的场景
 * 需要时把下面的数组补上即可，会与文件路由合并
 */
const customRoutes = [
    // {
    //     path: '/login',
    //     name: 'login',
    //     meta: { title: '登录' },
    //     component: () => import('@/views/login/index.vue'),
    // },
];

/**
 * 默认 hash 模式：静态托管即可，无需服务端 rewrite
 * 如需 history 模式，改用 createWebHistory() 并在服务端配置 fallback 到 index.html
 */
const router = createRouter({
    history: createWebHashHistory(),
    routes: [...customRoutes, ...routes],
    scrollBehavior: (to, from, savedPosition) => {
        // 浏览器前进后退时恢复滚动位置
        if (savedPosition) return savedPosition;
        return { top: 0 };
    },
});

/**
 * 路由守卫
 * 鉴权逻辑按项目实际情况启用，示例：
 *
 * router.beforeEach(async to => {
 *     const store = useUserStore();
 *     if (to.meta.auth !== false && !store.token) {
 *         return { path: '/login', query: { redirect: to.fullPath } };
 *     }
 *     return true;
 * });
 */

/**
 * 更新页面标题
 */
router.afterEach(to => {
    const title = to.meta.title;
    document.title = title ? `${title} - ${import.meta.env.VITE_APP_TITLE}` : import.meta.env.VITE_APP_TITLE;
});

export default router;