<template>
    <div class="home safe-area-top">
        <AppHeader title="首页" />

        <main class="home__body">
            <van-button type="primary">主要按钮</van-button>
            <van-cell-group inset>
                <van-cell title="Vite" :value="version" />
                <van-cell title="按需引入" value="van-* 直接写，无需 import" />
                <van-cell title="文件式路由" value="views 目录即路由表" />
            </van-cell-group>

            <div class="home__actions">
                <van-button type="primary" block @click="handleClick">测试 Toast</van-button>
            </div>

            <NoData v-if="!list.length" text="暂无数据" />
        </main>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { showToast } from 'vant';
import AppHeader from '@/components/layout/AppHeader.vue';
import NoData from '@/components/base/NoData.vue';

const version = __VITE_VERSION__;
const list = ref([]);

const handleClick = () => {
    console.log('---sfd-');
    showToast('请求层 / 组件库 / 样式链路均已就绪');
};
</script>

<style scoped lang="less">
.home {
    min-height: 100vh;
    background: @background;

    &__body {
        padding: @gap-lg 0;
    }

    &__actions {
        padding: @gap-lg;
    }
}
</style>
