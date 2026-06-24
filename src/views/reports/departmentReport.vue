<template>
  <div class="department-report-container">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :clearable="false"
            style="width: 320px;"
          />
        </el-form-item>
        <el-form-item label="审批状态">
          <el-select v-model="queryParams.includeUnapproved" style="width: 160px;">
            <el-option label="已审批" :value="false" />
            <el-option label="包含未审批" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="chart-card">
      <div class="chart-header">
        <span class="chart-title">{{ chartLevel === 1 ? '项目工时统计' : '任务分类工时统计' }}</span>
        <el-button v-show="chartLevel === 2" type="primary" plain size="small" @click="returnToLevel1">返回上一层</el-button>
      </div>
      <div ref="chartRef" style="width: 100%; height: 400px;"></div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="table-header">
        <span>明细数据</span>
        <el-button type="success" @click="handleExport" :loading="exportLoading">导出Excel</el-button>
      </div>
      <el-table :data="tableData" border v-loading="tableLoading" style="width: 100%; margin-top: 15px;">
        <el-table-column prop="laborClass" label="工时类别" width="100" />
        <el-table-column prop="projectName" label="关联项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="关联项目编号" width="120" />
        <el-table-column prop="projectRoleName" label="项目角色" width="120" />
        <el-table-column prop="reporterName" label="填报人" width="100" />
        <el-table-column prop="departmentFullName" label="填报人所在部门全称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="laborCategoryFullName" label="任务分类" min-width="200" show-overflow-tooltip />
        <el-table-column prop="jobresponsibilities" label="工作描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="hours" label="申报工时" width="90" align="center" />
        <el-table-column prop="status" label="申报状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 3 ? 'success' : (row.status === 0 ? 'warning' : 'info')">
              {{ row.status === 3 ? '已审批' : (row.status === 0 ? '审批中' : '未知') }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.skipCount"
          v-model:page-size="queryParams.maxResultCount"
          :total="totalCount"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchTableData"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getDepartmentChart, getDepartmentTable, exportDepartmentTable } from '../../api/report'
import { ElMessage } from 'element-plus'

const dateRange = ref<[string, string]>(['', ''])
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const queryParams = reactive({
  startDate: '',
  endDate: '',
  includeUnapproved: false,
  projectId: null as string | null,
  filterByProject: false,
  laborCategoryId: null as string | null,
  skipCount: 1,
  maxResultCount: 10
})

const chartLevel = ref(1)
const tableData = ref<any[]>([])
const totalCount = ref(0)
const tableLoading = ref(false)
const exportLoading = ref(false)

const initDate = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const format = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  dateRange.value = [format(firstDay), format(now)]
}

const getApiParams = () => {
  return {
    startDate: dateRange.value[0],
    endDate: dateRange.value[1],
    includeUnapproved: queryParams.includeUnapproved,
    projectId: queryParams.projectId,
    filterByProject: queryParams.filterByProject,
    laborCategoryId: queryParams.laborCategoryId
  }
}

const renderChart = (data: any[]) => {
  if (!chartInstance && chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    chartInstance.on('click', (params: any) => {
      if (chartLevel.value === 1) {
        queryParams.projectId = params.data.referenceId
        queryParams.filterByProject = true
        queryParams.laborCategoryId = null
        chartLevel.value = 2
        fetchChartData()
        handleSearchTable()
      } else if (chartLevel.value === 2) {
        queryParams.laborCategoryId = params.data.referenceId
        handleSearchTable()
      }
    })
  }

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map(x => x.name), axisLabel: { interval: 0, rotate: 30 } },
    yAxis: { type: 'value', name: '工时' },
    series: [{
      data: data.map(x => ({ value: x.value, referenceId: x.referenceId })),
      type: 'bar',
      barMaxWidth: 60,
      itemStyle: { color: '#409EFF' }
    }]
  }
  chartInstance?.setOption(option, true)
}

const fetchChartData = async () => {
  try {
    const res: any = await getDepartmentChart(getApiParams())
    renderChart(res)
  } catch (error) {
    ElMessage.error('获取图表数据失败')
  }
}

const fetchTableData = async () => {
  tableLoading.value = true
  try {
    const params = {
      ...getApiParams(),
      skipCount: (queryParams.skipCount - 1) * queryParams.maxResultCount,
      maxResultCount: queryParams.maxResultCount
    }
    const res: any = await getDepartmentTable(params)
    tableData.value = res.items || []
    totalCount.value = res.totalCount || 0
  } catch (error) {
    ElMessage.error('获取表格数据失败')
  } finally {
    tableLoading.value = false
  }
}

const handleCurrentChange = (val: number) => {
  queryParams.skipCount = val
  fetchTableData()
}

const handleSearchTable = () => {
  queryParams.skipCount = 1
  fetchTableData()
}

const handleSearch = () => {
  queryParams.projectId = null
  queryParams.filterByProject = false
  queryParams.laborCategoryId = null
  chartLevel.value = 1
  fetchChartData()
  handleSearchTable()
}

const returnToLevel1 = () => {
  queryParams.projectId = null
  queryParams.filterByProject = false
  queryParams.laborCategoryId = null
  chartLevel.value = 1
  fetchChartData()
  handleSearchTable()
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    const res: any = await exportDepartmentTable(getApiParams())
    const byteCharacters = atob(res.content)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'text/csv;charset=utf-8;' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = res.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  initDate()
  nextTick(() => {
    handleSearch()
  })
})
</script>

<style scoped>
.department-report-container {
  padding: 20px;
}
.filter-card {
  margin-bottom: 20px;
}
.chart-card {
  margin-bottom: 20px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.chart-title {
  font-weight: bold;
  font-size: 16px;
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}
</style>