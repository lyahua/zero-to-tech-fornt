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
 * 首页 = 系统菜单入口，菜单项由实际注册的路由生成，新增 views 页面后无需改本页
 */
import { useRouter } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';

const TITLES = {
    idc: 'IDC 三维机房总览',
    'idc-floorplan': 'IDC 机房平面视图',
    'idc-map': 'IDC 全国机房地图',
    'idc-deploy': 'IDC 机房平面布置图',
    mbti: 'MBTI · SWOT 可视化',
    test: '表格表单测试',
};

const router = useRouter();
const menus = router
    .getRoutes()
    .filter(r => r.name && r.path !== '/')
    .map(r => ({ path: r.path, title: TITLES[r.name] || String(r.name) }))
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
