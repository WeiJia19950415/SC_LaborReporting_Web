<template>
  <div class="mobile-calendar-report">
    <van-nav-bar title="工时填报" fixed placeholder />

    <!-- 顶部状态图例 -->
    <div class="legend-container">
      <van-tag type="success" plain>已报工</van-tag>
      <van-tag type="warning" plain>审批中</van-tag>
      <van-tag type="danger" plain>退回/撤回</van-tag>
      <van-tag color="#dc2626">未报工</van-tag>
    </div>

    <!-- 移动端平铺日历 -->
    <!-- 移除了会导致死循环的 van-skeleton，直接暴露日历组件 -->
    <van-calendar
      title="工时日历"
      :poppable="false"
      :show-confirm="false"
      :min-date="minDate"
      :max-date="maxDate"
      :default-date="currentDate"
      :formatter="dayFormatter"
      class="custom-calendar mt-4"
      @select="onSelectDate"
      @month-show="onMonthShow"
    />

    <!-- 底部操作说明 -->
    <van-notice-bar
      class="mt-4"
      left-icon="info-o"
      text="点击日历上的具体日期即可进行工时填报与修改。"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
// 引入全局轻提示
import { showToast, showLoadingToast, closeToast } from 'vant'; 
import { getCalendarStatus } from '../../../api/laborReport'; 
import { useSystemConfigStore } from '../../../stores/systemConfig';

const router = useRouter();
const systemConfigStore = useSystemConfigStore();

// 日历配置边界
// 限制的最小允许日期：2026年8月1日 (注意：Date中月份从0开始，7代表8月)
const MIN_ALLOWED_DATE = new Date(2026, 7, 1);
const minDate = ref(MIN_ALLOWED_DATE);
// 默认最大可以选择到明天
const maxDate = ref(new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
const currentDate = ref(new Date());

// 本地存放后端处理好的数据
const dailyStatusMap = ref<Record<string, any>>({});

// 【核心机制】：缓存池，记录已经请求过的月份，彻底切断死循环和重复请求
const loadedMonths = new Set<string>();

onMounted(() => {
  // 如果当前时间早于2026年8月，强制重置为2026年8月1日
  if (currentDate.value.getTime() < MIN_ALLOWED_DATE.getTime()) {
    currentDate.value = new Date(2026, 7, 1);
  }
  // 初次进入不需要手动调用 fetchCalendarData，
  // 因为 van-calendar 挂载时会自动触发 @month-show 事件，进而拉取数据
});

// 获取某个月份的起始和结束日期字符串（前后多查 15 天防止边界留白）
const getCalendarDateRange = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay.getTime() - 15 * 24 * 60 * 60 * 1000);
  const lastDay = new Date(year, month + 1, 0);
  const endDate = new Date(lastDay.getTime() + 15 * 24 * 60 * 60 * 1000);
  
  const format = (d: Date) => {
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  return { startDate: format(startDate), endDate: format(endDate) };
};

// 拉取后端日历数据
const fetchCalendarData = async (targetDate: Date) => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const monthKey = `${year}-${month}`; // 例如 '2026-8'

  // 防火墙：如果这个月的数据已经加载过，直接打断返回
  if (loadedMonths.has(monthKey)) {
    return;
  }

  const { startDate, endDate } = getCalendarDateRange(targetDate);
  
  try {
    // 采用不销毁 DOM 的轻提示
    showLoadingToast({
      message: '加载数据中...',
      forbidClick: true,
      duration: 0 // 持续展示，直到手动关闭
    });

    const res: any = await getCalendarStatus(startDate, endDate);
    const map: Record<string, any> = {};
    
    if (res && Array.isArray(res)) {
      res.forEach(item => {
        map[item.date] = {
          approved: item.approvedDetailIds || [],
          pending: item.pendingDetailIds || [],
          rejectedOrWithdrawn: item.rejectedOrWithdrawnDetailIds || [],
          totalHours: item.totalEffectiveHours || 0
        };
      });
    }
    
    // 【关键】：将新获取的数据合并到原来的记录里，防止老月份数据被清空
    dailyStatusMap.value = { ...dailyStatusMap.value, ...map };
    
    // 标记这个月已经加载成功，存入缓存池
    loadedMonths.add(monthKey);

  } catch (error) {
    console.error('加载日历数据失败:', error);
    showToast('加载工时数据失败');
  } finally {
    closeToast(); // 请求结束，关闭提示
  }
};

// 监听 Vant 日历滑动切换月份的事件
const onMonthShow = (info: { date: Date; title: string }) => {
  // 当用户滑动到新的月份时，去尝试请求数据
  fetchCalendarData(info.date);
};

// =================== 核心业务逻辑判断 ===================

const isFutureDate = (cellDate: Date) => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 1); 
  targetDate.setHours(0, 0, 0, 0);
  return cellDate.getTime() > targetDate.getTime();
};

const isDisabledDate = (cellDate: Date) => {
  // 最小日期限制
  if (cellDate.getTime() < MIN_ALLOWED_DATE.getTime()) return true;
  // 未来的日期直接禁用
  if (isFutureDate(cellDate)) return true;
  
  // 周末禁用逻辑（依赖后端的配置）
  if (systemConfigStore.auditStatus) {
    const dayOfWeek = cellDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }
  }
  return false;
};

// 格式化 Vant 日历单元格
const dayFormatter = (day: any) => {
  const cellDate = day.date;
  const m = (cellDate.getMonth() + 1).toString().padStart(2, '0');
  const d = cellDate.getDate().toString().padStart(2, '0');
  const dateStr = `${cellDate.getFullYear()}-${m}-${d}`;

  // 1. 判断是否禁用
  if (isDisabledDate(cellDate)) {
    day.type = 'disabled';
    return day;
  }

  // 2. 根据数据注入状态
  const dayData = dailyStatusMap.value[dateStr];
  
  if (!dayData || (dayData.approved.length === 0 && dayData.pending.length === 0 && dayData.rejectedOrWithdrawn.length === 0)) {
    day.bottomInfo = '未报工';
    day.className = 'cell-no-report';
    return day;
  }

  // 3. 计算生效工时 (如果有)
  let hoursText = '';
  if (dayData.totalHours > 0) {
    let displayHours = dayData.totalHours;
    if (systemConfigStore.auditStatus && displayHours > 8) displayHours = 8;
    hoursText = `${displayHours}h`;
  }

  // 4. 状态判断注入
  if (dayData.rejectedOrWithdrawn.length > 0) {
    day.bottomInfo = '退回';
    day.topInfo = hoursText;
    day.className = 'cell-rejected';
  } else if (dayData.pending.length > 0) {
    day.bottomInfo = '审批中';
    day.topInfo = hoursText;
    day.className = 'cell-pending';
  } else if (dayData.approved.length > 0) {
    day.bottomInfo = '已报工';
    day.topInfo = hoursText;
    day.className = 'cell-approved';
  }

  return day;
};

// =================== 点击操作 ===================

const onSelectDate = (date: Date) => {
  if (isDisabledDate(date)) {
    showToast('当前日期不可报工');
    return;
  }

  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${m}-${d}`;

  const dayData = dailyStatusMap.value[dateStr];
  const approved = dayData?.approved || [];
  const pending = dayData?.pending || [];
  const rejectedOrWithdrawn = dayData?.rejectedOrWithdrawn || [];
  const arr = [...approved, ...pending, ...rejectedOrWithdrawn];
  
  // 根据是否包含已有记录，作为判断传给详情页
  const isEdit = arr.length > 0;
  
  // 携带日期和记录ID跳转到移动端填报详情页
  router.push({
    path: '/mobile/laborReport/detail',
    query: {
      date: dateStr,
      isEdit: isEdit ? '1' : '0',
      ids: JSON.stringify(arr)
    }
  });
};
</script>

<style scoped>
.mobile-calendar-report {
  min-height: 100vh;
  background-color: #f7f8fa;
}
.legend-container {
  display: flex;
  justify-content: space-around;
  background-color: #fff;
  padding: 10px;
  border-bottom: 1px solid #ebedf0;
}
.mt-4 {
  margin-top: 16px;
}

/* 控制平铺日历的高度 */
.custom-calendar {
  height: 520px; 
}

/* 单元格状态样式：使用深层选择器穿透 Vant 组件 */
:deep(.cell-no-report) {
  background-color: #fee2e2;
  color: #dc2626;
}
:deep(.cell-no-report .van-calendar__bottom-info) {
  color: #dc2626;
}

:deep(.cell-rejected) {
  background-color: #fff5f5;
  color: #f87171;
}
:deep(.cell-rejected .van-calendar__bottom-info) {
  color: #f87171;
}

:deep(.cell-pending) {
  background-color: #fdf6ec;
  color: #e6a23c;
}
:deep(.cell-pending .van-calendar__bottom-info) {
  color: #e6a23c;
}

:deep(.cell-approved) {
  background-color: #f0f9eb;
  color: #67c23a;
}
:deep(.cell-approved .van-calendar__bottom-info) {
  color: #67c23a;
}

/* 调整工时字体显示位置和大小 */
:deep(.van-calendar__top-info) {
  font-size: 11px;
  font-weight: bold;
}

/* 优化被禁用日期的文字颜色 */
:deep(.van-calendar__day--disabled) {
  color: #c8c9cc;
}
</style>