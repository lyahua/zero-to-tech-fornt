<template>
    <div class="home">
        <AppHeader title="功能菜单" />

        <main class="home__body">
            <router-link v-for="item in menus" :key="item.path" :to="item.path" class="home__item">
                <span class="home__name">{{ item.title }}</span>
                <span class="home__path">{{ item.path }}</span>
            </router-link>
        </main>
    </div>
</template>

<script setup>
/**
 * 首页 = 系统菜单入口，菜单项由实际注册的路由生成，新增页面只需在路由表写一次 meta.title
 */
import { useRouter } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';

/** 暂不对外提供的入口，只移出菜单，路由本身保留（仍可用 URL 直达） */
const HIDDEN = ['idc', 'mbti', 'test'];

const router = useRouter();
const menus = router
    .getRoutes()
    .filter(r => r.name && r.path !== '/' && !HIDDEN.includes(String(r.name)))
    .map(r => ({ path: r.path, title: r.meta.title || String(r.name) }))
    .sort((a, b) => a.path.localeCompare(b.path));
</script>

<style scoped lang="less">
.home {
    min-height: 100vh;
    background: @background;

    &__body {
        padding: @gap-md;
    }

    &__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: @gap-lg @gap-md;
        margin-bottom: @gap-md;
        background: @background-white;
        border-radius: @radius-md;
        color: @text-primary;
        text-decoration: none;
    }

    &__name {
        font-size: @font-md;
    }

    &__path {
        font-size: @font-sm;
        color: @text-secondary;
    }
}
</style>
