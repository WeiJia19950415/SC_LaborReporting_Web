<template>
  <div class="app-container">
    <el-card shadow="never">
      <div class="filter-container" style="margin-bottom: 20px;">
        <el-button type="primary" icon="Plus" @click="handleAdd">新增项目角色</el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" border style="width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="角色名称" min-width="150" />
        <el-table-column prop="code" label="角色编码" min-width="150">
          <template #default="{ row }">
            <el-tag type="info">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="角色描述" min-width="200" show-overflow-tooltip />
        
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 20px; justify-content: flex-end;"
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.size"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px" @close="closeDialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：开发工程师、项目经理" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="form.code" placeholder="例如：DEV、PM (建议全英文)" />
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入对该项目角色的描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import { getProjectRoles, createProjectRole, updateProjectRole, deleteProjectRole } from '../../api/projectRole';

// 列表数据
const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);

const queryParams = reactive({
  page: 1,
  size: 10
});

// 弹窗表单数据
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  id: '',
  name: '',
  code: '',
  description: ''
});

const rules = reactive({
  name: [{ required: true, message: '角色名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '角色编码不能为空', trigger: 'blur' }]
});

const fetchData = async () => {
  loading.value = true;
  try {
    const skip = (queryParams.page - 1) * queryParams.size;
    const res = await getProjectRoles({ skipCount: skip, maxResultCount: queryParams.size });
    tableData.value = res.items || [];
    total.value = res.totalCount || 0;
  } catch (error) {
    ElMessage.error('获取项目角色列表失败');
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  dialogTitle.value = '新增项目角色';
  Object.assign(form, { id: '', name: '', code: '', description: '' });
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑项目角色';
  Object.assign(form, { id: row.id, name: row.name, code: row.code, description: row.description });
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        const payload = {
          name: form.name,
          code: form.code,
          description: form.description
        };
        
        if (form.id) {
          await updateProjectRole(form.id, payload);
          ElMessage.success('更新成功');
        } else {
          await createProjectRole(payload);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        fetchData();
      } catch (error) {
        console.error('提交失败', error);
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除项目角色【${row.name}】吗?`, '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteProjectRole(row.id);
    ElMessage.success('删除成功');
    fetchData();
  }).catch(() => {});
};

const closeDialog = () => formRef.value?.resetFields();

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}
</style>