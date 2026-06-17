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
        
        <el-form-item label="项目角色">
          <el-select v-model="form.projectRoleId" placeholder="请选择角色" style="width: 160px;" @change="onRoleChange">
            <el-option v-for="role in projectRoles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="工时类别">
          <el-select v-model="form.laborClass" style="width: 140px;">
            <el-option label="项目工时" :value="1" />
            <el-option label="其他工时" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item label="关联项目" v-if="form.laborClass === 1">
          <el-select v-model="form.projectId" filterable placeholder="选择关联项目" style="width: 240px;">
            <el-option 
              v-for="proj in projects" 
              :key="proj.id" 
              :label="`${proj.name} (${proj.code})`" 
              :value="proj.id" 
            />
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
      
      <el-table-column prop="projectCode" label="项目工号" width="120" show-overflow-tooltip />
      <el-table-column prop="projectName" label="项目名称" min-width="150" show-overflow-tooltip />
      <el-table-column prop="projectRoleName" label="项目角色" width="120" show-overflow-tooltip />
      
      <el-table-column label="任务分类 (必填)" min-width="180">
        <template #default="{ row }">
          <el-select 
            v-model="row.laborCategoryId" 
            placeholder="请选择任务" 
            style="width: 100%" 
            :disabled="row.status !== -1"
            @change="(val) => handleTaskChange(row, val)"
          >
            <el-option v-for="cat in row.availableTasks" :key="cat.id" :label="cat.fullName" :value="cat.id" />
          </el-select>
        </template>
      </el-table-column>

      <el-table-column label="简述工作内容" min-width="200">
        <template #default="{ row }">
          <el-input 
            v-model="row.jobresponsibilities" 
            type="textarea" 
            :rows="5" 
            placeholder="请输入工作内容" 
            :disabled="row.status !== -1"
          />
        </template>
      </el-table-column>

      <el-table-column label="发生工时" width="130" align="center">
        <template #default="{ row }">
          <el-input-number 
            v-model="row.hours" 
            :min="0.5" 
            :step="0.5" 
            step-strictly 
            style="width: 100px;" 
            controls-position="right" 
            :disabled="row.status !== -1"
          />
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.status === 0" type="warning">审批中</el-tag>
          <el-tag v-else-if="row.status === 3" type="success">已通过</el-tag>
          <el-tag v-else-if="row.status === 1 || row.status === 2" type="danger">退回/撤回</el-tag>
          <el-tag v-else type="info">未提交</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="80" align="center" fixed="right">
        <template #default="{ $index, row }">
          <el-button 
            v-if="row.status === -1" 
            link 
            type="danger" 
            @click="removeRow($index)"
          >
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
import { ElMessage } from 'element-plus'
import { getProjectRoles } from '../../api/projectRole'
import { getProjects } from '../../api/project'
import { getLeafCategories } from '../../api/laborCategory'
import { useUserStore } from '../../stores/user'
import { saveDailyLaborReport,getLaborDetailsByIds} from '../../api/laborReport'

const emit = defineEmits(['refresh'])
const userStore = useUserStore()

const visible = ref(false)
const isEdit = ref(false)
const currentDate = ref('')
const submitLoading = ref(false)

// 基础字典
const projectRoles = ref<any[]>([])
const projects = ref<any[]>([])

// 上方表单
const form = reactive({
  laborClass: 1,
  projectRoleId: '',
  projectId: ''
})

// 下方表格
const tableData = ref<any[]>([])

// 暴露给 index.vue 调用的打开方法
const open = async (date: string, editMode: boolean, detailIds: string[] = []) => {
  currentDate.value = date
  isEdit.value = editMode
  tableData.value = []
  resetForm()
  
  // A. 加载公共基础字典
  if (projectRoles.value.length === 0) {
    const rRes = await getProjectRoles({ maxResultCount: 1000 })
    projectRoles.value = rRes.items || rRes
  }
  if (projects.value.length === 0) {
    const pRes = await getProjects({ maxResultCount: 1000 })
    projects.value = pRes.items || pRes
  }

  // B. 如果是修改状态，并且有详情ID数组，去后端接口查出来赋值
  if (editMode && detailIds && detailIds.length > 0) {
    try {
      // 🌟 调用接口：拿数组去后端换取完整的明细列表数据
      const serverDetails: any = await getLaborDetailsByIds(detailIds)
      
      if (serverDetails && Array.isArray(serverDetails)) {
        for (const item of serverDetails) {
          const tasks = await fetchTasksForCondition(item.projectRoleId, item.laborClass)
          tableData.value.push({
            id: item.detailId,
            laborClass: item.laborClass,
            projectId: item.projectId,
            projectCode: item.projectCode,
            projectName: item.projectName,
            projectRoleId: item.projectRoleId,
            projectRoleName: item.projectRoleName,
            laborCategoryId: item.laborCategoryId,
            laborCategoryCode: item.laborCategoryCode,
            jobresponsibilities: item.jobresponsibilities,
            hours: item.hours,
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

const onRoleChange = () => {
  // 切换角色时可以做一些清空操作
}

// 核心：添加行 (将表单值下推至表格)
const addRow = async () => {
  if (!form.projectRoleId) {
    return ElMessage.warning('请先选择项目角色')
  }
  if (form.laborClass === 1 && !form.projectId) {
    return ElMessage.warning('项目工时必须选择关联项目')
  }

  const selectedRole = projectRoles.value.find(r => r.id === form.projectRoleId)
  const selectedProj = form.laborClass === 1 ? projects.value.find(p => p.id === form.projectId) : null

  const tasks = await fetchTasksForCondition(form.projectRoleId, form.laborClass)
  if (tasks.length === 0) {
    ElMessage.info('当前条件下未配置任何任务分类')
    return
  }

  // 构建新行
  tableData.value.push({
    id: null,
    laborClass: form.laborClass,
    projectId: selectedProj?.id || null,
    projectCode: selectedProj?.code || '-',
    projectName: selectedProj?.name || '-',
    projectRoleId: form.projectRoleId,
    projectRoleName: selectedRole?.name || '-',
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

// 封装获取任务的方法 (依赖当前用户的 DepartmentId,调整了逻辑 DepartmentId传递控制，DepartmentId在后端获取)
const fetchTasksForCondition = async (roleId: string, lClass: number) => {
  const deptId = userStore.userInfo?.departmentId
  try {
    const res = await getLeafCategories({
      projectRoleId: roleId,
      departmentId: deptId,
      laborClass: lClass
    })
    return res || []
  } catch (error) {
    return []
  }
}

// 16. 当选择了任务分类后，自动带出 Remark 作为工作内容
const handleTaskChange = (row: any, categoryId: string) => {
  const task = row.availableTasks.find((t: any) => t.id === categoryId)
  if (task) {
    row.laborCategoryCode = task.code
    // 如果还没填内容，就用默认备注覆盖
    if (!row.jobresponsibilities) {
      row.jobresponsibilities = task.remark || ''
    }
  }
}

const removeRow = (index: number) => {
  tableData.value.splice(index, 1)
}

const submitReport = async () => {
  // 校验
  for (let i = 0; i < tableData.value.length; i++) {
    const row = tableData.value[i]
    if (!row.laborCategoryId) return ElMessage.warning(`第 ${i + 1} 行请选择任务分类`)
    if (!row.jobresponsibilities) return ElMessage.warning(`第 ${i + 1} 行请填写工作内容`)
  }

  submitLoading.value = true
  try {
    // 组装提交数据
    const payload = {
      reporterId: userStore.id,
      departmentId: userStore.userInfo?.departmentId,
      reportDate: currentDate.value,
      details: tableData.value.map(r => ({
        id: r.id, // 如果有id代表是编辑
        laborClass: r.laborClass,
        projectId: r.projectId,
        projectCode: r.projectCode,
        projectName: r.projectName,
        projectRoleId: r.projectRoleId,
        projectRoleName: r.projectRoleName,
        laborCategoryId: r.laborCategoryId,
        laborCategoryCode: r.laborCategoryCode,
        hours: r.hours,
        jobresponsibilities: r.jobresponsibilities
      }))
    }
    await saveDailyLaborReport(payload) 
    ElMessage.success('工时提报成功')
    visible.value = false
    emit('refresh') // 通知日历页面刷新状态颜色
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
.form-card {
  background-color: #f8f9fa;
  border: 1px dashed #e4e7ed;
}
</style>