/**
 * @fileoverview 状态管理
 * @description Pinia 实例与 store
 *
 * 按领域拆分，不做「一个 store 装所有」。
 * 原项目的 useStore 把用户、表格配置、菜单、主题全塞在一起，
 * Pinia 的 state 是响应式的，任意字段变更都会让依赖该 store 的组件全部更新。
 */
import { defineStore } from 'pinia';
import { createPinia } from 'pinia';

/**
 * 用户与登录态
 */
export const useUserStore = defineStore('user', {
    state: () => ({
        token: '',
        profile: {},
        roles: [],
    }),
    getters: {
        isLogin: state => Boolean(state.token),
        hasRole: state => role => state.roles.includes(role),
    },
    actions: {
        setToken(token) {
            this.token = token;
        },
        setProfile(profile) {
            this.profile = profile;
        },
        logout() {
            this.token = '';
            this.profile = {};
            this.roles = [];
        },
    },
    // 需要持久化的字段用 pick 白名单，避免整包存储
    persist: {
        pick: ['token', 'profile'],
    },
});

/**
 * 应用级状态：主题、标题、全局 loading
 */
export const useAppStore = defineStore('app', {
    state: () => ({
        title: import.meta.env.VITE_APP_TITLE || '',
        theme: 'light',
        globalLoading: false,
    }),
    actions: {
        setTitle(title) {
            this.title = title;
            document.title = title;
        },
        setTheme(theme) {
            this.theme = theme;
            document.documentElement.classList.toggle('dark', theme === 'dark');
        },
    },
    persist: {
        pick: ['theme'],
    },
});

const pinia = createPinia();

export default pinia;
export { pinia };