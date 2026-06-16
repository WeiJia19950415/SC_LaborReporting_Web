<template>
  <div class="app-container" v-loading="loading">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="title">我的工时填报</span>
          <div class="actions">
            <el-button type="primary" plain size="small">本月汇总</el-button>
          </div>
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
                isFutureDate(data.date) ? 'is-disabled' : getDayDisplayStatus(data.day)
              ]"
              @click="handleDateClick(data)"
            >
              <div class="date-text" :class="{ 'is-today': data.isSelected && !isFutureDate(data.date) }">
                {{ data.day.split('-')[2] }}
              </div>
              
              <div class="status-area">
                <template v-if="!isFutureDate(data.date)">
                  <span class="hours-text" v-if="getDayHoursText(data.day)">
                    {{ getDayHoursText(data.day) }}
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
import { getCalendarStatus } from '../../api/laborReport' // 🌟 引入新接口
import { ElMessage } from 'element-plus'

const locale = zhCn
const loading = ref(false)
const currentDate = ref(new Date())

// 本地存放后端处理好的数据
const dailyStatusMap = ref<Record<string, any>>({})

onMounted(() => {
  fetchCalendarData()
})

// 🌟 核心算法：获取当前日历面板中“能看到的”最小日期和最大日期
const getCalendarDateRange = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  
  // 获取当月第一天，并前推 15 天（覆盖上个月在日历第一行露出的灰色天数）
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay.getTime() - 15 * 24 * 60 * 60 * 1000)
  
  // 获取当月最后一天，并往后推 15 天（覆盖下个月在日历最后一行露出的灰色天数）
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
    // 🌟 请求后端，只需传日期区间，后端会自动根据当前请求头解析登录人
    const res: any = await getCalendarStatus(startDate, endDate)
    
    // 直接将后端返回的结果转化为键值对形式，方便页面极速渲染
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

// 判定格子颜色（优先级：退回/撤回 > 审批中 > 已报工 > 未报工）
const getDayDisplayStatus = (dateStr: string) => {
  const dayData = dailyStatusMap.value[dateStr]
  if (!dayData || (dayData.approved.length === 0 && dayData.pending.length === 0 && dayData.rejectedOrWithdrawn.length === 0)) {
    return 'status-no-report' 
  }
  if (dayData.rejectedOrWithdrawn.length > 0) {
    return 'status-rejected-withdrawn' 
  }
  if (dayData.pending.length > 0) {
    return 'status-pending' 
  }
  if (dayData.approved.length > 0) {
    return 'status-approved' 
  }
  return 'status-no-report'
}

// 判定文字状态
const getDayStatusText = (dateStr: string) => {
  const dayData = dailyStatusMap.value[dateStr]
  if (!dayData || (dayData.approved.length === 0 && dayData.pending.length === 0 && dayData.rejectedOrWithdrawn.length === 0)) {
    return '未报工'
  }
  if (dayData.rejectedOrWithdrawn.length > 0) {
    return '退回/撤回'
  }
  if (dayData.pending.length > 0) {
    return '审批中'
  }
  if (dayData.approved.length > 0) {
    return '已报工'
  }
  return '未报工'
}

const getDayHoursText = (dateStr: string) => {
  const dayData = dailyStatusMap.value[dateStr]
  return dayData && dayData.totalHours > 0 ? `${dayData.totalHours}h` : ''
}

const isFutureDate = (cellDate: Date) => {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 1) 
  targetDate.setHours(0, 0, 0, 0)
  return cellDate.getTime() > targetDate.getTime()
}

const handleDateClick = (data: any) => {
  if (isFutureDate(data.date)) return 
  
  const dayData = dailyStatusMap.value[data.day]
  console.log(`用户点击了 ${data.day}。当天数据：`, dayData || '暂无数据')
  // TODO: 后续在这里打开填报抽屉，并将 dayData 中的各种 IDs 传过去
}

// 🌟 监听日历年月变化：每次切换“上个月/下个月/今天”时，重新计算边界并拉取数据
watch(currentDate, (newDate, oldDate) => {
  if (!oldDate || newDate.getFullYear() !== oldDate.getFullYear() || newDate.getMonth() !== oldDate.getMonth()) {
    fetchCalendarData()
  }
})
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: bold;
  font-size: 16px;
}
.calendar-top-legend {
  display: flex;
  justify-content: flex-end; 
  gap: 10px;                 
  margin-bottom: 12px;       
  padding-right: 4px;        
}
.legend-item {
  font-weight: 500;
  cursor: default;           
}
.custom-withdrawn {
  background-color: #fff5f5;
  border-color: #fee2e2;
  color: #f87171;
}
.calendar-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center; 
  box-sizing: border-box;
  cursor: pointer;
  padding: 8px 4px 6px 4px; 
  transition: all 0.25s ease;
}
.date-text {
  font-size: 16px; 
  font-weight: 600; 
  flex: 1; 
  display: flex;
  align-items: center; 
  justify-content: center; 
}
.status-area {
  min-height: 38px; 
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
}
.hours-text {
  font-size: 13px;
  font-weight: bold;
  opacity: 0.9;
}
.status-text {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px; 
  opacity: 0.85;         
  line-height: 1.2;
}
:deep(.el-calendar-table .el-calendar-day) {
  padding: 0px; 
  height: 100px; 
}
.is-today {
  color: var(--el-color-primary);
  text-decoration: underline;
}

/* 优先级1：未报工 */
.status-no-report {
  background-color: #fee2e2 !important;
  color: #dc2626;
}
.status-no-report:hover { background-color: #fca5a5 !important; }

/* 优先级2：退回、撤回 */
.status-rejected-withdrawn {
  background-color: #fff5f5 !important;
  color: #f87171;
}
.status-rejected-withdrawn:hover { background-color: #fee2e2 !important; }

/* 优先级3：审批中 */
.status-pending {
  background-color: #fdf6ec !important;
  color: #e6a23c;
}
.status-pending:hover { background-color: #f5dab1 !important; }

/* 优先级4：已报工 */
.status-approved {
  background-color: #f0f9eb !important;
  color: #67c23a;
}
.status-approved:hover { background-color: #c2e7b0 !important; }

/* 禁用状态（未来日期） */
.is-disabled {
  cursor: not-allowed;          
  background-color: #f5f7fa !important;    
  color: #c0c4cc !important;               
}
.is-disabled:hover { background-color: #f5f7fa !important; }
.is-disabled .date-text.is-today { color: #c0c4cc; }
</style>