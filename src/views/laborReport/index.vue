<template>
  <div class="app-container" v-loading="loading">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="title">我的工时填报</span>
          <div class="actions">
            <el-button type="primary" plain size="small" @click="openSummary">详情记录</el-button>
          </div>
          <Detail ref="detailRef" @refresh="fetchCalendarData" />
          <SummaryDialog ref="summaryDialogRef" />
        </div>
      </template>

      <el-config-provider :locale="locale">
        <div class="calendar-top-legend">
          <el-tag type="success" effect="light" class="legend-item">已报工</el-tag>
          <el-tag type="warning" effect="light" class="legend-item">审批中</el-tag>
          <el-tag type="danger" effect="dark" class="legend-item">未报工</el-tag>
          <el-tag type="danger" effect="light" class="legend-item custom-withdrawn">退回、撤回</el-tag>
        </div>

        <el-calendar v-model="currentDate">
          <template #date-cell="{ data }">
            <div 
              class="calendar-cell" 
              :class="[
                isDisabledDate(data.date) ? 'is-disabled' : getDayDisplayStatus(data.day)
              ]"
              @click="handleDateClick(data)"
            >
              <div class="date-text" :class="{ 'is-today': data.isSelected && !isDisabledDate(data.date) }">
                {{ data.day.split('-')[2] }}
              </div>
              
              <div class="status-area">
                <template v-if="!isDisabledDate(data.date)">
                  <span class="hours-text" v-if="getDayHoursText(data.day)">
                    {{ getDayHoursText(data.day)}}
                  </span>
                  
                  <span class="status-text">
                    {{ getDayStatusText(data.day) }}
                  </span>
                </template>
              </div>
            </div>
          </template>
        </el-calendar>
      </el-config-provider>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { getCalendarStatus } from '../../api/laborReport'
import { ElMessage } from 'element-plus'
import Detail from './detail.vue'
import SummaryDialog from './SummaryDialog.vue'

// 【新增】引入配置 Store
import { useSystemConfigStore } from '../../stores/systemConfig'

const systemConfigStore = useSystemConfigStore()
const detailRef = ref()
const summaryDialogRef = ref()
const locale = zhCn
const loading = ref(false)
const currentDate = ref(new Date())

// 本地存放后端处理好的数据
const dailyStatusMap = ref<Record<string, any>>({})

onMounted(() => {
  fetchCalendarData()
})

const openSummary = () => {
  if(summaryDialogRef.value) {
    summaryDialogRef.value.open()
  }
}

const getCalendarDateRange = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay.getTime() - 15 * 24 * 60 * 60 * 1000)
  const lastDay = new Date(year, month + 1, 0)
  const endDate = new Date(lastDay.getTime() + 15 * 24 * 60 * 60 * 1000)
  const format = (d: Date) => {
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
  }

  return { startDate: format(startDate), endDate: format(endDate) }
}

const fetchCalendarData = async () => {
  const { startDate, endDate } = getCalendarDateRange(currentDate.value)
  try {
    loading.value = true
    const res: any = await getCalendarStatus(startDate, endDate)
    const map: Record<string, any> = {}
    if (res && Array.isArray(res)) {
      res.forEach(item => {
        map[item.date] = {
          approved: item.approvedDetailIds || [],
          pending: item.pendingDetailIds || [],
          rejectedOrWithdrawn: item.rejectedOrWithdrawnDetailIds || [],
          totalHours: item.totalEffectiveHours || 0
        }
      })
    }
    dailyStatusMap.value = map
  } catch (error) {
    console.error('加载日历数据失败:', error)
    ElMessage.error('加载工时数据失败')
  } finally {
    loading.value = false
  }
}

const handleDateClick = (data: any) => {
  // 【修改】阻止不可操作日期的点击
  if (isDisabledDate(data.date)) return;
  
  const dateStr = data.day;
  const dayData = dailyStatusMap.value[dateStr];
  const approved = dayData?.approved || [];
  const pending = dayData?.pending || [];
  const rejectedOrWithdrawn = dayData?.rejectedOrWithdrawn || [];
  const arr = [...approved, ...pending, ...rejectedOrWithdrawn];
  const isEdit = arr.length > 0;
  detailRef.value.open(dateStr, isEdit, arr);
};

const getDayDisplayStatus = (dateStr: string) => {
  const dayData = dailyStatusMap.value[dateStr]
  if (!dayData || (dayData.approved.length === 0 && dayData.pending.length === 0 && dayData.rejectedOrWithdrawn.length === 0)) {
    return 'status-no-report' 
  }
  if (dayData.rejectedOrWithdrawn.length > 0) return 'status-rejected-withdrawn' 
  if (dayData.pending.length > 0) return 'status-pending' 
  if (dayData.approved.length > 0) return 'status-approved' 
  return 'status-no-report'
}

const getDayStatusText = (dateStr: string) => {
  const dayData = dailyStatusMap.value[dateStr]
  if (!dayData || (dayData.approved.length === 0 && dayData.pending.length === 0 && dayData.rejectedOrWithdrawn.length === 0)) {
    return '未报工'
  }
  if (dayData.rejectedOrWithdrawn.length > 0) return '退回/撤回'
  if (dayData.pending.length > 0) return '审批中'
  if (dayData.approved.length > 0) return '已报工'
  return '未报工'
}

const getDayHoursText = (dateStr: string) => {
  const dayData = dailyStatusMap.value[dateStr]
  if (dayData && dayData.totalHours > 0) {
    let displayHours = dayData.totalHours
    // 【修改】配置要求：如果 auditStatus 为 true 且超过 8 小时，则界面最多只显示 8
    if (systemConfigStore.auditStatus && displayHours > 8) {
      displayHours = 8
    }
    return `生效工时：${displayHours}h`
  }
  return ''
}

// 是否是将来的日期（不受配置影响，一律禁用）
const isFutureDate = (cellDate: Date) => {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 1) 
  targetDate.setHours(0, 0, 0, 0)
  return cellDate.getTime() > targetDate.getTime()
}

// 【新增】判断某天是否在界面上被禁用
const isDisabledDate = (cellDate: Date) => {
  // 未来的日期直接禁用
  if (isFutureDate(cellDate)) return true;
  // 如果配置开启，检测是否为周末（周六为6，周日为0）
  if (systemConfigStore.auditStatus) {
    const dayOfWeek = cellDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true
    }
  }
  return false
}

watch(currentDate, (newDate, oldDate) => {
  if (!oldDate || newDate.getFullYear() !== oldDate.getFullYear() || newDate.getMonth() !== oldDate.getMonth()) {
    fetchCalendarData()
  }
})
</script>

<style scoped>
/* 样式内容与原样一致，不需要修改（.is-disabled 类原本就存在且处理了置灰逻辑） */
.app-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: bold; font-size: 16px; }
.calendar-top-legend { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 12px; padding-right: 4px; }
.legend-item { font-weight: 500; cursor: default; }
.custom-withdrawn { background-color: #fff5f5; border-color: #fee2e2; color: #f87171; }
.calendar-cell { height: 100%; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; cursor: pointer; padding: 8px 4px 6px 4px; transition: all 0.25s ease; }
.date-text { font-size: 16px; font-weight: 600; flex: 1; display: flex; align-items: center; justify-content: center; }
.status-area { min-height: 38px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 2px; }
.hours-text { font-size: 13px; font-weight: bold; opacity: 0.9; }
.status-text { font-size: 12px; font-weight: 500; letter-spacing: 0.5px; opacity: 0.85; line-height: 1.2; }
:deep(.el-calendar-table .el-calendar-day) { padding: 0px; height: 100px; }
.is-today { color: var(--el-color-primary); text-decoration: underline; }

.status-no-report { background-color: #fee2e2 !important; color: #dc2626; }
.status-no-report:hover { background-color: #fca5a5 !important; }
.status-rejected-withdrawn { background-color: #fff5f5 !important; color: #f87171; }
.status-rejected-withdrawn:hover { background-color: #fee2e2 !important; }
.status-pending { background-color: #fdf6ec !important; color: #e6a23c; }
.status-pending:hover { background-color: #f5dab1 !important; }
.status-approved { background-color: #f0f9eb !important; color: #67c23a; }
.status-approved:hover { background-color: #c2e7b0 !important; }
.is-disabled { cursor: not-allowed; background-color: #f5f7fa !important; color: #c0c4cc !important; }
.is-disabled:hover { background-color: #f5f7fa !important; }
.is-disabled .date-text.is-today { color: #c0c4cc; }
</style>