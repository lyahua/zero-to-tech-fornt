/**
 * PostCSS 配置
 *
 * 链路：tailwind → autoprefixer
 *
 * 本项目只做 PC 端，尺寸一律按 px 书写，不做 rem 换算。
 */
module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};
