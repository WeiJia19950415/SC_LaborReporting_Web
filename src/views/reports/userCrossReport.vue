<template>
  <div class="report-container">
    <el-card>
      <template #header>
        <div class="header-toolbar">
          <span class="title">{{ isFinance ? '人员财务工时矩阵表' : '人员有效工时矩阵表' }}</span>
          
          <div class="filters">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 260px"
              :disabled-date="disabledDate"
              @calendar-change="handleCalendarChange"
              @visible-change="handleVisibleChange"
            />
            
            <el-select 
              v-model="queryParams.departmentId" 
              placeholder="选择部门(必填)" 
              clearable 
              style="width: 150px"
            >
              <el-option v-for="dept in deptList" :key="dept.id" :label="dept.fullName" :value="dept.id" />
            </el-select>

            <el-select 
              v-model="queryParams.status" 
              placeholder="审批状态"
              style="width: 130px"
              :disabled="isFinance"
            >
              <el-option label="已审批" :value="3" />
              <el-option label="包含未审批" :value="-1" />
            </el-select>

            <el-button type="primary" icon="Search" @click="fetchData">查询</el-button>
            <el-button icon="Download" @click="exportData">导出</el-button>
          </div>
        </div>
      </template>

      <!-- 💡 移除了 :key="tableKey"，避免大表格 DOM 全量销毁重建引起卡顿 -->
      <el-table 
        v-loading="loading" 
        :data="tableData" 
        border
        style="width: 100%"
        height="850"
      >
        <template #empty>
          <el-empty description="请选择时间范围及部门后查询" />
        </template>
        
        <el-table-column prop="userName" label="人员名称" width="120" fixed="left" align="center" />
        <el-table-column prop="totalSum" label="期间总计" width="100" fixed="left" align="center">
          <template #default="{ row }">
            <strong style="color:#f56c6c">{{ row.totalSum?.toFixed(1) || 0 }}</strong>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-for="dateItem in dateColumns" 
          :key="dateItem.date" 
          :label="dateItem.date.substring(5)" align="center"
        >
          <el-table-column
            v-for="proj in dateItem.projects"
            :key="`${dateItem.date}_${proj.id}`"
            :prop="`${dateItem.date}_${proj.id}`"
            :label="proj.name"
            width="100"
            align="center"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span v-if="row[`${dateItem.date}_${proj.id}`] > 0">
                {{ row[`${dateItem.date}_${proj.id}`].toFixed(1) }}
              </span>
              <span v-else style="color: #dcdfe6">-</span>
            </template>
          </el-table-column>

          <el-table-column v-if="dateItem.projects.length === 0" label="无" width="80" align="center">
             <template #default>
               <span style="color: #dcdfe6">-</span>
             </template>
          </el-table-column>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage ,ElLoading} from 'element-plus';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { getUserCrossReportApi ,exportUserCrossReportApi} from '../../api/report';
import { getDepartmentsApi } from '../../api/department';

const route = useRoute();
const exportLoading = ref(false);
const isFinance = computed(() => route.meta.isFinance === true);

const loading = ref(false);
const dateRange = ref<[string, string]>(['', '']); // 默认不选择日期

// 默认不选择部门 (departmentId: '')
const queryParams = ref({ departmentId: '', status: 3 });

// 字典数据使用 shallowRef
const deptList = shallowRef<any[]>([]);

// 海量表格数据和动态列使用 shallowRef，避免深度 Proxy 劫持导致主线程卡死
const dateColumns = shallowRef<{ date: string, projects: {id: string, name: string}[] }[]>([]);
const tableData = shallowRef<any[]>([]);

// 限制日期的响应式变量
const choiceDate = ref<Date | null>(null);
const minSelectableDate = ref<dayjs.Dayjs | null>(null);
const maxSelectableDate = ref<dayjs.Dayjs | null>(null);

// 处理日历面板点击事件，记录第一次点击的时间
const handleCalendarChange = (val: [Date, Date | null]) => {
  if (val && val[0] && !val[1]) {
    choiceDate.value = val[0];
    // 💡 限制最大可选跨度为 31 天 (包含当天即 32 天)
    minSelectableDate.value = dayjs(val[0]).subtract(31, 'day');
    maxSelectableDate.value = dayjs(val[0]).add(31, 'day');
  } else {
    choiceDate.value = null;
    minSelectableDate.value = null;
    maxSelectableDate.value = null;
  }
};

// 处理日期面板收起事件
const handleVisibleChange = (visible: boolean) => {
  if (!visible) {
    choiceDate.value = null;
    minSelectableDate.value = null;
    maxSelectableDate.value = null;
  }
};

// 禁用超过限制跨度的日期
const disabledDate = (time: Date) => {
  if (!choiceDate.value || !minSelectableDate.value || !maxSelectableDate.value) {
    return false;
  }
  const timeDayjs = dayjs(time);
  return timeDayjs.isBefore(minSelectableDate.value, 'day') || timeDayjs.isAfter(maxSelectableDate.value, 'day');
};

const generateEmptyDateColumns = (start: string, end: string) => {
  const dates = [];
  let current = dayjs(start);
  const last = dayjs(end);
  while (current.isBefore(last) || current.isSame(last, 'day')) {
    dates.push({
      date: current.format('YYYY-MM-DD'),
      projects: []
    });
    current = current.add(1, 'day');
  }
  return dates;
};

const buildMatrixData = (rawData: any[]) => {
  const valKey = isFinance.value ? 'totalFinanceHours' : 'totalHours';
  
  const columns = generateEmptyDateColumns(dateRange.value[0], dateRange.value[1]);
  const dateMap = new Map(columns.map(c => [c.date, c]));
  const userMap = new Map<string, any>();

  // 合并遍历逻辑，一次循环同时构建列和行数据
  rawData.forEach(item => {
    // 1. 构建日期-项目列
    if (dateMap.has(item.dateStr)) {
      const dayObj = dateMap.get(item.dateStr)!;
      if (!dayObj.projects.some((p: any) => p.id === item.projectId)) {
        dayObj.projects.push({ id: item.projectId, name: item.projectName });
      }
    }
    
    // 2. 构建人员行数据
    if (!userMap.has(item.userId)) {
      userMap.set(item.userId, {
        userId: item.userId,
        userName: item.userName,
        totalSum: 0
      });
    }
    const userRow = userMap.get(item.userId);
    
    const cellKey = `${item.dateStr}_${item.projectId}`;
    userRow[cellKey] = (userRow[cellKey] || 0) + item[valKey];
    userRow.totalSum += item[valKey];
  });

  // 使用 shallowRef 只需要直接赋值 .value 即可触发视图更新
  dateColumns.value = columns;
  tableData.value = Array.from(userMap.values());
};

const fetchData = async () => {
  // 💡 优化 1：必填项校验 - 日期
  if (!dateRange.value || dateRange.value.length !== 2 || !dateRange.value[0]) {
    ElMessage.warning('请选择时间范围');
    return;
  }
  
  // 💡 再次防御性校验：日期跨度不得超过32天
  const daysDiff = dayjs(dateRange.value[1]).diff(dayjs(dateRange.value[0]), 'day');
  if (daysDiff > 31) {
    ElMessage.warning('时间范围不能超过32天');
    return;
  }

  // 💡 优化 2：必填项校验 - 部门
  // if (!queryParams.value.departmentId) {
  //   ElMessage.warning('请选择一个部门后再查询');
  //   return;
  // }

  loading.value = true;
  
  try {
    const res: any = await getUserCrossReportApi({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      departmentId: queryParams.value.departmentId, // 必定有值
      status: queryParams.value.status 
    });
    
    buildMatrixData(res || []);
    
  } catch (error) {
    ElMessage.error('拉取报表数据失败');
  } finally {
    loading.value = false;
  }
};

const loadFilters = async () => {
  const deptRes: any = await getDepartmentsApi();
  deptList.value = deptRes.items || [];
};

const exportData = async () => {
  if (!dateRange.value || dateRange.value.length !== 2 || !dateRange.value[0]) {
    ElMessage.warning('请选择时间范围');
    return;
  }
  
  // 防御性校验：日期跨度不得超过32天
  const daysDiff = dayjs(dateRange.value[1]).diff(dayjs(dateRange.value[0]), 'day');
  if (daysDiff > 31) {
    ElMessage.warning('时间范围不能超过32天');
    return;
  }

// 💡 3. 开启全屏遮罩，lock: true 会锁定屏幕禁止滚动和点击操作
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在生成 Excel 文件，数据量较大请耐心等待...',
    background: 'rgba(0, 0, 0, 0.7)', // 半透明黑色背景，让用户明显感觉到页面被冻结
  });
  exportLoading.value = true; // 按钮也进入 loading 状态

  try {
    
    // 调用后端导出接口 
    // ⚠️重要：如果是使用 Axios 封装的请求，请务必在请求配置中加上 responseType: 'blob' 
    const response: any = await exportUserCrossReportApi({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      departmentId: queryParams.value.departmentId, 
      status: queryParams.value.status,
      isFinance: isFinance.value // 传给后端区分是财务工时还是有效工时
    });

    // 解析二进制流为文件下载
    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.style.display = 'none';
    link.href = url;
    
    // 如果后端在 Header (content-disposition) 里带了文件名，你也可以从中解析。
    // 这里采取前端生成文件名的方式：
    const titleName = isFinance.value ? '人员财务工时矩阵表' : '人员有效工时矩阵表';
    const fileName = `${titleName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // 清理 DOM 和 URL 资源
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
    
    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出失败', error);
    ElMessage.error('导出失败，请重试');
  }finally {
    // 💡 4. 无论成功还是失败，最后一定要关闭遮罩并恢复按钮状态
    loadingInstance.close();
    exportLoading.value = false;
  }
};

onMounted(async () => {
  await loadFilters();
  // 💡 优化 3：页面初始化时，不设置默认时间，也不调用 fetchData()，强制用户手动选择条件。
});
</script>

<style scoped>
.header-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: bold;
  font-size: 16px;
}
.filters {
  display: flex;
  gap: 10px;
}
</style>