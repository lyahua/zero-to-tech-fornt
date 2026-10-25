<template>
    <IdcOverview :page="page" />
</template>

<script setup>
/**
 * IDC 机房总览页（路由：#/idc）
 *
 * 页签切换走查询参数，避免在宿主里再造一套导航：#/idc?page=monitor
 * 全部页签：overview | monitor | assets | energy | alarms | workorder | donghuan
 * 降配画质：把 quality=low 写在 # 之前 —— /?quality=low#/idc
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import IdcOverview from './components/IdcOverview.vue';

const route = useRoute();
const PAGES = ['overview', 'monitor', 'assets', 'energy', 'alarms', 'workorder', 'donghuan'];
const page = computed(() => {
    const q = String(route.query.page || 'overview');
    return PAGES.includes(q) ? q : 'overview';
});
</script>
