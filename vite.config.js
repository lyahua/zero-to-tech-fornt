import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import legacyPlugin from "@vitejs/plugin-legacy";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { VantResolver } from "unplugin-vue-components/resolvers";
import Pages from "vite-plugin-pages";

/**
 * Vite 构建配置（模板版）
 *
 * 从原项目保留的构建能力：
 * - vue SFC 编译
 * - legacy 插件（浏览器兼容，产物自动打 modern/legacy 两套）
 * - 文件式路由 vite-plugin-pages
 * - Vue API / 工具函数自动导入
 * - Vant 组件按需引入
 * - rem 适配（postcss-pxtorem，见 postcss.config.cjs）
 * - 生产分包 manualChunks
 *
 * 已剔除（原项目中的厂商耦合）：
 * - vite-plugin-resolve-externals 的 Amap 映射（高德地图，业务专属）
 * - NutUI / ElementPlus / AntDesignVue 三个 resolver（原项目多 UI 库并存）
 * - nutui 的 scss 变量自动注入
 */
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isProd = mode === "production";

  return defineConfig({
    plugins: [
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
            // Vant 只自动导入「函数式 API」（showToast 等）。
            // 组件由下面的 VantResolver 负责，不要在这里加 ["default", "Vant"]，
            // 那会把整个 Vant 包（含 Node 端代码）暴露为全局变量并破坏 tree-shaking。
            // ★ 函数式 API 只自动导入 JS，不含样式 —— 样式需在 main.js 手动引
            //   vant/es/<component>/style，原因见 main.js 中的注释。
            vant: [
              "showToast",
              "showLoadingToast",
              "showSuccessToast",
              "showFailToast",
              "closeToast",
              "showDialog",
              "closeDialog",
              "showImagePreview",
            ],
          },
        ],
        dirs: ["./src/javascript/tool/**", "./src/javascript/hooks/**"],
        dts: "src/types/auto-imports.d.ts",
      }),

      // Vant 按需引入：用到什么打包什么
      Components({
        dirs: ["src/components"],
        dts: "src/types/components.d.ts",
        resolvers: [VantResolver({ style: "css" })],
      }),

      // 浏览器兼容：自动产出 modern + legacy 两套产物并注入 html
      legacyPlugin({
        targets: ["> 1%", "not dead", "Android > 5", "iOS > 10"],
        additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      }),
    ],

    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
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
