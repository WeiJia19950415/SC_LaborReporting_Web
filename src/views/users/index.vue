<template>
  <div class="user-management-container">
    <el-card shadow="never">
      <el-form :inline="true" :model="queryParams" class="search-form" style="margin-bottom: 10px;">
        <el-form-item label="模糊查询">
          <el-input
            v-model="queryParams.filter"
            placeholder="支持工号、姓名、电话"
            clearable
            @clear="handleQuery"
            @keyup.enter="handleQuery"
            style="width: 220px;"
          />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-tree-select
            v-model="queryParams.departmentId"
            :data="deptOptions"
            :props="{ label: 'displayName', children: 'children', value: 'id' }"
            check-strictly
            placeholder="请选择部门筛选"
            clearable
            style="width: 200px;"
            @change="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="header-actions" style="margin-bottom: 20px;">
        <el-button type="primary" icon="Plus" @click="handleCreate">新增用户</el-button>
      </div>

      <el-table :data="tableData" border v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="userName" label="用户名(工号)" min-width="130" />
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column prop="phoneNumber" label="电话" min-width="130" />
        <el-table-column prop="departmentName" label="所属部门" min-width="150">
          <template #default="{ row }">
            <el-tag v-if="row.departmentName">{{ row.departmentName }}</el-tag>
            <span v-else style="color:#999;">暂无部门</span>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleEdit(row)">修改</el-button>
            <el-button link type="warning" icon="RefreshLeft" @click="handleResetPwd(row)">重置密码</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" style="margin-top: 20px; text-align: right;">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[15,50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog :title="dialog.title" v-model="dialog.visible" width="550px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        
        <!-- 将工号提至前面，因为用户名依赖于它 -->
        <el-form-item label="工号" prop="jobNumber">
          <el-input 
            v-model="form.jobNumber" 
            placeholder="请输入工号" 
            :disabled="isEdit" 
            @input="handleJobNumberInput"
          />
        </el-form-item>
        
        <el-form-item label="用户名" prop="userName">
          <!-- 用户名始终不可编辑，它与工号同步 -->
          <el-input 
            v-model="form.userName" 
            placeholder="与工号自动同步" 
            disabled 
          />
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" :disabled="isEdit" />
        </el-form-item>

        <el-form-item label="电话" prop="phoneNumber">
          <el-input 
            v-model="form.phoneNumber" 
            placeholder="请输入手机号" 
            :disabled="isEdit" 
          />
        </el-form-item>

        <el-form-item v-if="!isEdit" label="初始密码" prop="password">
          <el-input v-model="form.password" type="password" disabled />
        </el-form-item>

        <!-- 以下字段在新增和编辑状态下均可操作 -->
        <el-form-item label="所属部门" prop="departmentId">
          <el-tree-select
            v-model="form.departmentId"
            :data="deptOptions"
            :props="{ label: 'displayName', children: 'children', value: 'id' }"
            check-strictly
            placeholder="请选择所属部门"
            style="width: 100%;"
            clearable 
          />
        </el-form-item>

        <el-form-item label="角色" prop="roleNames">
          <el-select v-model="form.roleNames" multiple placeholder="请选择角色" style="width: 100%;">
            <el-option v-for="role in roleOptions" :key="role.name" :label="role.name" :value="role.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
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
import { getUserList, createUser, updateUser, deleteUser, getAllRoles, resetPassword } from '../../api/user';
import { getDepartmentList } from '../../api/department'; 

const tableData = ref([]);
const loading = ref(false);
const total = ref(0);

// 默认 15 行，添加模糊查询字段 filter 和部门筛选字段 departmentId
const queryParams = reactive({ 
  page: 1, 
  size: 15,
  filter: '',
  departmentId: null as string | null
});

const deptOptions = ref([]);
const roleOptions = ref([]);
const dialog = reactive({ visible: false, title: '' });
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  id: '',
  userName: '',
  name: '',
  jobNumber: '',
  password: 'SCjg.123000', 
  phoneNumber: '',
  departmentId: null as string | null,
  roleNames: [] as string[],
  isActive: true
});

const isEdit = computed(() => !!form.id);

// 自定义手机号验证规则
const validatePhone = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('电话不能为空'));
  } else if (!/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入正确的11位手机号码'));
  } else {
    callback();
  }
};

const rules = reactive({
  userName: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
  jobNumber: [{ required: true, message: '工号不能为空', trigger: 'blur' }],
  phoneNumber: [{ required: true, validator: validatePhone, trigger: 'blur' }] ,
  departmentId: [{ required: true, message: '请选择所属部门', trigger: 'change' }],
  roleNames: [{ required: true, message: '请选择至少一个角色', trigger: 'change' }]
});

// 处理工号输入，同步到用户名
const handleJobNumberInput = (val: string) => {
  if (!isEdit.value) {
    form.userName = val;
  }
};

// 查询和重置
const handleQuery = () => {
  queryParams.page = 1;
  fetchData();
};

const resetQuery = () => {
  queryParams.filter = '';
  queryParams.departmentId = null;
  handleQuery();
};

const handleSizeChange = (val: number) => {
  queryParams.size = val;
  handleQuery();
};

const translateListToTree = (list: any[]) => {
  const map: Record<string, any> = {};
  const tree: any[] = [];
  list.forEach(item => { map[item.id] = { ...item, children: [] }; });
  list.forEach(item => {
    const obj = map[item.id];
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(obj);
    } else {
      tree.push(obj);
    }
  });
  return tree;
};

const initDictData = async () => {
  try {
    const [deptRes, roleRes] = await Promise.all([
      getDepartmentList(),
      getAllRoles()
    ]);
    const flatDepts = deptRes.items || deptRes;
    deptOptions.value = translateListToTree(flatDepts);
    roleOptions.value = roleRes.items || roleRes;
  } catch (error) {
    console.error('获取字典数据失败', error);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getUserList({
      SkipCount: (queryParams.page - 1) * queryParams.size,
      MaxResultCount: queryParams.size,
      Filter: queryParams.filter || undefined,
      DepartmentId: queryParams.departmentId || undefined
    });
    tableData.value = res.items;
    total.value = res.totalCount;
  } catch (error) {
    ElMessage.error('加载用户列表失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  dialog.title = '新增用户';
  dialog.visible = true;
  form.id = "";
  form.userName = "";
  form.name = "";
  form.phoneNumber = "";
  form.departmentId = null;
  form.jobNumber = "";
  form.roleNames = [];
  form.isActive = true;
};

const handleEdit = (row: any) => {
  dialog.title = '修改用户';
  form.id = row.id;
  form.userName = row.userName;
  form.name = row.name;
  form.phoneNumber = row.phoneNumber;
  form.departmentId = row.departmentId;
  form.jobNumber = row.jobNumber;
  form.roleNames = row.roleNames || [];
  form.isActive = row.isActive;
  dialog.visible = true;
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要将用户【${row.name}】删除吗？`, '安全警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteUser(row.id);
      ElMessage.success('删除成功！');
      fetchData();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  }).catch(() => {});
};

const handleResetPwd = (row: any) => {
  ElMessageBox.confirm(`确定要将用户【${row.name}】的密码重置为初始密码吗？`, '安全警告', {
    confirmButtonText: '确定重置',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await resetPassword(row.id);
      ElMessage.success('密码已成功重置！');
    } catch (error) {
      ElMessage.error('密码重置失败');
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
          // 修改时只提交后台允许修改的字段（根据要求仅部门、角色以及状态）
          await updateUser(form.id, {
            isActive: form.isActive,
            departmentId: form.departmentId,
            roleNames: form.roleNames
          });
          ElMessage.success('修改成功');
        } else {
          await createUser(form);
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
  form.id = '';
  form.password = 'SCjg.123000';
  formRef.value?.resetFields();
};

onMounted(() => {
  initDictData();
  fetchData();
});
</script>