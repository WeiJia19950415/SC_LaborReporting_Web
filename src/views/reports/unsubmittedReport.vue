<template>
  <div class="app-container">
    <!-- 搜索表单 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true" :model="queryParams" @keyup.enter="handleQuery">
        <el-form-item label="查询日期">
          <el-date-picker
            v-model="queryParams.queryDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select 
            v-model="queryParams.departmentId" 
            placeholder="请选择部门 (可选)" 
            clearable 
            filterable
          >
            <el-option
              v-for="dept in departmentList"
              :key="dept.id"
              :label="dept.fullName"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="userName" label="登录账号" align="center" />
        <el-table-column prop="departmentName" label="员工姓名" align="center" />
        <!-- 如果后端返回了部门名称，可取消下方注释 -->
        <!-- <el-table-column prop="departmentName" label="所属部门" align="center" /> -->
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getUnsubmittedUsers } from '../../api/report'
import { getDepartmentsApi } from '../../api/department';
import { ElMessage } from 'element-plus'

// 当天日期的格式化 YYYY-MM-DD
const getToday = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 响应式数据
const loading = ref(false)
const departmentList = ref<any[]>([])
const tableData = ref<any[]>([])

const queryParams = reactive({
  queryDate: getToday(),
  departmentId: ''
})

// 初始化
onMounted(() => {
  loadDepartments()
  handleQuery()
})

// 加载部门字典
const loadDepartments = async () => {
  try {
    const res = await getDepartmentsApi() // 替换为你实际的获取部门接口
    departmentList.value = res.items || res
  } catch (error) {
    console.error('获取部门列表失败', error)
  }
}

// 执行查询
const handleQuery = async () => {
  if (!queryParams.queryDate) {
    ElMessage.warning('请选择查询日期')
    return
  }
  loading.value = true
  try {
    const res = await getUnsubmittedUsers(queryParams)
    tableData.value = res || []
  } catch (error) {
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

// 重置查询
const resetQuery = () => {
  queryParams.queryDate = getToday()
  queryParams.departmentId = ''
  handleQuery()
}
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
</style>