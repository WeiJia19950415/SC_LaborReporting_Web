<template>
  <div class="report-container">
    <el-card>
      <template #header>
        <div class="header-toolbar">
          <span class="title">{{ isFinance ? '人员财务工时矩阵表' : '人员有效工时矩阵表' }}</span>
          
          <div class="filters">
            <!-- 💡 修改点 1：增加 disabled-date 属性及两个日历事件，用于限制一个月时长 -->
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
              @change="fetchData"
            />
            
            <el-select 
              v-model="queryParams.departmentId" 
              placeholder="选择部门" 
              clearable 
              style="width: 130px"
              @change="fetchData"
            >
              <el-option v-for="dept in deptList" :key="dept.id" :label="dept.fullName" :value="dept.id" />
            </el-select>

            <el-select 
              v-model="queryParams.userId" 
              placeholder="搜索人员" 
              clearable 
              filterable 
              style="width: 130px"
              @change="fetchData"
            >
              <el-option v-for="user in userList" :key="user.id" :label="user.name" :value="user.id" />
            </el-select>

            <el-select 
              v-model="queryParams.status" 
              placeholder="审批状态"
              style="width: 130px"
              @change="fetchData"
            >
              <el-option label="已审批" :value="3" />
              <el-option label="包含未审批" :value="-1" />
            </el-select>

            <el-button type="primary" icon="Search" @click="fetchData">查询</el-button>
            <el-button icon="Download" @click="exportData">导出</el-button>
          </div>
        </div>
      </template>

      <el-table 
        :key="tableKey"
        v-loading="loading" 
        :data="tableData" 
        border
        style="width: 100%"
        height="850"
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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { getUserCrossReportApi } from '../../api/report';
import { getDepartmentsApi } from '../../api/department';
import { getUsersApi } from '../../api/user';

const route = useRoute();

const isFinance = computed(() => route.meta.isFinance === true);

const loading = ref(false);
const dateRange = ref<[string, string]>(['', '']);

const queryParams = ref({ departmentId: '', userId: '', status: 3 });

const deptList = ref<any[]>([]);
const userList = ref<any[]>([]);

const dateColumns = ref<{ date: string, projects: {id: string, name: string}[] }[]>([]);
const tableData = ref<any[]>([]);
const tableKey = ref(Date.now());

// 💡 修改点 2：新增用于限制日期的响应式变量
const choiceDate = ref<Date | null>(null);
const minSelectableDate = ref<dayjs.Dayjs | null>(null);
const maxSelectableDate = ref<dayjs.Dayjs | null>(null);

// 💡 修改点 3：处理日历面板点击事件，记录第一次点击的时间
const handleCalendarChange = (val: [Date, Date | null]) => {
  // val 是一个数组，如果用户只点了一下，val[1] 会是 null
  if (val && val[0] && !val[1]) {
    choiceDate.value = val[0];
    // 计算允许选择的前后一个月边界，避免在 disabledDate 里高频重复计算影响性能
    minSelectableDate.value = dayjs(val[0]).subtract(1, 'month');
    maxSelectableDate.value = dayjs(val[0]).add(1, 'month');
  } else {
    // 选完完整的起止时间后，重置
    choiceDate.value = null;
    minSelectableDate.value = null;
    maxSelectableDate.value = null;
  }
};

// 💡 修改点 4：处理日期面板收起事件，避免用户点了一下就关掉导致状态残留
const handleVisibleChange = (visible: boolean) => {
  if (!visible) {
    choiceDate.value = null;
    minSelectableDate.value = null;
    maxSelectableDate.value = null;
  }
};

// 💡 修改点 5：禁用超过一个月的日期
const disabledDate = (time: Date) => {
  if (!choiceDate.value || !minSelectableDate.value || !maxSelectableDate.value) {
    return false; // 如果还没有选择第一个日期，所有日期都可选
  }
  const timeDayjs = dayjs(time);
  return timeDayjs.isBefore(minSelectableDate.value, 'day') || timeDayjs.isAfter(maxSelectableDate.value, 'day');
};

// 💡 修改点 6：修改默认日期算法：上周一 至 本周日
const calculateDefaultDates = () => {
  const now = dayjs();
  // 获取今天是周几 (dayjs里周日是0，我们将它转换成周日是7方便计算)
  const dayOfWeek = now.day() === 0 ? 7 : now.day();
  
  // 上周一：当前时间往前推算 (今天星期数 - 1 + 7天)
  const startDate = now.subtract(dayOfWeek - 1 + 7, 'day');
  // 本周日：当前时间往后推算 (7天 - 今天星期数)
  const endDate = now.add(7 - dayOfWeek, 'day');

  dateRange.value = [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')];
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

  rawData.forEach(item => {
    if (dateMap.has(item.dateStr)) {
      const dayObj = dateMap.get(item.dateStr)!;
      if (!dayObj.projects.find((p: any) => p.id === item.projectId)) {
        dayObj.projects.push({ id: item.projectId, name: item.projectName });
      }
    }
  });
  dateColumns.value = columns;

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
      userId: queryParams.value.userId || null,
      status: queryParams.value.status 
    });
    
    buildMatrixData(res || []);
    tableKey.value = Date.now();
    
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
  if (!tableData.value || tableData.value.length === 0) {
    ElMessage.warning('当前没有数据可供导出');
    return;
  }
  const headerRow = ['人员名称', '期间总计'];
  dateColumns.value.forEach(dateItem => {
    const dateStr = dateItem.date.substring(5);
    if (dateItem.projects.length === 0) {
      headerRow.push(`${dateStr} (无)`);
    } else {
      dateItem.projects.forEach(proj => {
        headerRow.push(`${dateStr} - ${proj.name}`);
      });
    }
  });
  const dataRows: any[][] = [];
  tableData.value.forEach(row => {
    const rowData = [
      row.userName, 
      row.totalSum ? Number(row.totalSum.toFixed(1)) : 0
    ];
    dateColumns.value.forEach(dateItem => {
      if (dateItem.projects.length === 0) {
        rowData.push('-');
      } else {
        dateItem.projects.forEach(proj => {
          const val = row[`${dateItem.date}_${proj.id}`];
          rowData.push(val > 0 ? Number(val.toFixed(1)) : '-');
        });
      }
    });
    dataRows.push(rowData);
  });
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const wscols = [{ wch: 15 }, { wch: 10 }]; 
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isFinance.value ? '财务工时矩阵' : '有效工时矩阵');
  const titleName = isFinance.value ? '人员财务工时矩阵表' : '人员有效工时矩阵表';
  const fileName = `${titleName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  
  XLSX.writeFile(workbook, fileName);
  ElMessage.success('导出成功');
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