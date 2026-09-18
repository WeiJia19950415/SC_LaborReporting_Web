<template>
  <div class="app-container">
    <el-card shadow="never">
      <div class="header-actions" style="margin-bottom: 20px;">
        <el-button type="primary" icon="Plus" @click="openDialog('addRoot')">新增顶级分类</el-button>
        <el-button type="success" icon="Upload" @click="triggerImport" :loading="importLoading">导入Excel</el-button>
        <input type="file" ref="fileInput" accept=".xlsx, .xls, .csv" style="display: none" @change="handleFileUpload" />
      </div>

      <el-table
        :data="treeData"
        row-key="id"
        border
        default-expand-all
        v-loading="loading"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column label="工时类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.laborType === 1 ? 'primary' : 'success'">
              {{ row.laborType === 1 ? '研发' : '生产' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="工时类别" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.laborClass === 1 ? 'warning' : 'info'">
              {{ row.laborClass === 1 ? '项目' : '其他' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column 
          v-for="level in maxDepth" 
          :key="level" 
          :label="level === 1 ? '1级分类' : level === 2 ? '2级分类' : `${level}级分类`" 
          min-width="120"
        >
          <template #default="{ row }">
            <span v-if="row.level === level" style="font-weight: bold;">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="code" label="排序号" width="90" align="center" />

        <!-- 【新增】映射关系列 -->
        <el-table-column label="映射关系" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.mappingType" type="info" effect="plain">
              {{ getMappingTypeText(row.mappingType) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="适用部门(全称)" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.departmentFullNames?.join('，') || '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="适用项目角色" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getProjectRoleNames(row.projectRoleIds) }}
          </template>
        </el-table-column>

        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog('addChild', row)">添加下级</el-button>
            <el-button link type="warning" size="small" @click="openDialog('edit', row)">修改</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="650px" @close="closeDialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        
        <el-form-item label="上级分类" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="categoryOptions"
            :props="{ label: 'name', children: 'children', value: 'id', disabled: 'disabled' }"
            check-strictly
            clearable
            placeholder="请选择上级分类（留空则为顶级分类）"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        
        <el-form-item label="工时类型" prop="laborType">
          <el-radio-group v-model="form.laborType">
            <el-radio :label="1">研发工时</el-radio>
            <el-radio :label="2">生产工时</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="工时类别" prop="laborClass">
          <el-radio-group v-model="form.laborClass">
            <el-radio :label="1">项目工时</el-radio>
            <el-radio :label="2">其他工时</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 【新增】映射关系（因为选项较多，换行显示或者使用select皆可，这里使用radio配合 flex 布局） -->
        <el-form-item label="映射关系" prop="mappingType">
          <el-radio-group v-model="form.mappingType">
            <el-radio 
              v-for="item in mappingTypeOptions" 
              :key="item.value" 
              :label="item.value"
              style="margin-right: 15px;"
            >
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="适用部门" prop="departmentIds">
          <el-tree-select
            v-model="form.departmentIds"
            :data="deptOptions"
            node-key="id"
            :props="{ label: 'displayName', children: 'children', value: 'id' }"
            multiple
            show-checkbox
            collapse-tags
            collapse-tags-tooltip
            check-strictly
            placeholder="请选择适用部门 (可多选)"
            style="width: 100%;"
            clearable
          />
        </el-form-item>

        <el-form-item label="适用项目角色" prop="projectRoleIds">
          <el-select v-model="form.projectRoleIds" multiple clearable placeholder="请选择适用项目角色" style="width: 100%">
            <el-option
              v-for="role in projectRoleList"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
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
import { getLaborCategoryList, createLaborCategory, updateLaborCategory, deleteLaborCategory, importLaborCategories } from '../../api/laborCategory';
import { getDepartmentList } from '../../api/department'; 
import { getProjectRoles } from '../../api/projectRole';
import * as XLSX from 'xlsx';

const treeData = ref<any[]>([]);
const maxDepth = ref(1);
const loading = ref(false);
const importLoading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

const deptOptions = ref<any[]>([]);
const projectRoleList = ref<any[]>([]); 
const categoryOptions = ref<any[]>([]); 

// 【新增】配置映射关系的字典 (注意 value 全部为 string 以匹配后端的 string 约束)
const mappingTypeOptions = [
  { label: '管理活动', value: 'Management' },
  { label: '研发活动', value: 'RnD' },
  { label: '按照人员部门归属', value: 'ByDepartment' },
  { label: '生产活动', value: 'Production' },
  { label: '销售活动', value: 'Sales' }
];

// 【新增】通过值获取中文描述
const getMappingTypeText = (val: string) => {
  const option = mappingTypeOptions.find(o => o.value === val);
  return option ? option.label : val;
};

// 【新增】导入时：通过中文描述逆向获取传给后端的值
const getMappingTypeValue = (text: string) => {
  if (!text) return '';
  const t = text.trim();
  if (t.includes('管理')) return 'Management';
  if (t.includes('研发')) return 'RnD';
  if (t.includes('部门')) return 'ByDepartment';
  if (t.includes('生产') || t.includes('生成')) return 'Production'; // 兼容错别字
  if (t.includes('销售')) return 'Sales';
  
  // 兜底精确匹配
  const option = mappingTypeOptions.find(o => o.label === t);
  return option ? option.value : '';
};

const triggerImport = () => {
  fileInput.value?.click();
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

      // 映射表头到后端的 DTO 字段
      const importList = jsonData.map(row => ({
        laborType: row['工时类型'] || '',
        laborClass: row['工时类别'] || '',
        // 【新增】支持导入 Excel 中的 "映射关系" 列
        mappingType: getMappingTypeValue(row['映射关系']),
        level1: row['1级分类'] || '',
        level2: row['2级分类'] || '',
        level3: row['3级分类'] || '',
        level4: row['4级分类'] || '',
        departments: row['适用部门'] || '',
        projectRoles: row['适用角色'] || '',
        remark: row['工作详细说明'] || ''
      })).filter(x => x.laborType || x.level1 || x.level2 || x.level3 || x.level4); // 过滤彻底的空行

      if (importList.length === 0) {
        ElMessage.warning('没有读取到有效的数据');
        return;
      }

      importLoading.value = true;
      await importLaborCategories(importList);
      ElMessage.success('导入成功');
      
      fetchData();
    } catch (error) {
      console.error('解析或导入失败', error);
      ElMessage.error('导入失败，请检查文件格式或重试');
    } finally {
      importLoading.value = false;
      if (fileInput.value) fileInput.value.value = ''; 
    }
  };
  reader.readAsArrayBuffer(file);
};

// 【修改】表单结构，加入 mappingType (默认为空字符串)
const form = reactive({
  id: '',
  parentId: null as string | null,
  name: '',
  laborType: 1,
  laborClass: 1,
  mappingType: '', // <=== 新增字段
  departmentIds: [] as string[],
  projectRoleIds: [] as string[], 
  remark: ''
});

// 【修改】加入映射关系的非空校验
const rules = reactive({
  name: [{ required: true, message: '分类名称不能为空', trigger: 'blur' }],
  laborType: [{ required: true, message: '请选择工时类型', trigger: 'change' }],
  laborClass: [{ required: true, message: '请选择工时类别', trigger: 'change' }],
  mappingType: [{ required: true, message: '请选择映射关系', trigger: 'change' }] // <=== 新增校验
});

// 构建树并计算深度
const buildTreeAndCalculateDepth = (list: any[]) => {
  const map: Record<string, any> = {};
  const tree: any[] = [];
  let currentMaxDepth = 1;

  list.forEach(item => { map[item.id] = { ...item, children: [] }; });

  list.forEach(item => {
    const node = map[item.id];
    if (item.parentId && map[item.parentId]) {
      node.level = map[item.parentId].level + 1;
      currentMaxDepth = Math.max(currentMaxDepth, node.level);
      map[item.parentId].children.push(node);
    } else {
      node.level = 1;
      tree.push(node);
    }
  });

  maxDepth.value = currentMaxDepth;
  return tree;
};

const getSafeParentOptions = (tree: any[], currentEditId: string | null) => {
  const cloneTree = JSON.parse(JSON.stringify(tree)); 
  
  const disableNodes = (nodes: any[], shouldDisable: boolean) => {
    nodes.forEach(node => {
      const disableSelf = shouldDisable || node.id === currentEditId;
      node.disabled = disableSelf;
      if (node.children) {
        disableNodes(node.children, disableSelf);
      }
    });
  };
  
  disableNodes(cloneTree, false);
  return cloneTree;
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
      getProjectRoles({ skipCount: 0, maxResultCount: 1000 })
    ]);
    deptOptions.value = translateListToTree(deptRes.items || deptRes);
    projectRoleList.value = roleRes.items || roleRes;
  } catch (error) {
    console.error('获取字典数据失败', error);
  }
};

const getProjectRoleNames = (ids: string[]) => {
  if (!ids || ids.length === 0) return '-';
  return ids.map(id => {
    const role = projectRoleList.value.find(r => r.id === id);
    return role ? role.name : id;
  }).join('，');
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getLaborCategoryList();
    treeData.value = buildTreeAndCalculateDepth(res.items || res);
  } catch (error) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const openDialog = (type: 'addRoot' | 'addChild' | 'edit', row?: any) => {
  dialogVisible.value = true;
  categoryOptions.value = getSafeParentOptions(treeData.value, type === 'edit' ? row.id : null);

  if (type === 'addRoot') {
    dialogTitle.value = '新增顶级分类';
    Object.assign(form, { id: '', parentId: null, name: '', laborType: 1, laborClass: 1, mappingType: '', departmentIds: [], projectRoleIds: [], remark: '' });
  } else if (type === 'addChild') {
    dialogTitle.value = `在【${row.name}】下新增`;
    Object.assign(form, { id: '', parentId: row.id, name: '', laborType: 1, laborClass: 1, mappingType: '', departmentIds: [], projectRoleIds: [], remark: '' });
  } else if (type === 'edit') {
    dialogTitle.value = '修改分类';
    Object.assign(form, {
      ...row,
      mappingType: row.mappingType || '', 
      departmentIds: row.departmentIds || [],
      projectRoleIds: row.projectRoleIds || [] 
    });
  }
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        const payload = { ...form }; 
        if (payload.id) {
          await updateLaborCategory(payload.id, payload);
          ElMessage.success('修改成功');
        } else {
          await createLaborCategory(payload);
          ElMessage.success('新增成功');
        }
        dialogVisible.value = false;
        fetchData();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleDelete = (row: any) => {
  if (row.children && row.children.length > 0) {
    ElMessage.warning('该分类下存在子分类，无法直接删除');
    return;
  }
  ElMessageBox.confirm(`确定要删除【${row.name}】吗？`, '警告', { type: 'warning' }).then(async () => {
    await deleteLaborCategory(row.id);
    ElMessage.success('删除成功');
    fetchData();
  }).catch(() => {});
};

const closeDialog = () => formRef.value?.resetFields();

onMounted(async () => {
  await initDictData(); 
  fetchData();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}
/* 微调 el-radio 在弹窗中的间距 */
.el-radio {
  margin-bottom: 8px;
}
</style>