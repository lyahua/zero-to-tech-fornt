<template>
    <div class="test-page">
        <el-form :model="form">
            <el-table :data="form.list" border>
                <el-table-column prop="name" label="姓名" width="140" />
                <el-table-column label="关键词" min-width="240">
                    <template #default="{ row, $index }">
                        <el-form-item
                            :prop="`list.${$index}.keyword`"
                            :rules="[{ required: true, message: '请输入内容', trigger: 'blur' }]"
                        >
                            <el-input v-model="row.keyword" placeholder="请输入内容" clearable />
                        </el-form-item>
                    </template>
                </el-table-column>
                <el-table-column prop="remark" label="备注" min-width="160" />
            </el-table>
        </el-form>
    </div>
</template>

<script setup>
import { reactive } from 'vue';

const form = reactive({
    list: [
        { name: '张三', keyword: 'vue3', remark: '第一条' },
        { name: '李四', keyword: '', remark: '第二条' },
    ],
});
</script>

<style scoped>
/* 表格单元格内的表单项自带下边距，会把行高撑开，这里归零 */
.test-page :deep(.el-table .el-form-item) {
    margin-bottom: 0;
}
</style>
