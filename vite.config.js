import { defineConfig, loadEnv } from "vite";
import { existsSync } from "fs";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import legacyPlugin from "@vitejs/plugin-legacy";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import Pages from "vite-plugin-pages";

/**
 * IDC 三维机房引擎（vendored 副本，由 scripts/sync-idc.mjs 从 idc-visual-ops 同步）
 * engine/ 与 vendor/ 必须保持同级：engine/*.js 用 ../vendor/three.module.js 引用 three。
 */
const IDC_ROOT = process.env.VITE_IDC_ROOT || resolve(__dirname, "idc/engine");

/**
 * IDC 引擎缺失时的兜底：把 @idc/* 解析成空模块，避免构建直接 ENOENT 失败。
 *
 * 正常情况下引擎已 vendored 在 idc/（node scripts/sync-idc.mjs 同步），本插件不会命中；
 * 只有 VITE_IDC_ROOT 指错、或 idc/ 未提交到构建环境时才生效：产物里机房页不渲染，
 * 但 IdcOverview 有 window.IDC 判空会安全跳过，构建不会中断。
 */
function idcEngineFallback(idcRoot) {
  const root = resolve(idcRoot);
  const hasEngine = existsSync(resolve(root, "scene3d.js"));
  const VIRTUAL = "\0idc-fallback:";

  return {
    name: "idc-engine-fallback",
    enforce: "pre",
    buildStart() {
      if (!hasEngine) {
        this.warn(`未找到 IDC 引擎（${root}）：@idc/* 按空模块处理，三维机房页不会渲染`);
      }
    },
    resolveId(id) {
      if (hasEngine) return null;
      if (id.startsWith("@idc/")) return VIRTUAL + id.slice("@idc/".length);
      // 别名已展开的情况（vite:alias 先于本插件命中时）
      if (id.startsWith(root)) return VIRTUAL + id.slice(root.length + 1);
      return null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL)) return null;
      return id.endsWith(".css") ? "/* IDC 引擎缺失：占位样式 */" : "export default {}";
    },
  };
}

/**
 * Vite 构建配置（模板版）
 *
 * 从原项目保留的构建能力：
 * - vue SFC 编译
 * - legacy 插件（浏览器兼容，产物自动打 modern/legacy 两套）
 * - 文件式路由 vite-plugin-pages
 * - Vue API / 工具函数自动导入
 * - 生产分包 manualChunks
 *
 * 已剔除（原项目中的厂商耦合）：
 * - vite-plugin-resolve-externals 的 Amap 映射（高德地图，业务专属）
 * - NutUI / ElementPlus / AntDesignVue 三个 resolver（原项目多 UI 库并存）
 * - nutui 的 scss 变量自动注入
 *
 * 本项目只做 PC 端：不含 Vant、不做 rem 适配，尺寸一律按 px 书写。
 */
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isProd = mode === "production";

  return defineConfig({
    plugins: [
      idcEngineFallback(IDC_ROOT),

      vue(),

      // 文件式路由：src/views 下目录结构即路由表
      Pages({
        dirs: "src/views",
        extensions: ["vue"],
        ignore: ["**/_*/**/*"],
        exclude: ["**/components/*.vue"],
        extendRoute(route) {
          const keepAliveList = ["home"];
          return {
            ...route,
            meta: {
              title: route.path === "/" ? "首页" : undefined,
              keepAlive: keepAliveList.includes(String(route.name)),
            },
          };
        },
      }),

      // 自动导入：Vue API + 常用工具，无需 import
      AutoImport({
        imports: [
          "vue",
          "vue-router",
          "pinia",
          {
            axios: [["default", "axios"]],
            dayjs: [["default", "dayjs"]],
            qs: [["default", "qs"]],
            "lodash-es": [["default", "_"]],
          },
        ],
        dirs: ["./src/javascript/tool/**", "./src/javascript/hooks/**"],
        dts: "src/types/auto-imports.d.ts",
        // IDC 引擎是自带 IIFE 的原生 ES Module，不能被注入自动导入前导码
        // （插件会把无 import/export 的文件当 CJS，注入 require() 直接报错）
        // 同步产物见 idc/
        exclude: [/[\\/]idc[\\/](engine|vendor)[\\/]/, /[\\/]@idc[\\/]/],
      }),

      // 本地组件自动注册：用到什么打包什么
      Components({
        dirs: ["src/components"],
        dts: "src/types/components.d.ts",
      }),

      // 浏览器兼容：自动产出 modern + legacy 两套产物并注入 html
      legacyPlugin({
        targets: ["> 1%", "not dead", "last 2 Chrome versions", "Firefox ESR"],
        additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      }),
    ],

    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        // IDC 引擎（原生 ES Module，Vite 直接编译，无需打包步骤）
        "@idc": resolve(IDC_ROOT),
      },
    },

    // 编译期常量。避免业务代码 import { VERSION } from 'vite'
    // （会把 Node 端代码打进浏览器包，导致构建失败）
    define: {
      __VITE_VERSION__: JSON.stringify(`Vite ${mode}`),
    },

    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          // 自动注入设计令牌，组件内可直接用 @primary-color 等变量，无需 @import
          additionalData: `@import "@/styles/variables.less";`,
        },
      },
    },

    assetsInclude: ["**/*.gltf", "**/*.png"],

    // 相对路径，产物可投放任意 CDN 子目录或内网静态服务器
    base: "./",

    build: {
      outDir: "dist",
      assetsDir: "static",
      // 注意：不要设 build.target，@vitejs/plugin-legacy 会接管并覆盖它，
      // 兼容目标统一在上面的 legacyPlugin({ targets }) 中配置
      rollupOptions: {
        output: {
          // 分包：控制单文件体积，vendor 长期缓存
          manualChunks: {
            vue: ["vue", "vue-router", "pinia"],
            vendor: ["axios", "dayjs", "qs"],
          },
        },
      },
      chunkSizeWarningLimit: 800,
      minify: "terser",
      terserOptions: {
        compress: {
          // 生产环境移除调试日志，开发环境保留
          drop_console: isProd,
        },
      },
    },

    server: {
      host: "0.0.0.0",
      port: Number(env.VITE_PORT) || 3010,
      open: false,
      proxy: {
        [env.VITE_API_BASE || "/api"]: {
          target: env.VITE_PROXY_TARGET,
          changeOrigin: true,
          // 后端接口不带 /api 前缀时开启
          // rewrite: p => p.replace(/^\/api/, ''),
        },
      },
    },

    preview: {
      port: Number(env.VITE_PORT) || 4173,
    },
  });
};
