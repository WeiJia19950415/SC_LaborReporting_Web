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
              @change="fetchData"
            />
            
            <el-select 
              v-model="queryParams.departmentId" 
              placeholder="选择部门" 
              clearable 
              style="width: 150px"
              @change="fetchData"
            >
              <el-option v-for="dept in deptList" :key="dept.id" :label="dept.fullName" :value="dept.id" />
            </el-select>

            <el-select 
              v-model="queryParams.userId" 
              placeholder="搜索人员" 
              clearable 
              filterable 
              style="width: 150px"
              @change="fetchData"
            >
              <el-option v-for="user in userList" :key="user.id" :label="user.name" :value="user.id" />
            </el-select>

            <el-button type="primary" icon="Search" @click="fetchData">查询</el-button>
            <el-button icon="Download" @click="exportData">导出</el-button>
          </div>
        </div>
      </template>

      <el-table 
        v-loading="loading" 
        :data="tableData" 
        border
        style="width: 100%"
        height="600"
      >
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
            :key="proj.id"
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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import { getUserCrossReportApi } from '../../api/report';
import { getDepartmentsApi } from '../../api/department';
import { getUsersApi } from '../../api/user';
import { useSystemConfigStore } from '../../stores/systemConfig';

const route = useRoute();
const configStore = useSystemConfigStore();

// 💡 核心区分：是否为财务数据
const isFinance = computed(() => route.meta.isFinance === true);

const loading = ref(false);
const dateRange = ref<[string, string]>(['', '']);
const queryParams = ref({ departmentId: '', userId: '' });

const deptList = ref<any[]>([]);
const userList = ref<any[]>([]);

// 构建表格使用的结构
const dateColumns = ref<{ date: string, projects: {id: string, name: string}[] }[]>([]);
const tableData = ref<any[]>([]);

// 1. 初始化默认时间：上月配置起点 ～ 当月配置截至点
const calculateDefaultDates = () => {
  const startDay = configStore.attendanceStartDate;
  const endDay = configStore.attendanceEndDate;
  const lastMonth = dayjs().subtract(1, 'month').startOf('month'); 
  const maxDaysInLastMonth = lastMonth.daysInMonth();
  const startDate = lastMonth.date(Math.min(startDay, maxDaysInLastMonth));
  const thisMonth = dayjs().startOf('month');
  const maxDaysInThisMonth = thisMonth.daysInMonth();
  const endDate = thisMonth.date(Math.min(endDay, maxDaysInThisMonth));

  dateRange.value = [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')];
};

// 2. 生成连续的日期列并初始化
const generateEmptyDateColumns = (start: string, end: string) => {
  const dates = [];
  let current = dayjs(start);
  const last = dayjs(end);
  while (current.isBefore(last) || current.isSame(last, 'day')) {
    dates.push({
      date: current.format('YYYY-MM-DD'),
      projects: [] // 稍后用后端数据填充
    });
    current = current.add(1, 'day');
  }
  return dates;
};

// 3. 构建矩阵数据
const buildMatrixData = (rawData: any[]) => {
  const valKey = isFinance.value ? 'totalFinanceHours' : 'totalHours';
  
  // A. 重置日期列
  const columns = generateEmptyDateColumns(dateRange.value[0], dateRange.value[1]);
  const dateMap = new Map(columns.map(c => [c.date, c]));

  // B. 解析每天发生过的项目 (去重)
  rawData.forEach(item => {
    if (dateMap.has(item.dateStr)) {
      const dayObj = dateMap.get(item.dateStr)!;
      if (!dayObj.projects.find((p: any) => p.id === item.projectId)) {
        dayObj.projects.push({ id: item.projectId, name: item.projectName });
      }
    }
  });
  dateColumns.value = columns;

  // C. 组装 Y轴 用户行数据
  const userMap = new Map<string, any>();
  rawData.forEach(item => {
    if (!userMap.has(item.userId)) {
      userMap.set(item.userId, {
        userId: item.userId,
        userName: item.userName,
        totalSum: 0
      });
    }
    const userRow = userMap.get(item.userId);
    
    // 动态 key，格式如：2026-06-01_1234abcd
    const cellKey = `${item.dateStr}_${item.projectId}`;
    userRow[cellKey] = (userRow[cellKey] || 0) + item[valKey];
    userRow.totalSum += item[valKey];
  });

  tableData.value = Array.from(userMap.values());
};

const fetchData = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) return;
  loading.value = true;
  
  try {
    const res: any = await getUserCrossReportApi({
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      departmentId: queryParams.value.departmentId || null,
      userId: queryParams.value.userId || null
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
  const userRes: any = await getUsersApi();
  userList.value = userRes.items || [];
};

const exportData = () => {
  ElMessage.warning('导出功能可接入后续实现');
};

onMounted(async () => {
  await loadFilters();
  calculateDefaultDates();
  fetchData();
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