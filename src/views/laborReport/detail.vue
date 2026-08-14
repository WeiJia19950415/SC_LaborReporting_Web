<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? `修改工时 (${currentDate})` : `申报工时 (${currentDate})`"
    width="1500px"
    destroy-on-close
    @close="handleClose"
  >
    <el-card shadow="never" class="form-card">
      <el-form ref="formRef" :model="form" :inline="true" label-width="90px">
        <el-form-item label="工时日期">
          <el-input v-model="currentDate" disabled style="width: 140px;" />
        </el-form-item>
        <el-form-item label="工时类别">
          <el-select v-model="form.laborClass" style="width: 140px;">
            <el-option label="项目工时" :value="1" />
            <el-option label="其他工时" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目角色">
          <el-select v-model="form.projectRoleId" placeholder="请选择角色" style="width: 160px;" @change="onRoleChange">
            <el-option v-for="role in projectRoles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联项目" v-if="form.laborClass === 1">
          <el-select v-model="form.projectId" filterable placeholder="选择关联项目" style="width: 240px;">
            <el-option v-for="proj in projects" :key="proj.id" :label="`${proj.name} (${proj.code})`" :value="proj.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Plus" @click="addRow">添加行</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="tableData" border style="width: 100%; margin-top: 15px;">
      <el-table-column label="工时类别" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.laborClass === 1 ? 'primary' : 'info'">
            {{ row.laborClass === 1 ? '项目工时' : '其他工时' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="projectCode" label="项目编号" width="100" show-overflow-tooltip />
      <el-table-column prop="projectName" label="项目名称" min-width="150" show-overflow-tooltip />
      <el-table-column prop="projectRoleName" label="项目角色" width="100" show-overflow-tooltip />
      <el-table-column label="产品系列" min-width="120">
        <template #default="{ row }">
          <el-select 
            v-model="row.productSeriesId" 
            :placeholder="row.laborClass === 2 ? '无需选择' : '请选择'" 
            clearable 
            filterable
            :disabled="row.status === 0 || row.status === 3 || row.laborClass === 2"
          >
            <!-- 修复：产品系列显示逻辑优化 -->
            <el-option
              v-for="item in productSeriesOptions"
              :key="item.id"
              :label="item.name ? (item.code ? `${item.code} - ${item.name}` : item.name) : item.code" 
              :value="item.id"
            />
          </el-select>
        </template>
      </el-table-column>

      <el-table-column label="任务分类 (必填)" min-width="240">
        <template #default="{ row }">
          <!-- 使用 tooltip 组件包裹，动态获取任务分类的中文字段名 -->
          <el-tooltip 
            effect="dark" 
            :content="row.availableTasks?.find(t => t.id === row.laborCategoryId)?.fullName || ''" 
            placement="top"
            :disabled="row.status === -1 || !row.laborCategoryId"
          >
            <!-- 必须加这一层 div，否则 disabled 状态下的 select 无法触发 hover 事件 -->
            <div style="width: 100%; display: inline-block;">
              <el-select 
                v-model="row.laborCategoryId" 
                filterable clearable placeholder="请选择任务" 
                style="width: 100%" 
                :disabled="row.status !== -1" 
                @change="(val) => handleTaskChange(row, val)"
              >
                <el-option 
                  v-for="cat in row.availableTasks" 
                  :key="cat.id" 
                  :label="cat.fullName" 
                  :value="cat.id" />
              </el-select>
            </div>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="简述工作内容" min-width="240">
        <template #default="{ row }">
          <el-input 
            v-model="row.jobresponsibilities" 
            type="textarea" :rows="5" placeholder="请输入工作内容" 
            :disabled="row.status === 0 || row.status === 3" 
          />
        </template>
      </el-table-column>
      <el-table-column label="发生工时" width="130" align="center">
        <template #default="{ row }">
          <el-input-number 
            v-model="row.hours" 
            :min="0.5" :step="0.5" step-strictly 
            style="width: 100px;" controls-position="right" 
            :disabled="row.status === 0 || row.status === 3" 
          />
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.status === 0" type="warning">审批中</el-tag>
          <el-tag v-else-if="row.status === 3" type="success">已通过</el-tag>
          <el-tag v-else-if="row.status === 1 || row.status === 2" type="danger">撤回</el-tag>
          <el-tag v-else type="info">未提交</el-tag>
        </template>
      </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row, $index }">
            <el-button 
              v-if="row.status === 0" 
              link 
              type="warning" 
              @click="handleWithdraw(row)">
              撤回
            </el-button>
            
            <el-button 
              v-if="row.status === -1 || row.status === 1 || row.status === 2" 
              link 
              type="danger" 
              @click="handleDelete(row, $index)">
              删除
            </el-button>
          </template>
        </el-table-column>
    </el-table>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取 消</el-button>
        <el-button type="primary" @click="submitReport" :loading="submitLoading">保存提交</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getProjectRoles } from '../../api/projectRole'
import { getProjects } from '../../api/project'
import { getLeafCategories } from '../../api/laborCategory'
import { useUserStore } from '../../stores/user'
import { saveDailyLaborReport, getLaborDetailsByIds } from '../../api/laborReport'
import { getProductSeriesList } from '../../api/productSeries';
import { useSystemConfigStore } from '../../stores/systemConfig'
import { withdrawLaborDetail, deleteLaborDetail } from '../../api/laborReport';

const emit = defineEmits(['refresh'])
const userStore = useUserStore()
const systemConfigStore = useSystemConfigStore()
const productSeriesOptions = ref<any[]>([]);
// 全量任务字典（用于映射历史汉化数据）
const allTasksOptions = ref<any[]>([]);

const visible = ref(false)
const isEdit = ref(false)
const currentDate = ref('')
const submitLoading = ref(false)

const projectRoles = ref<any[]>([])
const projects = ref<any[]>([])

const form = reactive({
  laborClass: 1,
  projectRoleId: '',
  projectId: ''
})

const tableData = ref<any[]>([])

const loadProductSeries = async () => {
  try {
    const res = await getProductSeriesList({ SkipCount: 0, MaxResultCount: 1000 });
    productSeriesOptions.value = res.items || res || [];
  } catch (error) {
    console.error('获取产品系列失败', error);
  }
};

const loadAllTasks = async () => {
  try {
    // 不带任何条件请求，获取全量任务用于中文翻译匹配
    const res = await getLeafCategories({ maxResultCount: 1000 });
    allTasksOptions.value = res.items || res || [];
  } catch (error) {
    console.error('获取全量任务字典失败', error);
  }
};

const open = async (date: string, editMode: boolean, detailIds: string[] = []) => {
  currentDate.value = date
  isEdit.value = editMode
  tableData.value = []
  resetForm()
  
  if (projectRoles.value.length === 0) {
    const rRes = await getProjectRoles({ maxResultCount: 1000 })
    projectRoles.value = rRes.items || rRes || []
  }
  if (projects.value.length === 0) {
    const pRes = await getProjects({ maxResultCount: 1000 })
    projects.value = pRes.items || pRes || []
  }
  
  // 必须保证全量字典加载完成
  if (productSeriesOptions.value.length === 0) await loadProductSeries()
  if (allTasksOptions.value.length === 0) await loadAllTasks()

  if (editMode && detailIds && detailIds.length > 0) {
    try {
      const serverDetails: any = await getLaborDetailsByIds(detailIds)
      
      if (serverDetails && Array.isArray(serverDetails)) {
        for (const item of serverDetails) {
          // 根据当前的条件获取【正常可选】的任务字典
          let tasks = await fetchTasksForCondition(item.projectRoleId, item.laborClass)
          
          // 修复：全量匹配任务分类
          // 如果当前行已有的 laborCategoryId 不在正常可选的字典内（因筛选条件被过滤了）
          if (item.laborCategoryId && !tasks.some((t: any) => t.id === item.laborCategoryId)) {
            // 去全量字典里找
            const globalTask = allTasksOptions.value.find(t => t.id === item.laborCategoryId);
            if (globalTask) {
              tasks.push(globalTask);
            } else {
              // 极限兜底：万一真的被物理删除了，至少显示它原本的名称或编码
              tasks.push({
                id: item.laborCategoryId,
                fullName: item.laborCategoryName || item.laborCategoryCode || item.laborCategoryId
              });
            }
          }

          // 修复：产品系列全量匹配兜底
          if (item.productSeriesId && !productSeriesOptions.value.some(p => p.id === item.productSeriesId)) {
            productSeriesOptions.value.push({
              id: item.productSeriesId,
              code: item.productSeriesCode || '',
              name: item.productSeriesName || item.productSeriesId
            });
          }

          const defaultHours = systemConfigStore.auditStatus ? (item.hoursFinance ?? item.hours) : item.hours

          tableData.value.push({
            id: item.detailId,
            laborClass: item.laborClass,
            projectId: item.projectId,
            projectCode: item.projectCode,
            projectName: item.projectName,
            projectRoleId: item.projectRoleId,
            projectRoleName: item.projectRoleName,
            productSeriesId: item.productSeriesId || null, 
            laborCategoryId: item.laborCategoryId,
            laborCategoryCode: item.laborCategoryCode,
            jobresponsibilities: item.jobresponsibilities,
            hours: defaultHours, 
            status: item.status, 
            availableTasks: tasks 
          })
        }
      }
    } catch (error) {
      console.error('回显工时详情失败:', error)
      ElMessage.error('无法加载该日期下的报工详情明细')
    }
  }

  visible.value = true
}

const resetForm = () => {
  form.laborClass = 1
  form.projectRoleId = ''
  form.projectId = ''
}

const onRoleChange = () => {}

const handleWithdraw = (row: any) => {
  ElMessageBox.confirm('确定要撤回这条报工记录吗？', '提示', {
    confirmButtonText: '确定撤回',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await withdrawLaborDetail(row.id);
      ElMessage.success('撤回成功！您可以直接在表格中修改内容并重新提交。');
      
      row.status = 2; // 更新为撤回状态，界面解锁
      emit('refresh'); 
    } catch (error) {}
  }).catch(() => {});
};

const handleDelete = (row: any, index: number) => {
  ElMessageBox.confirm('确定要永久删除该记录吗？', '危险操作', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'error'
  }).then(async () => {
    try {
      if (row.id) {
        await deleteLaborDetail(row.id);
      }
      
      tableData.value.splice(index, 1);
      ElMessage.success('删除成功！');
      emit('refresh');
    } catch (error) {}
  }).catch(() => {});
};

const addRow = async () => {
  if (form.laborClass === 1 && !form.projectId) return ElMessage.warning('项目工时必须选择关联项目')

  const selectedRole = projectRoles.value.find(r => r.id === form.projectRoleId)
  const selectedProj = form.laborClass === 1 ? projects.value.find(p => p.id === form.projectId) : null

  const tasks = await fetchTasksForCondition(form.projectRoleId, form.laborClass)
  if (tasks.length === 0) {
    ElMessage.info('当前条件下未配置任何任务分类')
    return
  }

  tableData.value.push({
    id: null,
    laborClass: form.laborClass,
    projectId: selectedProj?.id || null,
    projectCode: selectedProj?.code || '-',
    projectName: selectedProj?.name || '-',
    projectRoleId: form.projectRoleId,
    projectRoleName: selectedRole?.name || '-',
    productSeriesId: null, 
    laborCategoryId: '',
    laborCategoryCode: '',
    jobresponsibilities: '',
    hours: 0.5, 
    status: -1, // 新行默认状态为-1
    availableTasks: tasks 
  })

  form.projectRoleId = ''
  form.projectId = ''
}

const fetchTasksForCondition = async (roleId: string, lClass: number) => {
  const deptId = userStore.userInfo?.departmentId
  try {
    const res = await getLeafCategories({ projectRoleId: roleId, departmentId: deptId, laborClass: lClass })
    return res.items || res || []
  } catch (error) {
    return []
  }
}

const handleTaskChange = (row: any, categoryId: string) => {
  const task = row.availableTasks.find((t: any) => t.id === categoryId)
  if (task) {
    row.laborCategoryCode = task.code
    if (!row.jobresponsibilities) {
      row.jobresponsibilities = task.remark || ''
    }
  }
}

const submitReport = async () => {
  if (tableData.value.length === 0) {
    return ElMessage.warning('请至少添加一行报工明细')
  }

  for (let i = 0; i < tableData.value.length; i++) {
    const row = tableData.value[i]
    if (!row.laborCategoryId) return ElMessage.warning(`第 ${i + 1} 行请选择任务分类`)
    if (!row.jobresponsibilities) return ElMessage.warning(`第 ${i + 1} 行请填写工作内容`)
  }

  if (systemConfigStore.auditStatus) {
    const totalHours = tableData.value.reduce((acc, row) => acc + row.hours, 0)
    if (totalHours > 8) {
      return ElMessage.warning('当前审核规则限制：单日提交总工时不能超过 8 小时')
    }
  }

  submitLoading.value = true
  try {
    const payload = {
      reporterId: userStore.id,
      departmentId: userStore.userInfo?.departmentId,
      reportDate: currentDate.value,
      details: tableData.value.map(r => {
        let validProductSeriesId = null;
        if (r.productSeriesId && 
            typeof r.productSeriesId === 'string' && 
            r.productSeriesId.trim() !== '' && 
            r.productSeriesId !== 'null' && 
            r.productSeriesId !== 'undefined') {
            validProductSeriesId = r.productSeriesId;
        }

        const baseDetail: any = {
          id: r.id, 
          laborClass: r.laborClass,
          projectId: r.projectId,
          projectCode: r.projectCode,
          projectName: r.projectName,
          projectRoleId: r.projectRoleId,
          projectRoleName: r.projectRoleName,
          productSeriesId: validProductSeriesId, 
          laborCategoryId: r.laborCategoryId,
          laborCategoryCode: r.laborCategoryCode,
          jobresponsibilities: r.jobresponsibilities,
          // 修复：强制前端传递状态为 0 (审批中)，确保后端知道这是一次重新提交
          status: 0 
        }
        
        if (systemConfigStore.auditStatus) {
          baseDetail.hoursFinance = r.hours 
        } else {
          baseDetail.hours = r.hours 
        }
        
        return baseDetail
      })
    }
    
    await saveDailyLaborReport(payload) 
    ElMessage.success('工时提报成功')
    visible.value = false
    emit('refresh') 
  } catch (error) {
    console.error(error)
  } finally {
    submitLoading.value = false
  }
}

const handleClose = () => {
  resetForm()
}

defineExpose({ open })
</script>

<style scoped>
.form-card { background-color: #f8f9fa; border: 1px dashed #e4e7ed; }
</style>