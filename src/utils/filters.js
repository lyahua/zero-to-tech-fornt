/**
 * 格式化函数
 *
 * 具名导出由 unplugin-auto-import 自动注入，业务代码无需 import。
 */
import dayjs from 'dayjs';

/**
 * 日期时间
 */
export function formatDateTime(value, pattern = 'YYYY-MM-DD HH:mm:ss') {
    return dayjs(value).format(pattern);
}

/**
 * 日期
 */
export function formatDate(value) {
    return dayjs(value).format('YYYY-MM-DD');
}

/**
 * 时间
 */
export function formatTime(value) {
    return dayjs(value).format('HH:mm:ss');
}

/**
 * 数字千分位
 */
export function formatNumber(value, digits = 0) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return Number(value)
        .toFixed(digits)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 文件大小
 */
export function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}