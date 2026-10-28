/**
 * @fileoverview 路由配置（手写路由表）
 * @description
 * 路由与目录结构解耦：目录只管存放，路由表在这里显式声明。
 * 详情页、弹窗页、带参数的页面不再被迫单独建一级目录，
 * 可以放在所属页面的目录下（如 idc-map/deploy 对应 /idc-deploy）。
 *
 * 约定：
 * - path 与目录不再自动对应，改 path 不会影响文件位置
 * - name 是菜单与 keep-alive 的标识，必须唯一且稳定
 * - meta.title 同时供 document.title 和首页菜单使用，新增页面只需在这里写一次
 */
import { createRouter, createWebHashHistory } from 'vue-router';

/** 应用标题，缺省时的兜底（afterEach 里也用到） */
const APP_TITLE = import.meta.env.VITE_APP_TITLE;

const routes = [
    {
        path: '/',
        name: 'index',
        component: () => import('@/views/index/index.vue'),
        meta: { title: '首页' },
    },

    // ── IDC 机房可视化 ────────────────────────────────────────────
    // 三个视图共用 @/api/idc 的数据层，文件集中在 src/views/idc* 下
    {
        path: '/idc-map',
        name: 'idc-map',
        component: () => import('@/views/idc-map/index.vue'),
        meta: { title: 'IDC 全国机房地图' },
    },
    {
        // 平面布置图：从全国地图下钻进入，文件放在 idc-map/deploy 下
        path: '/idc-deploy',
        name: 'idc-deploy',
        component: () => import('@/views/idc-map/deploy/index.vue'),
        meta: { title: 'IDC 机房平面布置图' },
    },
    {
        path: '/idc-floorplan',
        name: 'idc-floorplan',
        component: () => import('@/views/idc-floorplan/index.vue'),
        meta: { title: 'IDC 机房平面视图' },
    },
    {
        path: '/idc',
        name: 'idc',
        component: () => import('@/views/idc/index.vue'),
        meta: { title: 'IDC 三维机房总览' },
    },

    // ── 其他 ──────────────────────────────────────────────────────
    {
        path: '/mbti',
        name: 'mbti',
        component: () => import('@/views/mbti/index.vue'),
        meta: { title: 'MBTI · SWOT 可视化' },
    },
    {
        path: '/test',
        name: 'test',
        component: () => import('@/views/test/index.vue'),
        meta: { title: '表格表单测试' },
    },

    // 兜底：手输错地址回首页，避免白屏
    { path: '/:pathMatch(.*)*', redirect: '/' },
];

/**
 * 默认 hash 模式：静态托管即可，无需服务端 rewrite
 * 如需 history 模式，改用 createWebHistory() 并在服务端配置 fallback 到 index.html
 */
const router = createRouter({
    history: createWebHashHistory(),
    routes,
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
    document.title = title ? `${title} - ${APP_TITLE}` : APP_TITLE;
});

export default router;
