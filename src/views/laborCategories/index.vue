<template>
  <div class="app-container">
    <el-card shadow="never">
      <div class="header-actions" style="margin-bottom: 20px;">
        <el-button type="primary" icon="Plus" @click="openDialog('addRoot')">新增顶级分类</el-button>
      </div>

      <el-table
        :data="treeData"
        row-key="id"
        border
        default-expand-all
        v-loading="loading"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column label="工时类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.laborType === 1 ? 'primary' : 'success'">
              {{ row.laborType === 1 ? '研发' : '生产' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="工时类别" width="100" align="center">
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
          min-width="70"
        >
          <template #default="{ row }">
            <span v-if="row.level === level" style="font-weight: bold;">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="code" label="排序号" width="130" />

        <el-table-column label="适用部门(全称)" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.departmentFullNames?.join('，') || '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="适用项目角色" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getProjectRoleNames(row.projectRoleIds) }}
          </template>
        </el-table-column>

        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        
        <el-table-column label="操作" width="165" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog('addChild', row)">添加下级</el-button>
            <el-button link type="warning" size="small" @click="openDialog('edit', row)">修改</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="600px" @close="closeDialog">
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
import { getLaborCategoryList, createLaborCategory, updateLaborCategory, deleteLaborCategory } from '../../api/laborCategory';
import { getDepartmentList } from '../../api/department'; 
import { getProjectRoles } from '../../api/projectRole';

const treeData = ref<any[]>([]);
const maxDepth = ref(1);
const loading = ref(false);

const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

const deptOptions = ref<any[]>([]);
const projectRoleList = ref<any[]>([]); // 替换旧的 roleOptions
const categoryOptions = ref<any[]>([]); 

// 修改表单结构，加入 projectRoleIds
const form = reactive({
  id: '',
  parentId: null as string | null,
  name: '',
  laborType: 1,
  laborClass: 1,
  departmentIds: [] as string[],
  projectRoleIds: [] as string[], 
  remark: ''
});

const rules = reactive({
  name: [{ required: true, message: '分类名称不能为空', trigger: 'blur' }],
  laborType: [{ required: true, message: '请选择工时类型', trigger: 'change' }],
  laborClass: [{ required: true, message: '请选择工时类别', trigger: 'change' }]
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