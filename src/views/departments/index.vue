<template>
  <div class="department-management">
    <div class="left-pane">
      <el-card class="pane-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="title">组织架构</span>
            <el-button type="primary" size="small" @click="openDialog('addRoot')">
              新增根部门
            </el-button>
          </div>
        </template>

        <el-tree
          :data="deptTreeData"
          :props="treeProps"
          node-key="id"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <div class="custom-tree-node">
              <span class="node-label">
                {{ data.displayName }} 
                <el-tag size="small" :type="data.departmentType === 2 ? 'warning' : ''" style="margin: 0 4px;">
                  {{ data.departmentType === 1 ? '部门' : '小组' }}
                </el-tag>
                <span v-if="data.managerName" style="color: #409EFF; font-size: 12px;">[{{ data.managerName }}]</span>
              </span>
              <span class="node-actions">
                <el-button link type="primary" size="small" @click.stop="openDialog('addChild', data)">添加子级</el-button>
                <el-button link type="warning" size="small" @click.stop="openDialog('edit', data)">修改</el-button>
                <el-button link type="danger" size="small" @click.stop="handleDeleteDept(data)">删除</el-button>
              </span>
            </div>
          </template>
        </el-tree>
      </el-card>
    </div>

    <div class="right-pane">
      <el-card class="pane-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="title">
              {{ currentDeptName ? `【${currentDeptName}】成员列表` : '成员列表 (请选择左侧部门)' }}
            </span>
          </div>
        </template>

        <el-table :data="userList" border style="width: 100%" v-loading="tableLoading">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="userName" label="用户名(手机号)" min-width="150" />
          <el-table-column prop="name" label="姓名" min-width="120" />
          <el-table-column prop="phoneNumber" label="电话" min-width="150" />
        </el-table>
      </el-card>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="50%" @close="closeDialog">
      <el-form :model="formModel" :rules="formRules" ref="formRef" label-width="90px">
        
        <el-form-item label="部门全称">
          <el-input :value="computedFullName" disabled placeholder="自动生成" />
        </el-form-item>

        <el-form-item label="部门名称" prop="displayName">
          <el-input v-model="formModel.displayName" placeholder="只能包含中文、英文、数字" maxLength="50" />
        </el-form-item>

        <el-form-item label="部门类型" prop="departmentType">
          <el-select v-model="formModel.departmentType" style="width: 100%;">
            <el-option label="部门" :value="1" />
            <el-option label="小组" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item label="负责人" prop="managerId">
          <el-select v-model="formModel.managerId" filterable clearable placeholder="请选择或搜索负责人" style="width: 100%;">
            <el-option v-for="user in userListOptions" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>

      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import { 
  getDepartmentList, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  getDepartmentUsers 
} from '../../api/department';
import { getUserList } from '../../api/user'; // 用于获取负责人下拉列表

// ================== 左侧部门树 相关状态 ==================
const treeProps = { children: 'children', label: 'displayName' };
const deptTreeData = ref<any[]>([]);
const userListOptions = ref<any[]>([]); // 负责人下拉框数据

// ================== 右侧成员列表 相关状态 ==================
const currentDeptId = ref<string | null>(null);
const currentDeptName = ref('');
const userList = ref<any[]>([]);
const tableLoading = ref(false);

// ================== 弹窗表单 相关状态 ==================
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

const formModel = reactive({
  id: '',
  parentId: '' as string | undefined,
  parentFullName: '', // 用于前端实时拼接显示
  displayName: '',
  departmentType: 1,
  managerId: null as string | null
});

// ⭐ 部门名称正则验证：只能中文、英文、数字
const validateDeptName = (rule: any, value: string, callback: any) => {
  const reg = /^[a-zA-Z0-9\u4e00-\u9fa5]+$/;
  if (!value) {
    callback(new Error('部门名称不能为空'));
  } else if (!reg.test(value)) {
    callback(new Error('部门名称不允许出现符号，只能包含中文、英文、数字'));
  } else {
    callback();
  }
};

const formRules = reactive({
  displayName: [{ required: true, validator: validateDeptName, trigger: 'blur' }],
  departmentType: [{ required: true, message: '请选择类型', trigger: 'change' }]
});

// ⭐ 动态计算部门全称
const computedFullName = computed(() => {
  if (!formModel.displayName) return formModel.parentFullName || '';
  return formModel.parentFullName 
    ? `${formModel.parentFullName}-${formModel.displayName}` 
    : formModel.displayName;
});

// ================== 核心方法区 ==================

// 1. 初始化数据（加载部门树和用户下拉框）
const initData = async () => {
  try {
    const deptRes = await getDepartmentList();
    deptTreeData.value = translateListToTree(deptRes.items || deptRes);
    
    // 加载用户以供选择负责人（请求最大数以获取全部人员）
    const userRes = await getUserList({ SkipCount: 0, MaxResultCount: 1000 });
    userListOptions.value = userRes.items || userRes;
  } catch (error) {
    ElMessage.error('数据加载失败');
  }
};

// 辅助方法：平铺列表转树结构
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

// 2. 点击左侧树节点，获取右侧人员列表
const handleNodeClick = async (data: any) => {
  currentDeptId.value = data.id;
  currentDeptName.value = data.displayName;
  tableLoading.value = true;
  try {
    const res = await getDepartmentUsers(data.id);
    userList.value = res.items || res;
  } catch (error) {
    ElMessage.error('获取部门人员失败');
  } finally {
    tableLoading.value = false;
  }
};

// 3. 打开弹窗控制（新增根、新增子、修改）
const openDialog = (type: 'addRoot' | 'addChild' | 'edit', data?: any) => {
  dialogVisible.value = true;
  if (type === 'addRoot') {
    dialogTitle.value = '新增根部门';
    formModel.id = '';
    formModel.parentId = undefined;
    formModel.parentFullName = '';
    formModel.displayName = '';
    formModel.departmentType = 1;
    formModel.managerId = null;
  } else if (type === 'addChild') {
    dialogTitle.value = `新增子部门`;
    formModel.id = '';
    formModel.parentId = data.id;
    formModel.parentFullName = data.fullName; // 传入父级的全称用于前端拼接
    formModel.displayName = '';
    formModel.departmentType = 1;
    formModel.managerId = null;
  } else if (type === 'edit') {
    dialogTitle.value = '修改部门';
    formModel.id = data.id;
    formModel.parentId = data.parentId;
    // 截取上级的全称部分 (如果有的话)
    const lastDashIndex = data.fullName.lastIndexOf('-');
    formModel.parentFullName = lastDashIndex > -1 ? data.fullName.substring(0, lastDashIndex) : '';
    formModel.displayName = data.displayName;
    formModel.departmentType = data.departmentType;
    formModel.managerId = data.managerId;
  }
};

// 4. 提交表单 (新增或修改)
const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        const payload = {
          parentId: formModel.parentId,
          displayName: formModel.displayName,
          departmentType: formModel.departmentType,
          managerId: formModel.managerId
        };
        
        if (formModel.id) {
          await updateDepartment(formModel.id, payload);
          ElMessage.success('修改成功');
        } else {
          await createDepartment(payload);
          ElMessage.success('新增成功');
        }
        dialogVisible.value = false;
        initData(); // 重新拉取会自动刷新所有子孙部门的 FullName
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

// 5. 删除部门
const handleDeleteDept = (data: any) => {
  ElMessageBox.confirm(
    `确定要删除部门【${data.displayName}】吗？如果存在子部门将会一并删除。`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await deleteDepartment(data.id);
      ElMessage.success('删除成功');
      
      // 联动清空：如果删除的是当前右侧正在展示的部门
      if (currentDeptId.value === data.id) {
        currentDeptId.value = null;
        currentDeptName.value = '';
        userList.value = [];
      }
      
      initData(); // 刷新树
    } catch (error) {
      console.error(error);
    }
  }).catch(() => {});
};

// 6. 关闭弹窗重置表单
const closeDialog = () => {
  formRef.value?.resetFields();
};

onMounted(() => {
  initData();
});
</script>

<style scoped>
.department-management {
  display: flex;
  gap: 20px;
  padding: 20px;
  height: calc(100vh - 100px); /* 保证容易不溢出，根据实际布局调整 */
  box-sizing: border-box;
}

.left-pane {
  width: 35%;
  flex-shrink: 0;
}

.right-pane {
  flex: 1;
  min-width: 0; /* 防止 el-table 撑破 flex 弹性容器 */
}

.pane-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-card__body) {
  flex: 1;
  overflow-y: auto; 
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .title {
  font-weight: bold;
  font-size: 15px;
  color: #333;
}

/* 树形节点操作栏布局 */
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
  font-size: 14px;
}

.node-actions {
  display: none; /* 默认隐藏操作按钮 */
}

.custom-tree-node:hover .node-actions {
  display: inline-flex; /* 鼠标悬浮才展示按钮，界面更整洁 */
  gap: 4px;
}
</style>