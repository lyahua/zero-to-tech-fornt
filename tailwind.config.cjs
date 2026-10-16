/**
 * Tailwind 配置
 *
 * 原项目的 tailwind.config.cjs 有 986 行，绝大部分是 Tailwind 默认值的逐字复述，
 * 维护成本高。模板只保留语义化设计令牌，改主题只动这一个文件。
 */
module.exports = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue,css,less,html}'],
    // 关闭 preflight，避免与项目自研 reset 冲突
    corePlugins: {
        preflight: false,
    },
    theme: {
        extend: {
            colors: {
                primary: '#1989fa',
                success: '#07c160',
                warning: '#ff976a',
                danger: '#ee0a24',
                info: '#969799',
                'text-primary': '#323233',
                'text-regular': '#646566',
                'text-secondary': '#969799',
                'text-placeholder': '#c8c9cc',
                background: '#f7f8fa',
                border: '#ebedf0',
            },
            borderRadius: {
                sm: '4px',
                DEFAULT: '8px',
                lg: '12px',
            },
        },
    },
    plugins: [],
};