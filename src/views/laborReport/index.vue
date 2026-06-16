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
import { getLaborReports } from '../../api/laborReport' 
import { useUserStore } from '../../stores/user'       

const locale = zhCn
const loading = ref(false)
const currentDate = ref(new Date())

interface DayStatusSnapshot {
  approved: string[]
  pending: string[]
  rejectedOrWithdrawn: string[]
  totalHours: number
}
const dailyStatusMap = ref<Record<string, DayStatusSnapshot>>({})

onMounted(() => {
  fetchCalendarData()
})

const fetchCalendarData = async () => {
    
  const userStore = useUserStore()
  const currentUserId = userStore.userInfo?.id || userStore.id 
  if (!currentUserId) {
    console.error('未获取到当前登录用户信息')
    return
  }

  try {
    loading.value = true
    const res = await getLaborReports({ reporterId: currentUserId })
    processReportData(res || [])
  } catch (error) {
    console.error('加载工时标记失败:', error)
  } finally {
    loading.value = false
  }
}

const processReportData = (items: any[]) => {
  const map: Record<string, DayStatusSnapshot> = {}

  items.forEach(item => {
    const dateStr = item.reportDate ? item.reportDate.split('T')[0] : ''
    if (!dateStr) return

    if (!map[dateStr]) {
      map[dateStr] = {
        approved: [],
        pending: [],
        rejectedOrWithdrawn: [],
        totalHours: 0
      }
    }

    if (item.status === 3) {
      map[dateStr].approved.push(item.detailId)
      map[dateStr].totalHours += item.hours 
    } else if (item.status === 0) {
      map[dateStr].pending.push(item.detailId)
    } else if (item.status === 1 || item.status === 2) {
      map[dateStr].rejectedOrWithdrawn.push(item.detailId)
    }
  })

  dailyStatusMap.value = map
}

// 决定每一格颜色的 Class
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

// 【核心新增逻辑】：根据优先级获取对应的中文状态文本
const getDayStatusText = (dateStr: string) => {
  const dayData = dailyStatusMap.value[dateStr]

  // 1. 无记录 -> 未报工
  if (!dayData || (dayData.approved.length === 0 && dayData.pending.length === 0 && dayData.rejectedOrWithdrawn.length === 0)) {
    return '未报工'
  }
  // 2. 有退回或撤回明细 -> 优先级最高，提示需要处理
  if (dayData.rejectedOrWithdrawn.length > 0) {
    return '退回/撤回'
  }
  // 3. 有正在审批中的明细
  if (dayData.pending.length > 0) {
    return '审批中'
  }
  // 4. 全部审批通过
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
  console.log('用户点击了日期:', data.day, '当前状态:', getDayStatusText(data.day))
}

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

/* ================= 日历方格基础配置 ================= */
.calendar-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center; 
  box-sizing: border-box;
  cursor: pointer;
  /* 稍微增加底部 padding，让文字显示得更舒服 */
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

/* 状态容器，利用 Flex 贴底对齐 */
.status-area {
  min-height: 38px; /* 调高高度，以容纳时长和文字两行内容 */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
}

/* 工时时长样式 */
.hours-text {
  font-size: 13px;
  font-weight: bold;
  opacity: 0.9;
}

/* 【本次新增】：底部状态文字的专属样式 */
.status-text {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px; /* 增加一点字间距，提升中文辨识度 */
  opacity: 0.85;         /* 微调透明度，使数字日期仍是视觉主焦点 */
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

/* ================= 状态颜色映射 (文字会自动继承这里的 color) ================= */

/* 1. 未报工 (红底红字) */
.status-no-report {
  background-color: #fee2e2 !important;
  color: #dc2626;
}
.status-no-report:hover {
  background-color: #fca5a5 !important;
}

/* 2. 退回、撤回 (极淡的粉红底，浅红字) */
.status-rejected-withdrawn {
  background-color: #fff5f5 !important;
  color: #f87171;
}
.status-rejected-withdrawn:hover {
  background-color: #fee2e2 !important;
}

/* 3. 审批中 (浅黄底，暖橙字) */
.status-pending {
  background-color: #fdf6ec !important;
  color: #e6a23c;
}
.status-pending:hover {
  background-color: #f5dab1 !important;
}

/* 4. 已报工 (浅绿底，绿字) */
.status-approved {
  background-color: #f0f9eb !important;
  color: #67c23a;
}
.status-approved:hover {
  background-color: #c2e7b0 !important;
}

/* 禁用状态（未来日期） */
.is-disabled {
  cursor: not-allowed;          
  background-color: #f5f7fa !important;    
  color: #c0c4cc !important;               
}
.is-disabled:hover {
  background-color: #f5f7fa !important;
}
.is-disabled .date-text.is-today {
  color: #c0c4cc; 
}
</style>