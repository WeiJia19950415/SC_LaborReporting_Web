<template>
  <div class="app-container" v-loading="loading">
    <el-card class="box-card" shadow="hover">
      <!-- 需求3：使用自定义头部替换默认的三个按钮 -->
      <template #header>
        <div class="card-header">
          <span class="title">历史工时填报</span>
          
          <!-- 需求3、4：月份选择器，默认从 2025年1月 开始 -->
          <el-date-picker
            v-model="selectedMonth"
            type="month"
            format="YYYY-MM"
            value-format="YYYY-MM"
            placeholder="选择月份"
            :clearable="false"
            @change="handleMonthChange"
            style="width: 150px; margin-left: 20px;"
          />

          <div class="actions" style="margin-left: auto;">
            <el-button type="primary" plain size="small" @click="openSummary">详情记录</el-button>
          </div>
          
          <!-- 引入历史详情页组件 -->
          <Detail ref="detailRef" :close-on-click-modal="false" @refresh="fetchCalendarData" />
          <SummaryDialog ref="summaryDialogRef" />
        </div>
      </template>

      <el-config-provider :locale="locale">
        <el-calendar v-model="currentDate">
          <!-- 隐藏掉原生 header -->
          <template #header></template>
          
          <template #date-cell="{ data }">
            <div 
              class="calendar-cell" 
              :class="[
                isDisabledDate(data.date) ? 'is-disabled' : getDayDisplayStatus(data.day)
              ]"
              @click="handleDateClick(data)"
            >
              <!-- 日期数字 -->
              <div class="date-text" :class="{ 'is-today': data.isSelected && !isDisabledDate(data.date) }">
                {{ data.day.split('-')[2] }}
              </div>
              
              <div class="status-area">
                <template v-if="!isDisabledDate(data.date)">
                  
                  <!-- 【修改点】：展示完整考勤信息 -->
                  <div class="attendance-info" v-if="getAttendanceData(data.day)">
                    <!-- 上班打卡及结果 -->
                    <div class="punch-row">
                      <span class="time-label">上: {{ getAttendanceData(data.day).firstPunchTime || '--:--' }}</span>
                      <span :class="['result-tag', getResultStatusClass(getAttendanceData(data.day).checkInResults)]">
                        {{ getAttendanceData(data.day).checkInResults || '无记录' }}
                      </span>
                    </div>
                    
                    <!-- 下班打卡及结果 -->
                    <div class="punch-row">
                      <span class="time-label">下: {{ getAttendanceData(data.day).lastPunchTime || '--:--' }}</span>
                      <span :class="['result-tag', getResultStatusClass(getAttendanceData(data.day).offdutytimeResults)]">
                        {{ getAttendanceData(data.day).offdutytimeResults || '无记录' }}
                      </span>
                    </div>
                    
                    <!-- 考勤时长 -->
                    <div class="duration-str">考勤时长: {{ getAttendanceData(data.day).durationHours }}h</div>
                  </div>
                  <!-- 没有考勤数据时占位或提示 -->
                  <div class="attendance-info empty-attendance" v-else>
                    <span class="result-tag text-danger">无考勤记录</span>
                  </div>

                  <!-- 报工信息 -->
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
import { getMyMonthlyAttendance } from '../../api/attendance' 
import { ElMessage } from 'element-plus'
import Detail from './laborReportHistoryDetail.vue' 
import SummaryDialog from './SummaryDialog.vue'
import { useSystemConfigStore } from '../../stores/systemConfig'

const systemConfigStore = useSystemConfigStore()
const detailRef = ref()
const summaryDialogRef = ref()
const locale = zhCn
const loading = ref(false)

const selectedMonth = ref('2025-01')
const currentDate = ref(new Date('2025-01-01T00:00:00'))

const dailyStatusMap = ref<Record<string, any>>({})
const attendanceMap = ref<Record<string, any>>({}) 

onMounted(() => {
  fetchCalendarData()
})

const handleMonthChange = (val: string) => {
  if (val) {
    currentDate.value = new Date(`${val}-01T00:00:00`)
  }
}

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
  const monthStr = selectedMonth.value 
  
  try {
    loading.value = true
    const [res, attendanceRes] = await Promise.all([
      getCalendarStatus(startDate, endDate),
      getMyMonthlyAttendance(monthStr).catch(() => []) 
    ])

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

    const attMap: Record<string, any> = {}
    if (attendanceRes && Array.isArray(attendanceRes)) {
      attendanceRes.forEach((item: any) => {
        let dateKey = item.date ? item.date.split(' ')[0] : ''; 
        if (dateKey && dateKey.split('-')[0].length === 2) {
          dateKey = '20' + dateKey; 
        }
        if(dateKey) {
          attMap[dateKey] = item;
        }
      })
    }
    attendanceMap.value = attMap

  } catch (error) {
    console.error('加载日历数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const getAttendanceData = (dateStr: string) => {
  return attendanceMap.value[dateStr] || null
}

// 【新增方法】：根据打卡结果动态返回不同颜色的 class
const getResultStatusClass = (result: string) => {
  if (!result) return 'text-gray';
  if (result.includes('正常')) return 'text-success';
  if (result.includes('缺卡') || result.includes('迟到') || result.includes('早退') || result.includes('旷工')) return 'text-danger';
  if (result.includes('请假') || result.includes('出差') || result.includes('外勤')) return 'text-warning';
  return 'text-normal'; // 默认颜色
}

const handleDateClick = (data: any) => {
  if (isDisabledDate(data.date)) return;
  
  const dateStr = data.day;
  const dayData = dailyStatusMap.value[dateStr];
  const approved = dayData?.approved || [];
  const pending = dayData?.pending || [];
  const rejectedOrWithdrawn = dayData?.rejectedOrWithdrawn || [];
  const arr = [...approved, ...pending, ...rejectedOrWithdrawn];
  const isEdit = arr.length > 0;
  
  const attData = getAttendanceData(dateStr);
  detailRef.value.open(dateStr, isEdit, arr, attData);
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
    if (systemConfigStore.auditStatus && displayHours > 8) {
      displayHours = 8
    }
    return `生效工时：${displayHours}h`
  }
  return ''
}

const isFutureDate = (cellDate: Date) => {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 1) 
  targetDate.setHours(0, 0, 0, 0)
  return cellDate.getTime() > targetDate.getTime()
}

const isDisabledDate = (cellDate: Date) => {
  if (isFutureDate(cellDate)) return true;
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
    const m = (newDate.getMonth() + 1).toString().padStart(2, '0')
    selectedMonth.value = `${newDate.getFullYear()}-${m}`
    fetchCalendarData()
  }
})
</script>

<style scoped>
.app-container { padding: 20px; }
.card-header { display: flex; justify-content: flex-start; align-items: center; }
.title { font-weight: bold; font-size: 16px; }

.calendar-cell { 
  height: 100%; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  box-sizing: border-box; 
  cursor: pointer; 
  padding: 6px 4px; 
  transition: all 0.25s ease; 
}

.date-text { 
  font-size: 15px; 
  font-weight: 600; 
  flex: 0 0 auto;
  margin-bottom: 2px;
}

/* 状态区域 */
.status-area { 
  flex: 1;
  width: 100%;
  display: flex; 
  flex-direction: column; 
  justify-content: flex-start; 
  align-items: center; 
  gap: 2px; 
}

/* --- 新增：考勤信息样式 --- */
.attendance-info { 
  width: 100%;
  background-color: rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 2px 4px;
  margin-bottom: 2px;
  box-sizing: border-box;
}
.empty-attendance {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 42px;
}

.punch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 11px;
  line-height: 1.4;
}

.time-label {
  color: #606266;
  font-family: monospace; /* 让时间数字等宽，更整齐 */
}

.result-tag {
  font-size: 10px;
  font-weight: bold;
}

/* 动态打卡结果颜色 */
.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }
.text-warning { color: #e6a23c; }
.text-gray { color: #909399; font-weight: normal; }
.text-normal { color: #409eff; }

.duration-str { 
  font-size: 11px; 
  color: #409EFF; 
  font-weight: bold; 
  line-height: 1.4; 
  text-align: center;
  margin-top: 1px;
  border-top: 1px dashed rgba(64,158,255,0.2);
}
/* ------------------------ */

.hours-text { font-size: 12px; font-weight: bold; opacity: 0.9; }
.status-text { font-size: 12px; font-weight: 500; letter-spacing: 0.5px; opacity: 0.85; line-height: 1.2; }

/* 【关键修改】：将日历格子高度调大，确保能放下所有的信息 */
:deep(.el-calendar-table .el-calendar-day) { 
  padding: 0px; 
  height: 135px; /* 加高了高度 */
}
:deep(.el-calendar__header) { display: none; }

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