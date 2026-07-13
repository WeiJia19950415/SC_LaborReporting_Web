<template>
  <div class="product-series-container">
    <el-card shadow="never">
      <div class="header-actions" style="margin-bottom: 20px;">
        <el-button type="primary" icon="Plus" @click="handleCreate">新增产品系列</el-button>
      </div>

      <el-table :data="tableData" border v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="序号" width="80" align="center" />
        <el-table-column prop="code" label="系列编码" min-width="150" />
        <el-table-column prop="name" label="系列名称" min-width="200" />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleEdit(row)">修改</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" style="margin-top: 20px; text-align: right;">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog
      :title="dialog.title"
      v-model="dialog.visible"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="系列编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入系列编码" />
        </el-form-item>
        <el-form-item label="系列名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入系列名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialog.visible = false">取 消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">确 定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import { 
  getProductSeriesList, 
  createProductSeries, 
  updateProductSeries, 
  deleteProductSeries 
} from '../../api/productSeries';

const tableData = ref([]);
const loading = ref(false);
const total = ref(0);
const queryParams = reactive({ page: 1, size: 20 });

// 表单及弹窗状态
const dialog = reactive({ visible: false, title: '' });
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  id: '',
  code: '',
  name: ''
});

const isEdit = computed(() => !!form.id);

const rules = reactive({
  code: [{ required: true, message: '系列编码不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '系列名称不能为空', trigger: 'blur' }]
});

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getProductSeriesList({
      SkipCount: (queryParams.page - 1) * queryParams.size,
      MaxResultCount: queryParams.size
    });
    tableData.value = res.items;
    total.value = res.totalCount;
  } catch (error) {
    ElMessage.error('加载产品系列失败');
  } finally {
    loading.value = false;
  }
};

const handleSizeChange = (val: number) => {
  queryParams.size = val;
  fetchData();
};

const handleCreate = () => {
  dialog.title = '新增产品系列';
  dialog.visible = true;
  form.id = '';
  form.code = '';
  form.name = '';
};

const handleEdit = (row: any) => {
  dialog.title = '修改产品系列';
  form.id = row.id;
  form.code = row.code;
  form.name = row.name;
  dialog.visible = true;
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除产品系列【${row.name}】吗？`, '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteProductSeries(row.id);
      ElMessage.success('删除成功！');
      fetchData();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  }).catch(() => {});
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (isEdit.value) {
          await updateProductSeries(form.id, { code: form.code, name: form.name });
          ElMessage.success('修改成功');
        } else {
          await createProductSeries({ code: form.code, name: form.name });
          ElMessage.success('新增成功');
        }
        dialog.visible = false;
        fetchData();
      } catch (error) {
        console.error(error);
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const resetForm = () => {
  formRef.value?.resetFields();
};

onMounted(() => {
  fetchData();
});
</script>