# Vue3 PC 端项目模板

面向 **PC 端**（后台管理 / 可视化大屏）场景的 Vue3 项目模板。由一个已交付的大型业务项目剥离重构而成——**保留完整的 Vite 构建与打包链路，剔除厂商私有包与业务页面**。

> 本项目只做 PC 端：不引入 Vant，不做 rem 适配，尺寸一律按 px 书写。

---

## 快速开始

```bash
# 1. 复制模板
cp -r nad-vue3-template my-project && cd my-project

# 2. 安装依赖
npm install

# 3. 本地环境变量（不入库）
cp .env.example .env.local
# 修改 VITE_PROXY_TARGET 为你的后端地址

# 4. 开发
npm run dev

# 5. 生产构建
npm run build
```

产物在 `dist/`，`base` 为相对路径，可直接投放任意 CDN 子目录或内网静态服务器。

---

## 相对原项目保留了什么

**完整保留（构建链路）**

| 能力 | 实现 |
|---|---|
| Vue SFC 编译 | `@vitejs/plugin-vue` |
| 浏览器兼容 | `@vitejs/plugin-legacy`，自动产出 modern + legacy 两套产物 |
| 文件式路由 | `vite-plugin-pages` |
| 自动导入 | `unplugin-auto-import`（Vue API + 工具函数） |
| 组件自动注册 | `unplugin-vue-components`（`src/components` 下组件免 import） |
| UI 组件库 | Element Plus（PC 端，全局注册） |
| 样式预处理 | Tailwind + Less + autoprefixer |
| 生产分包 | `manualChunks` 拆分 Vue 全家桶与 vendor |
| 多环境 | `.env.development` / `.env.production`，dev 走 proxy |

**剔除（厂商耦合与冗余）**

| 项 | 原因 |
|---|---|
| `@gtja/GTJABridge` | 私有源包，其他成员 `npm install` 直接失败 |
| `@gtja/git-commit-msg-linter` | 同上，私有源 |
| `gdt-jsapi`、`dingtalk-jsapi` | 特定 IM 容器，业务专属 |
| `vuex` | 与 pinia 并存，实际未用 |
| `express` | 前端项目引入服务端框架 |
| `vant` / `nutui` / `ant-design-vue` | 移动端 UI 库，本项目只做 PC 端，统一用 Element Plus |
| `tinymce` / `md-editor-v3` / `vue-element-plus-x` | 富文本业务专属 |
| `xe-utils` / `mockjs` / `@vue-flow/core` / `mui-player` | 业务专属 |
| `@better-scroll/*`（3 个包） | 业务专属 |
| `pnpm` | 把包管理器当依赖装是不必要的 |
| `dom-to-image` / `canvas-confetti` / `odometer` | 业务专属 |
| `vite-plugin-resolve-externals`（Amap） | 高德地图 externals 映射 |
| 原 `src/views` 全部页面 | 业务代码，含 AI 表单 / MBTI / 表格等 |

依赖从 **57 个降到 25 个**。

---

## 目录结构

```
├── index.html                    入口 HTML（含首屏骨架）
├── vite.config.js                构建配置主入口
├── postcss.config.cjs            tailwind + autoprefixer
├── tailwind.config.cjs           语义化设计令牌
├── tsconfig.json                 TS 配置
│
├── public/                       原样拷贝，不参与构建
│   └── favicon.svg
│
└── src/
    ├── main.js                   应用装配入口
    ├── App.vue                   根组件（keep-alive 路由出口）
    │
    ├── views/                    ★ 页面 = 文件式路由
    │   └── home/index.vue        → /
    │       └── components/       页面私有组件
    │       └── _private/         下划线目录自动忽略
    │
    ├── components/               ★ 全局组件（自动注册，无需 import）
    │   ├── layout/AppHeader.vue
    │   └── base/NoData.vue
    │
    ├── javascript/
    │   ├── router/index.js       文件路由 + 手写路由合并
    │   ├── request/index.js      axios 实例 + 拦截器
    │   ├── request/api.js        接口 URL 定义
    │   ├── store/index.js        Pinia（按领域拆分）
    │   ├── hooks/useList.js      分页列表范式
    │   └── tool/utils.js         纯工具函数
    │
    ├── styles/
    │   ├── variables.less        设计令牌
    │   └── global.less           reset + 基础排版
    │
    ├── utils/                    格式化、环境判断
    └── types/env.d.ts            环境变量与 RouteMeta 类型声明
```

---

## 核心约定

### 1. 文件式路由

`src/views` 下的目录结构即路由表，规则在 `vite.config.js` 的 `Pages()` 中配置。

| 文件 | 路径 |
|---|---|
| `views/home/index.vue` | `/` |
| `views/user/profile.vue` | `/user/profile` |
| `views/_shared/xxx.vue` | 不生成（`_` 前缀目录忽略） |

需要缓存的页面改 `vite.config.js` 中的 `keepAliveList`。手写路由写进 `src/javascript/router/index.js` 的 `customRoutes`，会与文件路由合并。

### 2. 自动导入

无需 `import` 即可使用：

- **Vue API**：`ref`、`computed`、`watch`、`useRoute`、`useRouter`...
- **本地组件**：`src/components` 下的组件直接写标签，无需 import
- **工具函数**：`src/javascript/tool/` 与 `src/javascript/hooks/` 的**具名导出**

> hooks 里的 `export default` 需要手动 import：
> `import useList from '@/javascript/hooks/useList'`

类型声明在 `src/types/auto-imports.d.ts`，`npm install` 后自动生成，已在 `.gitignore` 中。

### 3. Less 变量自动注入

在 `vite.config.js` 的 `css.preprocessorOptions.less` 中注入 `variables.less`，组件内直接用：

```vue
<style scoped lang="less">
.my-card {
    padding: @gap-lg;
    color: @text-primary;
}
</style>
```

**换肤只需改 `variables.less` 一个文件**，不会漏改。

### 4. 尺寸单位

只做 PC 端，**一律按 px 书写**，没有 rem/vw 换算链路。
需要自适应的布局用 flex / grid 或 Element Plus 的栅格，不要靠单位换算缩放。

### 5. 请求层

```js
import { get, postJson, postForm, postFile } from '@/javascript/request';
import { userApi } from '@/javascript/request/api';

const res = await get('/user/list', { page: 1 });
const r2 = await userApi.login({ username, password });
```

拦截器统一处理：错误码白名单、错误提示、401 跳转（注释状态，按需启用）。

> **重要**：本模板使用 `axios.create()` 独立实例，**没有覆盖全局 `axios.get`**。
> 原项目把 `axios.get` 重定义为 `(url, params)` 的包装函数，破坏了 axios 原生签名
> `get(url, config)`，是一处隐蔽的坑，迁移时已修正。

接口 URL 统一写在 `src/javascript/request/api.js`，按业务分组，不要散落在组件里。

### 6. 状态管理

按领域拆分，不做「一个 store 装所有」：

- `useUserStore` —— 用户、登录态、角色
- `useAppStore` —— 标题、主题、全局 loading

持久化用 `pick` 白名单，避免整包存储。

---

## 脚本命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器（含 HMR） |
| `npm run build` | 生产构建 |
| `npm run build:check` | 先类型检查再构建（CI 用） |
| `npm run build:dev` | 以 development 模式构建（保留 console） |
| `npm run preview` | 本地预览产物 |
| `npm run typecheck` | 仅类型检查 |
| `npm run clean` | 清理 dist 与 vite 缓存 |

> `npm run build` 只跑 `vite build`，不阻塞在类型检查上，避免 TS 报错卡住发版。
> CI 流水线请用 `npm run build:check`。

---

## 环境变量

| 变量 | 说明 |
|---|---|
| `VITE_APP_TITLE` | 应用标题 |
| `VITE_API_BASE` | 接口前缀（axios baseURL） |
| `VITE_PORT` | dev / preview 端口 |
| `VITE_PROXY_TARGET` | dev 代理目标 |
| `VITE_ENV` | 环境标识 |

> Vite 只暴露 `VITE_` 前缀变量到客户端。**任何密钥都不能写进 `.env.*`**。

---

## 技术栈

**运行时**：Vue 3.5 · Vue Router 4 · Pinia 3 · Element Plus 2.14（全局注册）· ECharts 6.1 · Axios 1.7 · Dayjs · qs

**构建**：Vite 5 · TypeScript 5 · PostCSS（tailwind + autoprefixer）· vite-plugin-pages · @vitejs/plugin-legacy

---

## 两个必须知道的坑

### 1. 不要在业务代码里 `import ... from 'vite'`

即使只是想拿个版本号：

```js
// ❌ 会把 vite 的 Node 端代码（连带 rollup、fs、crypto）打进浏览器包，构建直接失败
import { VERSION } from 'vite';

// ✅ 用编译期注入的常量
console.log(__VITE_VERSION__);
```

### 2. 私有源包会让团队装不上

原项目的 `@gtja/GTJABridge`、`@gtja/git-commit-msg-linter` 来自内网私有源，
其他成员 `npm install` 会直接失败。**模板不要引入私有源包**——
确有需要时用 `optionalDependencies` 或在文档中写明安装前置条件。
