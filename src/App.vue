<template>
    <router-view v-slot="{ Component, route }">
        <!-- 需要缓存的页面走 keep-alive，列表页在 src/plugins/pages.ts 中配置 -->
        <keep-alive v-if="route.meta.keepAlive" :include="route.name">
            <component :is="Component" :key="route.fullPath" />
        </keep-alive>
        <component v-if="!route.meta.keepAlive" :is="Component" :key="route.fullPath" />
    </router-view>
</template>

<script setup>
// 根组件只负责路由出口，业务逻辑放在各自页面中
</script>