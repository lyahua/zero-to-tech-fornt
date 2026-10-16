<template>
    <header class="app-header">
        <h1 class="app-header__title">{{ title }}</h1>
        <slot name="right" />
    </header>
</template>

<script setup>
/**
 * 页面头部
 * 固定高度 + 安全区适配，返回按钮按路由栈自动决定是否展示
 */
import { useRouter } from 'vue-router';

defineProps({
    title: {
        type: String,
        default: '',
    },
});

const router = useRouter();

const goBack = () => {
    // 有历史栈就后退，直接进入首页时回落到首页
    if (window.history.state?.back) {
        router.back();
    } else {
        router.push('/');
    }
};
</script>

<style scoped lang="less">
.app-header {
    position: sticky;
    top: 0;
    z-index: @z-header;
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 @gap-md;
    background: @background-white;
    border-bottom: 1px solid @border-color;

    &__title {
        flex: 1;
        font-size: @font-lg;
        font-weight: 500;
        text-align: center;
    }
}
</style>