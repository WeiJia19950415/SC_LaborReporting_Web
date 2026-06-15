<template>
  <div class="role-management-container">
    <el-card shadow="never">
      <div class="header-actions" style="margin-bottom: 20px;">
        <el-button type="primary" icon="Plus" @click="handleCreate">新增角色</el-button>
      </div>

      <el-table :data="tableData" border v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="角色名称" min-width="150" />
        <el-table-column prop="isDefault" label="默认角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isDefault ? 'success' : 'info'">{{ row.isDefault ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isPublic" label="公开角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isPublic ? 'success' : 'info'">{{ row.isPublic ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="success" icon="Key" @click="handleAuthorize(row)" :disabled="row.name === 'admin'">
              授权
            </el-button>
            <el-button link type="primary" icon="Edit" @click="handleEdit(row)" :disabled="row.isStatic">修改</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(row)" :disabled="row.isStatic">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" style="margin-top: 20px; text-align: right;">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog :title="dialog.title" v-model="dialog.visible" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="默认角色" prop="isDefault">
          <el-switch v-model="form.isDefault" active-text="是" inactive-text="否" />
        </el-form-item>
        <el-form-item label="公开角色" prop="isPublic">
          <el-switch v-model="form.isPublic" active-text="是" inactive-text="否" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialog.visible = false">取 消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">确 定</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer
      v-model="permDialog.visible"
      :title="`为【${permDialog.roleName}】分配权限`"
      size="450px"
    >
      <div v-loading="permLoading" style="height: 100%; display: flex; flex-direction: column;">
        <div style="flex: 1; overflow-y: auto;">
          <el-tree
            ref="treeRef"
            :data="permTreeData"
            show-checkbox
            node-key="id"
            :default-checked-keys="defaultCheckedKeys"
            default-expand-all
            :props="{ label: 'label', children: 'children' }"
          />
        </div>
        <div style="margin-top: 20px; text-align: right;">
          <el-button @click="permDialog.visible = false">取 消</el-button>
          <el-button type="primary" @click="submitPermissions" :loading="permSubmitLoading">保存权限</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, FormInstance, ElTree } from 'element-plus';
import { 
  getRoleList, createRole, updateRole, deleteRole, 
  getRolePermissions, updateRolePermissions 
} from '../../api/role';

// ================== 角色 CRUD 相关状态 ==================
const tableData = ref([]);
const loading = ref(false);
const total = ref(0);
const queryParams = reactive({ page: 1, size: 10 });

const dialog = reactive({ visible: false, title: '' });
const submitLoading = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({ id: '', name: '', isDefault: false, isPublic: true });
const rules = reactive({ name: [{ required: true, message: '角色名称不能为空', trigger: 'blur' }] });

// ================== 权限授权 相关状态 ==================
const permDialog = reactive({ visible: false, roleName: '' });
const permLoading = ref(false);
const permSubmitLoading = ref(false);
const treeRef = ref<InstanceType<typeof ElTree>>();
const permTreeData = ref<any[]>([]);
const defaultCheckedKeys = ref<string[]>([]);
const allPermissionNames = ref<string[]>([]); // 缓存所有原始权限名称用于提交

// 获取角色列表
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getRoleList({
      SkipCount: (queryParams.page - 1) * queryParams.size,
      MaxResultCount: queryParams.size
    });
    tableData.value = res.items;
    total.value = res.totalCount;
  } catch (error) {
    ElMessage.error('加载角色列表失败');
  } finally {
    loading.value = false;
  }
};

// ================== CRUD 方法 ==================
const handleCreate = () => {
  dialog.title = '新增角色';
  dialog.visible = true;
};

const handleEdit = (row: any) => {
  dialog.title = '修改角色';
  form.id = row.id;
  form.name = row.name;
  form.isDefault = row.isDefault;
  form.isPublic = row.isPublic;
  dialog.visible = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (form.id) {
          await updateRole(form.id, { name: form.name, isDefault: form.isDefault, isPublic: form.isPublic });
          ElMessage.success('修改成功');
        } else {
          await createRole({ name: form.name, isDefault: form.isDefault, isPublic: form.isPublic });
          ElMessage.success('新增成功');
        }
        dialog.visible = false;
        fetchData();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除角色【${row.name}】吗？`, '警告', { type: 'warning' }).then(async () => {
    await deleteRole(row.id);
    ElMessage.success('删除成功');
    fetchData();
  }).catch(() => {});
};

const resetForm = () => {
  form.id = '';
  formRef.value?.resetFields();
};

// ================== 核心：授权与权限树解析逻辑 ==================

// 点击“授权”按钮
const handleAuthorize = async (row: any) => {
  permDialog.roleName = row.name; // 注意：ABP获取权限传的是 roleName（如 admin）而不是 id
  permDialog.visible = true;
  permLoading.value = true;
  try {
    const res = await getRolePermissions(row.name);
    parsePermissionTree(res.groups);
  } catch (error) {
    ElMessage.error('获取权限数据失败');
  } finally {
    permLoading.value = false;
  }
};

// 解析 ABP 返回的 Group/Permissions 数据结构为 Element Tree 需要的嵌套格式
const parsePermissionTree = (groups: any[]) => {
  const tree: any[] = [];
  const leafKeys: string[] = []; // 只收集叶子节点的选中状态，防止 Element UI 树形组件误触父节点级联全选
  const allNames: string[] = []; 

  groups.forEach(group => {
    // 构造根节点（组）
    const rootNode = { id: group.name, label: group.displayName, children: [] as any[] };
    const permMap: Record<string, any> = {};

    group.permissions.forEach((p: any) => {
      allNames.push(p.name);
      permMap[p.name] = { id: p.name, label: p.displayName, children: [] };
    });

    group.permissions.forEach((p: any) => {
      // 1. 组装树结构
      if (p.parentName && permMap[p.parentName]) {
        permMap[p.parentName].children.push(permMap[p.name]);
      } else {
        rootNode.children.push(permMap[p.name]);
      }

      // 2. 判断是否是叶子节点 (没有其他权限以它为 parentName)
      const isLeaf = !group.permissions.some((child: any) => child.parentName === p.name);
      
      // 3. 收集默认选中的叶子节点
      if (p.isGranted && isLeaf) {
        leafKeys.push(p.name);
      }
    });

    tree.push(rootNode);
  });

  permTreeData.value = tree;
  defaultCheckedKeys.value = leafKeys;
  allPermissionNames.value = allNames;
};

// 提交保存权限
const submitPermissions = async () => {
  if (!treeRef.value) return;
  permSubmitLoading.value = true;
  
  try {
    // 获取树组件中所有勾选的节点（包括半选的父节点）
    const checkedKeys = [
      ...treeRef.value.getCheckedKeys(),
      ...treeRef.value.getHalfCheckedKeys()
    ];

    // ABP API 要求：传入所有的权限名，布尔值代表是否授权
    const permissionsPayload = allPermissionNames.value.map(name => ({
      name: name,
      isGranted: checkedKeys.includes(name)
    }));

    await updateRolePermissions(permDialog.roleName, { permissions: permissionsPayload });
    
    ElMessage.success('权限保存成功');
    permDialog.visible = false;
  } catch (error) {
    ElMessage.error('权限保存失败');
  } finally {
    permSubmitLoading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.role-management-container {
  padding: 20px;
}
</style>