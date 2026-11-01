<template>
    <div class="test-page">
        <el-form ref="formRef" :model="form">
            <el-table :data="pageList" border>
                <el-table-column prop="name" label="姓名" width="140" />
                <el-table-column label="关键词" min-width="240">
                    <template #default="{ row, $index }">
                        <el-form-item
                            :prop="propOf(indexOf($index))"
                            :rules="keywordRules"
                        >
                            <el-input v-model="row.keyword" placeholder="请输入内容" clearable />
                        </el-form-item>
                    </template>
                </el-table-column>
                <el-table-column prop="remark" label="备注" min-width="160" />
            </el-table>

            <el-pagination
                v-model:current-page="page"
                v-model:page-size="pageSize"
                class="test-page__pager"
                layout="total, sizes, prev, pager, next"
                :page-sizes="[5, 10, 20]"
                :total="form.list.length"
                @current-change="clearErrors"
                @size-change="clearErrors"
            />
        </el-form>

        <div class="test-page__actions">
            <el-button type="primary" :loading="checking" @click="submit">
                {{ checking ? '校验中' : '提交校验' }}
            </el-button>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * 分页表格校验的两个坑：
 * 1. el-table 的 $index 是「当前页内」下标，直接拼进 prop 会让第 2 页起的路径指回第 1 页的数据，
 *    于是第 1 页填过的行永远校验通过，后面几页等于没挂校验 → 必须换算成全量数组里的全局下标。
 * 2. el-form.validate() 只遍历已挂载的 form-item，未渲染的页根本没注册字段。
 *    换个角度看这正是「天然按页校验」：逐页翻页 + 每页 validate()，
 *    失败就停在当前页，红字由 el-form 自己点亮，无需再拿字段路径去筛数据。
 */

/** 校验口径的唯一来源：el-form-item 的 rules 与自动翻页校验共用它 */
function isBlank(value) {
    return !String(value ?? '').trim();
}

const keywordRules = [
    {
        required: true,
        trigger: 'blur',
        validator: (_rule, value, callback) => {
            if (isBlank(value)) callback(new Error('请输入内容'));
            else callback();
        },
    },
];

const form = reactive({
    list: Array.from({ length: 13 }, (_, i) => ({
        name: `第 ${i + 1} 行`,
        keyword: i === 1 || i === 6 || i === 12 ? '' : `vue3-${i + 1}`,
        remark: `第 ${i + 1} 条`,
    })),
});

const formRef = ref();
const page = ref(1);
const pageSize = ref(5);

const pageStart = computed(() => (page.value - 1) * pageSize.value);

const pageList = computed(() =>
    form.list.slice(pageStart.value, pageStart.value + pageSize.value)
);

/** 页内下标 → 全量数组下标 */
function indexOf(index) {
    return pageStart.value + index;
}

function propOf(globalIndex) {
    return `list.${globalIndex}.keyword`;
}

/** 自动翻页校验进行中：期间禁止手动翻页清错误、禁止重复提交 */
const checking = ref(false);

/** 翻页后旧的 form-item 已卸载，错误态跟着销毁；这里只是把残留的校验状态清掉 */
function clearErrors() {
    // clearValidate 会把手上刚点亮的那页红字抹掉，自动校验期间跳过
    if (checking.value) return;
    nextTick(() => formRef.value?.clearValidate());
}

/**
 * 自动翻页校验：逐页翻 → 只校验当前页已挂载的字段 → 失败即停在该页。
 * 依赖 el-form 自身「只认已注册字段」的行为，因此不需要维护字段路径去反查数据。
 */
async function submit() {
    if (checking.value) return;

    checking.value = true;
    const totalPage = Math.ceil(form.list.length / pageSize.value);

    try {
        for (let p = 1; p <= totalPage; p++) {
            page.value = p;
            // 等表格按新页重新渲染、form-item 完成注册，再交给 el-form 校验
            await nextTick();

            const passed = await formRef.value?.validate().catch(() => false);
            if (!passed) {
                ElMessage.warning(`第 ${p} 页有未填写的内容，已停在第 ${p} 页`);
                return;
            }
        }
        ElMessage.success('校验通过');
    } finally {
        checking.value = false;
    }
}
</script>

<style scoped>
/* 表格单元格内的表单项自带下边距，会把行高撑开，这里归零 */
.test-page :deep(.el-table .el-form-item) {
    margin-bottom: 0;
}

.test-page__pager {
    margin-top: 12px;
    justify-content: flex-end;
}

.test-page__actions {
    margin-top: 16px;
}
</style>
