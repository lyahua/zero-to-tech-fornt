/**
 * rem 适配：设置 html 根字号
 *
 * postcss-pxtorem 的 rootValue 是 37.5（对应 375px 设计稿），
 * 换算后 1rem 必须等于「根字号 = 屏幕宽 / 10」才能还原成设计稿尺寸。
 * 项目里没有 amfe-flexible 之类的脚本，根字号会停在浏览器默认 16px，
 * 导致所有 px 值被缩小约 2.34 倍（14px 只渲染出 6px）。
 *
 * 宽屏（>= DESKTOP_BREAK）不再跟随视口放大，固定 37.5px，
 * 让桌面端按设计稿 1:1 显示，避免 1920px 宽时字号被放大 5 倍。
 */

// 与 postcss.config.cjs 的 rootValue 保持一致
const ROOT_PX = 37.5;
const DESKTOP_BREAK = 768;

const docEl = document.documentElement;

export function syncRootFontSize() {
    const w = docEl.clientWidth || window.innerWidth;
    docEl.style.fontSize = w >= DESKTOP_BREAK ? `${ROOT_PX}px` : `${w / 10}px`;
}

syncRootFontSize();
window.addEventListener('resize', syncRootFontSize);
window.addEventListener('pageshow', syncRootFontSize);
