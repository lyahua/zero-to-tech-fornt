/**
 * 从 IDC 引擎仓库同步源码到本工程 idc/ 目录（vendoring）
 *
 * 为什么需要：引擎（idc-visual-ops）是独立仓库的原生 ES Module，Vite 可以直接编译，
 * 但构建机 / CI 上不一定有那个仓库。拷进本工程后打包完全自包含。
 *
 * 用法：node scripts/sync-idc.mjs [引擎src路径]
 *      默认取环境变量 VITE_IDC_ROOT，再默认 e:/javaFile/idc-visual-ops/src
 *
 * 目录结构不能拍平：engine/*.js 内部是 `import "../vendor/three.module.js"`，
 * 所以 engine/ 与 vendor/ 必须保持同级。
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(process.argv[2] || process.env.VITE_IDC_ROOT || "e:/javaFile/idc-visual-ops/src");

const ENGINE_FILES = [
    "data.js",        // 模拟数据 + 心跳
    "scene3d.js",     // 三维场景（含 dispose）
    "hud.js",         // HUD 大屏 DOM
    "textures.js",    // Canvas 贴图 / 材质（含 disposeTextures）
    "props.js",       // 机柜与设备模型
    "pointtable.js",  // 动环点位表
    "styles.css",     // HUD 样式（固定 px，不可转 rem）
    "host-vue.css",   // 嵌入宿主的外壳样式补丁
];
const VENDOR_FILES = [
    "three.module.js",
    "OrbitControls.js",
    "RoomEnvironment.js",
    "LICENSE-three.txt",
];
/* AGPL-3.0 副本随本工程分发，必须同时提供许可证全文 */
const LICENSE_FILES = ["LICENSE", "COMMERCIAL-LICENSE.md"];

const ENGINE_DIR = join(ROOT, "idc", "engine");
const VENDOR_DIR = join(ROOT, "idc", "vendor");
const SRC_VENDOR = resolve(SRC, "..", "vendor");

if (!existsSync(join(SRC, "scene3d.js"))) {
    console.error(`[sync-idc] 找不到引擎源码：${SRC}`);
    process.exit(1);
}
mkdirSync(ENGINE_DIR, { recursive: true });
mkdirSync(VENDOR_DIR, { recursive: true });

let bytes = 0;
for (const f of ENGINE_FILES) {
    const to = join(ENGINE_DIR, f);
    copyFileSync(join(SRC, f), to);
    bytes += readFileSync(to).length;
}
for (const f of VENDOR_FILES) {
    const from = join(SRC_VENDOR, f);
    if (!existsSync(from)) {
        console.warn(`[sync-idc] 跳过缺失文件 ${f}`);
        continue;
    }
    const to = join(VENDOR_DIR, f);
    copyFileSync(from, to);
    bytes += readFileSync(to).length;
}

for (const f of LICENSE_FILES) {
    const from = resolve(SRC, "..", f);
    if (!existsSync(from)) {
        console.warn(`[sync-idc] 缺少 ${f}（AGPL 副本需随工程分发许可证全文），请手工补齐`);
        continue;
    }
    copyFileSync(from, join(ROOT, "idc", f));
}

/* three.module.js 头部许可证声明必须保留，这里只做校验不改动内容 */
const three = readFileSync(join(VENDOR_DIR, "three.module.js"), "utf8");
if (!/SPDX-License-Identifier: MIT/i.test(three.slice(0, 4000))) {
    console.warn("[sync-idc] 警告：three.module.js 头部未匹配到 MIT 声明，请人工确认");
}

writeFileSync(
    join(ROOT, "idc", "SOURCE-INFO.md"),
    `# idc/ —— IDC 三维机房引擎（vendored 副本）

来源仓库：\`idc-visual-ops\`，同步命令：\`node scripts/sync-idc.mjs\`（上次同步 ${new Date().toISOString().slice(0, 10)}）

- \`engine/\` 引擎源码（原生 ES Module，Vite 直接编译）
- \`vendor/\` three.js r169 及 OrbitControls / RoomEnvironment（MIT，见 LICENSE-three.txt）

## 不要手改本目录内容
改动请在引擎仓库完成后重新同步；engine 与 vendor 必须保持同级，
因为 engine/*.js 用 \`../vendor/three.module.js\` 相对路径引用 three。

## 许可
引擎为 **AGPL-3.0-or-later**（全文见 \`LICENSE\`，闭源商业集成或 SaaS 托管需商业授权，见 \`COMMERCIAL-LICENSE.md\`）。
three.js 为 MIT（见 \`vendor/LICENSE-three.txt\`）。

## 本工程的相关约定
- 别名 \`@idc\` → \`./idc/engine\`（见 vite.config.js）
- Tailwind / tsconfig / vite-plugin-pages 均不扫描本目录
- 本工程只做 PC 端，不做 rem 适配，HUD 的 px 尺寸按原样生效
`,
    "utf8"
);

console.log(`[sync-idc] ${SRC} → idc/  完成，共 ${(bytes / 1024 / 1024).toFixed(2)} MB`);
