/**
 * @fileoverview 应用入口
 * @description 组装 Vue 应用：状态管理 / 路由 / 请求层 / UI 库 / 全局样式
 *
 * 装配顺序有依赖，勿随意调换：
 *   pinia（其他模块初始化时会读 store）
 *     → router
 *       → request（拦截器里要用 router 做登录跳转）
 *         → 全局样式
 */
import { createApp } from 'vue';
import App from './App.vue';

// Element Plus 走全局注册（全量引入组件 + 全量样式），模板中直接写 <el-*> 即可。
// 本项目只做 PC 端，统一用 Element Plus；若后续 PC 页面变多可改为
// unplugin-vue-components 的 ElementPlusResolver 按需引入以减小体积。
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import router from './javascript/router';
import pinia from './javascript/store';

import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
pinia.use(piniaPluginPersistedstate);

// 请求层：注册拦截器，依赖 router
import './javascript/request';

// 全局样式
import './styles/global.less';

// 工具函数副作用模块（格式化等，具体函数由 unplugin-auto-import 按需注入）
import './utils';

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(ElementPlus);

app.mount('#app');

// 移除首屏骨架，避免与已渲染内容重叠
document.getElementById('app-loading')?.remove();

export default app;
