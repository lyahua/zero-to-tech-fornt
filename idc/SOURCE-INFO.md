# idc/ —— IDC 三维机房引擎（vendored 副本）

来源仓库：`idc-visual-ops`，同步命令：`node scripts/sync-idc.mjs`（上次同步 2026-10-25）

- `engine/` 引擎源码（原生 ES Module，Vite 直接编译）
- `vendor/` three.js r169 及 OrbitControls / RoomEnvironment（MIT，见 LICENSE-three.txt）

## 不要手改本目录内容
改动请在引擎仓库完成后重新同步；engine 与 vendor 必须保持同级，
因为 engine/*.js 用 `../vendor/three.module.js` 相对路径引用 three。

## 许可
引擎为 **AGPL-3.0-or-later**（全文见 `LICENSE`，闭源商业集成或 SaaS 托管需商业授权，见 `COMMERCIAL-LICENSE.md`）。
three.js 为 MIT（见 `vendor/LICENSE-three.txt`）。

## 本工程的相关约定
- 别名 `@idc` → `./idc/engine`（见 vite.config.js）
- Tailwind / tsconfig / vite-plugin-pages 均不扫描本目录
- postcss-pxtorem 已排除本目录：HUD 的 px 是三维大屏绝对布局，转 rem 会错位
