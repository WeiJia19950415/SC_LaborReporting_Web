<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? `修改工时 (${currentDate})` : `申报工时 (${currentDate})`"
    width="1500px"
    destroy-on-close
    @close="handleClose"
  >
    <!-- 需求8、9：顶部展示当日考勤信息提示 -->
    <el-alert 
      v-if="currentAttendance" 
      :title="alertTitle" 
      :type="currentAttendance.isMissingPunch ? 'error' : 'success'" 
      :closable="false"
      show-icon
      style="margin-bottom: 15px;"
    />
    <el-alert 
      v-else 
      title="当日无打卡记录，最大可填报工时为 0 h" 
      type="error" 
      show-icon
      :closable="false"
      style="margin-bottom: 15px;"
    />

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
            <el-option v-for="proj in activeProjects" :key="proj.id" :label="`${proj.name} (${proj.code})`" :value="proj.id" />
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
          <!-- 【修改】：去除了 row.status === 0 || row.status === 3，仅保留其他工时禁用 -->
          <el-select 
            v-model="row.productSeriesId" 
            :placeholder="row.laborClass === 2 ? '无需选择' : '请选择'" 
            clearable 
            filterable
            :disabled="row.laborClass === 2"
          >
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
          <!-- 【修改】：去除了 tooltip 和 select 的状态禁用限制，使其一直可以下拉和更改 -->
          <el-tooltip 
            effect="dark" 
            :content="row.availableTasks?.find(t => t.id === row.laborCategoryId)?.fullName || ''" 
            placement="top"
            :disabled="!row.laborCategoryId"
          >
            <div style="width: 100%; display: inline-block;">
              <el-select 
                v-model="row.laborCategoryId" 
                filterable clearable placeholder="请选择任务" 
                style="width: 100%" 
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
          <!-- 【修改】：移除了 disabled 属性 -->
          <el-input 
            v-model="row.jobresponsibilities" 
            type="textarea" :rows="5" placeholder="请输入工作内容" 
          />
        </template>
      </el-table-column>
      <el-table-column label="发生工时" width="130" align="center">
        <template #default="{ row }">
          <!-- 【修改】：移除了 disabled 属性 -->
          <el-input-number 
            v-model="row.hours" 
            :min="0.5" :step="0.5" step-strictly 
            style="width: 100px;" controls-position="right" 
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
            
            <!-- 【修改】：去除了删除按钮仅在特定状态显示的限制，只要不是审批中(0)均可删除 -->
            <el-button 
              v-if="row.status !== 0" 
              link 
              type="danger" 
              @click="handleDelete(row, $index)">
              删除
            </el-button>
          </template>
        </el-table-column>
    </el-table>

    <template #footer>
      <div class="dialog-footer" style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; color: #E6A23C;">
          当前已填报总工时: {{ totalReportedHours }} h
        </span>
        <div>
          <el-button @click="visible = false">取 消</el-button>
          <el-button type="primary" @click="submitReport" :loading="submitLoading">保存提交</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
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
const allTasksOptions = ref<any[]>([]);

const visible = ref(false)
const isEdit = ref(false)
const currentDate = ref('')
const submitLoading = ref(false)

const currentAttendance = ref<any>(null)

const projectRoles = ref<any[]>([])
const projects = ref<any[]>([])

const activeProjects = computed(() => {
  return projects.value.filter(p => p.isOld)
})
const form = reactive({
  laborClass: 1,
  projectRoleId: '',
  projectId: ''
})

const tableData = ref<any[]>([])

const totalReportedHours = computed(() => {
  return tableData.value.reduce((sum, row) => sum + (row.hours || 0), 0)
})

const alertTitle = computed(() => {
  if (!currentAttendance.value) return '';
  if (currentAttendance.value.isMissingPunch) return `当日考勤异常：缺卡。无法报工！`;
  return `当日打卡记录：${currentAttendance.value.firstPunchTime} - ${currentAttendance.value.lastPunchTime} ，考勤时长: ${currentAttendance.value.durationHours} h`;
});

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
    const res = await getLeafCategories({ maxResultCount: 1000 });
    allTasksOptions.value = res.items || res || [];
  } catch (error) {
    console.error('获取全量任务字典失败', error);
  }
};

const open = async (date: string, editMode: boolean, detailIds: string[] = [], attendanceInfo: any = null) => {
  currentDate.value = date
  isEdit.value = editMode
  currentAttendance.value = attendanceInfo
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
  
  if (productSeriesOptions.value.length === 0) await loadProductSeries()
  if (allTasksOptions.value.length === 0) await loadAllTasks()

  if (editMode && detailIds && detailIds.length > 0) {
    try {
      const serverDetails: any = await getLaborDetailsByIds(detailIds)
      
      if (serverDetails && Array.isArray(serverDetails)) {
        for (const item of serverDetails) {
          let tasks = await fetchTasksForCondition(item.projectRoleId, item.laborClass)
          
          if (item.laborCategoryId && !tasks.some((t: any) => t.id === item.laborCategoryId)) {
            const globalTask = allTasksOptions.value.find(t => t.id === item.laborCategoryId);
            if (globalTask) {
              tasks.push(globalTask);
            } else {
              tasks.push({
                id: item.laborCategoryId,
                fullName: item.laborCategoryName || item.laborCategoryCode || item.laborCategoryId
              });
            }
          }

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
      row.status = 2; 
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
    status: -1, 
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

  if (!currentAttendance.value || currentAttendance.value.isMissingPunch) {
    return ElMessage.warning('当日缺卡或无考勤记录，不允许报工！')
  }
  if (totalReportedHours.value > currentAttendance.value.durationHours) {
    return ElMessage.warning(`填报总工时 (${totalReportedHours.value}h) 超出当日实际考勤时长 (${currentAttendance.value.durationHours}h) ！`)
  }

  if (systemConfigStore.auditStatus) {
    if (totalReportedHours.value > 8) {
      return ElMessage.warning('当前审核规则限制：单日提交总工时不能超过 8 小时')
    }
  }

  const targetDate = new Date(currentDate.value);
  const minDate = new Date('2025-01-01T00:00:00');
  const maxDate = new Date('2026-07-31T23:59:59');
  
  if (targetDate < minDate || targetDate > maxDate) {
    return ElMessage.warning('历史工时提交范围仅限于 2025年1月1日 - 2026年7月31日');
  }

  submitLoading.value = true
  try {
    const payload = {
      reporterId: userStore.id,
      departmentId: userStore.userInfo?.departmentId,
      reportDate: currentDate.value,
      isHistory: true, 
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
          status: 3 
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
    ElMessage.success('历史工时提报成功，已自动免审批通过！')
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