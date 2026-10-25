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
// Vant 走按需引入：unplugin-vue-components + VantResolver 在编译时自动注册组件与样式，
// 模板中直接写 <van-button> 即可，main.js 无需 import Vant，也无需 app.use(Vant)。
//
// ★ 为什么下面这几行不能省：
// Vant 的组件 JS（index.mjs）不引入自身样式，样式依赖 resolver 在「模板里出现组件标签」
// 时才自动注入。但 showToast / showDialog / showImagePreview 等是**函数式 API**，
// 模板中并没有 <van-toast> 这类标签，resolver 无从触发 → 样式永远缺失 → 提示框「不显示」。
// 所以凡是函数式用到的组件，样式必须在这里手动引入一次。
// 后续用到新的函数式 API 时，按同样方式追加对应样式即可：
//   showNotify / closeNotify      → vant/es/notify/style
//   showImagePreview              → vant/es/image-preview/style
//   showConfirmDialog（同 dialog）→ vant/es/dialog/style
// 注意只引这些函数式 API 的样式，不要引 'vant/lib/index.css'（那是全量，约 200KB）。
import 'vant/es/toast/style';
import 'vant/es/dialog/style';
import 'vant/es/image-preview/style';

// Element Plus 走全局注册（全量引入组件 + 全量样式），模板中直接写 <el-*> 即可。
// 与上面的 Vant 按需引入并存：Vant 面向移动端页面，Element Plus 面向后台/PC 页面。
// 注意体积：全量引入约 300KB+ JS / 300KB+ CSS，若后续 PC 页面变多可改为
// unplugin-vue-components 的 ElementPlusResolver 按需引入。
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

// rem 适配：必须在挂载前设置 html 根字号，否则首屏尺寸偏小
import './utils/rem';

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
