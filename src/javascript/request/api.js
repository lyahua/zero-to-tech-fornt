/**
 * @fileoverview 接口定义
 * @description 只管 URL，调用逻辑留给业务组件
 *
 * 好处：换域名时只改这一处；接口清单可被文档工具自动提取。
 */
import { get, postJson } from './index';

export const userApi = {
    // 示例：获取当前用户信息
    getInfo: () => get('/user/info'),
    // 示例：登录
    login: data => postJson('/user/login', data),
};