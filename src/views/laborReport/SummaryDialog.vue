<template>
  <el-dialog v-model="visible" title="本月工时汇总" fullscreen destroy-on-close>
    <div class="summary-container" v-loading="loading">
      
      <div class="search-bar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          :clearable="false"
          @change="handleDateChange"
          style="width: 360px;" 
        />
        <el-button type="primary" @click="fetchData" style="margin-left: 15px;">查询汇总</el-button>
      </div>

      <div class="summary-cards">
        <el-card shadow="hover" class="card-item">
          <div class="label">应报工时</div>
          <div class="value">{{ expectedHours }}</div>
        </el-card>
        <el-card shadow="hover" class="card-item clickable" :class="{ active: filterType === 'All' }" @click="setFilter('All')">
          <div class="label">已报工时</div>
          <div class="value">{{ summaryData.totalReportedHours }}</div>
        </el-card>
        <el-card shadow="hover" class="card-item clickable" :class="{ active: filterType === 'Approved' }" @click="setFilter('Approved')">
          <div class="label">过审工时</div>
          <div class="value success">{{ summaryData.totalApprovedHours }}</div>
        </el-card>
        <el-card shadow="hover" class="card-item clickable" :class="{ active: filterType === 'Pending' }" @click="setFilter('Pending')">
          <div class="label">待审工时</div>
          <div class="value warning">{{ summaryData.totalPendingHours }}</div>
        </el-card>
        <!-- <el-card shadow="hover" class="card-item">
          <div class="label">加班工时</div>
          <div class="value danger">{{ summaryData.totalOvertimeHours }}</div>
        </el-card> -->
      </div>

      <el-table :data="filteredTableData" border style="width: 100%; margin-top: 20px;" height="calc(100vh - 280px)">
        <el-table-column prop="reportDate" label="报工日期" width="120" align="center">
          <template #default="{ row }">
            {{ formatDate(row.reportDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="projectName" label="关联项目" min-width="150" show-overflow-tooltip />
        <el-table-column prop="projectRoleName" label="申报角色" width="120" />
        <el-table-column prop="laborCategoryFullName" label="任务分类" min-width="200" show-overflow-tooltip />
        
        <el-table-column prop="jobresponsibilities" label="工作内容" min-width="250" show-overflow-tooltip />
        <el-table-column prop="hours" label="申报工时" width="90" align="center" />
        <el-table-column prop="status" label="申报状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getMonthlySummary } from '../../api/report'

const visible = ref(false)
const loading = ref(false)
const dateRange = ref<[string, string]>(['', ''])
const filterType = ref<'All' | 'Approved' | 'Pending'>('All')

const summaryData = ref({
  totalReportedHours: 0,
  totalApprovedHours: 0,
  totalPendingHours: 0,
  totalOvertimeHours: 0,
  details: [] as any[]
})

// 计算应报工时：工作日 * 8h
const expectedHours = computed(() => {
  if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) return 0
  let count = 0
  let curDate = new Date(dateRange.value[0])
  const endDate = new Date(dateRange.value[1])
  
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    curDate.setDate(curDate.getDate() + 1)
  }
  return count * 8
})

// 过滤表格联动数据
const filteredTableData = computed(() => {
  if (filterType.value === 'Approved') {
    return summaryData.value.details.filter(x => x.status === 3) // 3 代表已过审
  } else if (filterType.value === 'Pending') {
    return summaryData.value.details.filter(x => x.status === 0) // 0 代表待审核
  }
  return summaryData.value.details
})

const initDefaultDate = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const format = (d: Date) => {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  }
  dateRange.value = [format(firstDay), format(now)]
}

const handleDateChange = (val: [string, string]) => {
  if (val && val.length === 2) {
    const start = new Date(val[0]).getTime()
    const end = new Date(val[1]).getTime()
    const diffDays = Math.floor((end - start) / (1000 * 3600 * 24))
    if (diffDays > 31) {
      ElMessage.warning('查询时间范围不能超过31天，已自动重置')
      initDefaultDate()
    }
  }
}

const fetchData = async () => {
  if (!dateRange.value || dateRange.value.length < 2) return
  loading.value = true
  try {
    const res: any = await getMonthlySummary(dateRange.value[0], dateRange.value[1])
    summaryData.value = {
      totalReportedHours: res.totalReportedHours || 0,
      totalApprovedHours: res.totalApprovedHours || 0,
      totalPendingHours: res.totalPendingHours || 0,
      totalOvertimeHours: res.totalOvertimeHours || 0,
      details: res.details || []
    }
    filterType.value = 'All' 
  } catch (error) {
    ElMessage.error('获取汇总数据失败')
  } finally {
    loading.value = false
  }
}

const open = () => {
  visible.value = true
  initDefaultDate()
  fetchData()
}

const setFilter = (type: 'All' | 'Approved' | 'Pending') => {
  filterType.value = type
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

const getStatusText = (status: number) => {
  switch (status) {
    case 0: return '审批中'
    case 1: return '撤回'
    case 2: return '退回'
    case 3: return '审批完成'
    default: return '未知'
  }
}

const getStatusType = (status: number) => {
  switch (status) {
    case 0: return 'warning'
    case 1: return 'info'
    case 2: return 'danger'
    case 3: return 'success'
    default: return ''
  }
}

defineExpose({ open })
</script>

<style scoped>
.summary-container {
  padding: 10px 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.summary-cards {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}
.card-item {
  flex: 1;
  text-align: center;
  border-radius: 8px;
  transition: all 0.3s;
}
.card-item.clickable {
  cursor: pointer;
}
.card-item.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.card-item.active {
  border: 2px solid var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}
.card-item .label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}
.card-item .value {
  font-size: 24px;
  font-weight: bold;
}
.card-item .value.success { color: #67c23a; }
.card-item .value.warning { color: #e6a23c; }
.card-item .value.danger { color: #f56c6c; }
</style>