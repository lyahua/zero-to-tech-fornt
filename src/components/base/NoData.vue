<template>
    <div class="no-data">
        <div class="no-data__text">{{ text }}</div>
        <slot />
    </div>
</template>

<script setup>
/**
 * 空状态占位
 */
defineProps({
    text: {
        type: String,
        default: '暂无数据',
    },
});
</script>

<style scoped lang="less">
.no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: @gap-xl * 2 @gap-lg;
    color: @text-placeholder;
    font-size: @font-md;

    &__text {
        margin-bottom: @gap-md;
    }
}
</style>