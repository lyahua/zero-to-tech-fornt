/**
 * PostCSS 配置
 *
 * 链路：tailwind → autoprefixer → pxtorem（rem 适配）
 *
 * 原项目这里写的是 rootValue({ file }) { return file.indexOf('vant') !== -1 ? 37.5 : 37.5 }
 * 两个分支相同，等于没做适配。模板改为固定值。
 */
module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
        'postcss-pxtorem': {
            // 设计稿按 375px 宽出图，配合 src/utils/rem.js（根字号 = 屏宽 / 10）
            // 在 375px 屏上 1rem = 37.5px，即 px 值 1:1 还原
            rootValue: 37.5,
            propList: ['*'],
            // 需要保持 px 的类名（如固定定位、1px 边框）
            selectorBlackList: ['.no-rem'],
            // 不处理第三方包，以及 IDC 大屏引擎（其 px 尺寸是三维 HUD 的绝对布局，
            // 转 rem 后会随根字号漂移导致栅格错位）。
            // 注意：postcss-pxtorem 拿到的 from 可能是相对路径，故用 (^|[/\]) 兼容两种形式。
            exclude:
                /node_modules|(?:^|[\\/])idc[\\/](?:engine|vendor)[\\/]/,
        },
    },
};