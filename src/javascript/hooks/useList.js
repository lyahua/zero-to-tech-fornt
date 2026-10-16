/**
 * 组合式函数
 *
 * 注意：约定式自动导入只识别**具名导出**，
 * 下面的 default 导出需要手动 import，如：
 * import useList from '@/javascript/hooks/useList'
 */
import { ref, onMounted } from 'vue';

/**
 * 列表加载范式：分页 + 加载态 + 空态
 *
 * @param {Function} fetcher 数据源函数，接收分页参数，返回 { list, total }
 */
export default function useList(fetcher, pageSize = 20) {
    const list = ref([]);
    const total = ref(0);
    const page = ref(1);
    const loading = ref(false);
    const finished = ref(false);

    const load = async (isReset = false) => {
        if (loading.value) return;
        if (isReset) {
            page.value = 1;
            finished.value = false;
        }
        if (finished.value) return;

        loading.value = true;
        try {
            const res = await fetcher({ page: page.value, pageSize });
            const rows = res?.list ?? [];
            list.value = isReset ? rows : [...list.value, ...rows];
            total.value = res?.total ?? list.value.length;
            finished.value = list.value.length >= total.value;
            page.value += 1;
        } finally {
            loading.value = false;
        }
    };

    const refresh = () => load(true);

    onMounted(() => refresh());

    return { list, total, loading, finished, refresh, load };
}