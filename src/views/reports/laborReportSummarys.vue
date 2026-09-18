<template>
  <div class="app-container">
    <el-card shadow="never">
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="queryParams" class="search-form" style="margin-bottom: 15px;">
        <el-form-item label="填报区间">
          <el-date-picker
            v-model="dateRange"
            type="monthrange"
            range-separator="至"
            start-placeholder="开始月份"
            end-placeholder="结束月份"
            value-format="YYYY-MM"
            @change="handleQuery"
            style="width: 240px;"
          />
        </el-form-item>
        
        <el-form-item label="模糊查询">
          <el-input
            v-model="queryParams.filter"
            placeholder="支持姓名、工号"
            clearable
            @clear="handleQuery"
            @keyup.enter="handleQuery"
            style="width: 200px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          <el-button type="success" icon="Download" @click="handleExport" :loading="exportLoading">导出Excel</el-button>
        </el-form-item>
      </el-form>

      <!-- 报表表格 -->
      <el-table :data="tableData" border v-loading="loading" style="width: 100%" height="calc(100vh - 220px)">
        <!-- 固定的左侧列 -->
        <el-table-column prop="month" label="月份" width="100" align="center" fixed="left" />
        <el-table-column prop="jobNumber" label="员工编号" width="120" align="center" fixed="left" />
        <el-table-column prop="departmentName" label="所在部门" width="150" show-overflow-tooltip fixed="left" />
        <el-table-column prop="name" label="姓名" width="100" align="center" fixed="left" />

        <!-- 动态的研发项目列（分组展示） -->
        <el-table-column label="研发活动" align="center" v-if="dynamicProjects.length > 0">
          <el-table-column 
            v-for="proj in dynamicProjects" 
            :key="proj.projectCode" 
            :label="`${proj.projectName} (${proj.projectCode})`" 
            min-width="150" 
            align="center"
          >
            <template #default="{ row }">
              {{ row.projectHours[proj.projectCode] || '-' }}
            </template>
          </el-table-column>
        </el-table-column>
        
        <el-table-column v-else label="研发活动" align="center" min-width="150">
          <template #default>暂无项目报工</template>
        </el-table-column>

        <!-- 固定的右侧汇总列 -->
        <el-table-column prop="productionHours" label="生产活动" width="100" align="center">
          <template #default="{ row }">{{ row.productionHours || '-' }}</template>
        </el-table-column>
        <el-table-column prop="salesHours" label="销售活动" width="100" align="center">
          <template #default="{ row }">{{ row.salesHours || '-' }}</template>
        </el-table-column>
        <el-table-column prop="managementHours" label="管理活动" width="100" align="center">
          <template #default="{ row }">{{ row.managementHours || '-' }}</template>
        </el-table-column>
        
        <el-table-column prop="totalHours" label="合计" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <span style="font-weight: bold; color: #409eff;">{{ row.totalHours || '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getLaborSummaryReport, exportLaborSummaryReport } from '../../api/report';

const loading = ref(false);
const exportLoading = ref(false);

const dateRange = ref<[string, string]>([]);
const queryParams = reactive({
  startMonth: '',
  endMonth: '',
  filter: ''
});

const tableData = ref<any[]>([]);
const dynamicProjects = ref<any[]>([]);

const handleQuery = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    queryParams.startMonth = dateRange.value[0];
    queryParams.endMonth = dateRange.value[1];
  } else {
    queryParams.startMonth = '';
    queryParams.endMonth = '';
  }
  fetchData();
};

const resetQuery = () => {
  dateRange.value = [];
  queryParams.startMonth = '';
  queryParams.endMonth = '';
  queryParams.filter = '';
  fetchData();
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getLaborSummaryReport(queryParams);
    // 后端返回的结果包含了动态项目头 (projects) 和数据行 (rows)
    dynamicProjects.value = res.projects || [];
    tableData.value = res.rows || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('获取报表数据失败');
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  exportLoading.value = true;
  try {
    const blob = await exportLaborSummaryReport(queryParams);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `工时汇总报表_${new Date().getTime()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  } finally {
    exportLoading.value = false;
  }
};

onMounted(() => {
  // 默认查询当年当月
  const current = new Date();
  const m = (current.getMonth() + 1).toString().padStart(2, '0');
  const cm = `${current.getFullYear()}-${m}`;
  dateRange.value = [cm, cm];
  handleQuery();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.search-form {
  display: flex;
  align-items: center;
}
</style>