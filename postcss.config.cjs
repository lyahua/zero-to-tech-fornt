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
            // 设计稿按 750px 宽出图 → 1rem = 100px 设计像素
            rootValue: 37.5,
            propList: ['*'],
            // 需要保持 px 的类名（如固定定位、1px 边框）
            selectorBlackList: ['.no-rem'],
            // 不处理第三方包
            exclude: /node_modules/,
        },
    },
};