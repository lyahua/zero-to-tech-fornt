<template>
    <header class="app-header">
        <h1 class="app-header__title">{{ title }}</h1>
        <slot name="right" />
    </header>
</template>

<script setup>
/**
 * 页面头部
 * 固定高度 + 标题居中，右侧内容通过 right 插槽传入
 */
defineProps({
    title: {
        type: String,
        default: '',
    },
});
</script>

<style scoped lang="less">
.app-header {
    position: sticky;
    top: 0;
    z-index: @z-header;
    display: flex;
    align-items: center;
    height: 56px;
    padding: 0 @gap-lg;
    background: @background-white;
    border-bottom: 1px solid @border-color;

    &__title {
        flex: 1;
        font-size: @font-lg;
        font-weight: 500;
    }
}
</style>