/**
 * @fileoverview 请求层
 * @description axios 独立实例 + 拦截器
 *
 * 注意：这里用 axios.create() 建独立实例，**没有覆盖全局 axios.get**。
 * 原项目把 axios.get 重定义为 (url, params) 的包装函数，破坏了 axios 原生签名
 * get(url, config)，是一处隐蔽的坑，迁移时已修正。
 */
import axios from 'axios';
import { showToast } from 'vant';

const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || '/api',
    timeout: 15000,
    withCredentials: true,
});

/**
 * 请求拦截器
 * 需要携带 token 时在此统一注入，不要在各业务接口里重复写
 */
request.interceptors.request.use(
    config => {
        // 示例：从 store 读登录态（按项目实际认证方式调整）
        // const token = localStorage.getItem('token');
        // if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    error => Promise.reject(error)
);

/**
 * 业务错误码白名单：这些码会展示后端返回的具体提示
 * 不在白名单内的统一走「系统繁忙」，避免把内部错误信息暴露给用户
 */
const CODE_WHITE_LIST = ['4001', '4003', '1001'];

/**
 * 响应拦截器
 */
request.interceptors.response.use(
    response => {
        const res = response.data;

        // 二进制流（文件下载）直接返回，不做业务码处理
        if (response.config.responseType === 'blob') return res;

        // 后端未约定统一结构时，直接返回原始数据
        if (res.code === undefined) return res;

        if (res.code === 200 || res.success === true) return res.data ?? res;

        if (CODE_WHITE_LIST.includes(String(res.code))) {
            showToast(res.message || '请求失败');
        } else {
            showToast('系统繁忙，请稍后重试');
        }

        return Promise.reject(new Error(res.message || 'Request Error'));
    },
    error => {
        /**
         * 兜底分支不能省。
         * 网络中断时 error.response 是 undefined，直接访问 error.response.data
         * 会抛二次异常，把真实错误掩盖掉。
         */
        let message = '网络异常，请稍后重试';

        if (error.response) {
            const { status } = error.response;
            const statusMessageMap = {
                400: '请求参数错误',
                401: '登录已过期，请重新登录',
                403: '没有访问权限',
                404: '请求的资源不存在',
                500: '服务器内部错误',
                502: '网关错误',
                503: '服务不可用',
                504: '网关超时',
            };
            message = statusMessageMap[status] || `请求失败（${status}）`;

            // 401 跳登录。需要时启用
            // if (status === 401) router.push({ path: '/login' });
        } else if (error.code === 'ECONNABORTED') {
            message = '请求超时，请检查网络';
        }

        showToast(message);
        return Promise.reject(error);
    }
);

/**
 * 方法糖
 * 传参与 axios 原生一致，不需要在调用处区分 params / data
 */
export const get = (url, params, config) => request({ ...config, url, method: 'get', params });
export const post = (url, data, config) => request({ ...config, url, method: 'post', data });

export const postJson = (url, data, config) =>
    request({ ...config, url, method: 'post', data, headers: { 'Content-Type': 'application/json' } });

export const postForm = (url, data, config) =>
    request({
        ...config,
        url,
        method: 'post',
        data,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

export const postFile = (url, formData, config) =>
    request({ ...config, url, method: 'post', data: formData });

export default request;