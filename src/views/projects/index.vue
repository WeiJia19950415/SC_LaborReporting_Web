<template>
  <div class="app-container">
    <el-card shadow="never">
    <div class="filter-container" style="margin-bottom: 20px;">
      <el-button type="primary" @click="handleAdd">新增项目</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" border style="width: 100%">
      <el-table-column prop="code" label="项目编号" width="180" />
      <el-table-column prop="name" label="项目名称" />
      <el-table-column label="项目负责人">
        <template #default="{ row }">
          {{ getUserName(row.managerId) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

      <div class="pagination-container" style="margin-top: 20px; text-align: right;">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="fetchData"
        />
      </div>
    </el-card>
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px">
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="项目编号" prop="code">
          <el-input v-model="formData.code" placeholder="请输入项目编号" />
        </el-form-item>
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="负责人" prop="managerId">
          <el-select v-model="formData.managerId" placeholder="请选择项目负责人" style="width: 100%">
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name ? `${user.name} (${user.userName})` : user.userName"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjects, createProject, updateProject, deleteProject } from '../../api/project'
import { getUserList } from '../../api/user' // 假设已有获取用户的API

// 状态定义
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const userList = ref<any[]>([])

const queryParams = reactive({page: 1, size: 10})

// 弹窗状态
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref()
const formData = reactive({
  id: '',
  code: '',
  name: '',
  managerId: ''
})

const rules = {
  code: [{ required: true, message: '请输入项目编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  managerId: [{ required: true, message: '请选择负责人', trigger: 'change' }]
}

onMounted(() => {
  fetchUsers()
  fetchData()
})

// 获取用户列表 (用于下拉框和匹配名字)
const fetchUsers = async () => {
  try {
    const res = await getUserList({ maxResultCount: 1000 })
    userList.value = res.items || res
  } catch (error) {
    console.error('获取用户失败', error)
  }
}

// 根据ID匹配负责人名字
const getUserName = (managerId: string) => {
  const user = userList.value.find(u => u.id === managerId)
  return user ? ( user.name) : '未知'
}

// 获取表格数据
const fetchData = async () => {
  loading.value = true
  try {
    const skip = (queryParams.page - 1) * queryParams.size
    const res = await getProjects({ 
      skipCount: skip, 
      maxResultCount: queryParams.size 
    })
    tableData.value = res.items
    total.value = res.totalCount
  } catch (error) {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 新增按钮
const handleAdd = () => {
  dialogTitle.value = '新增项目'
  formData.id = ''
  formData.code = ''
  formData.name = ''
  formData.managerId = ''
  dialogVisible.value = true
}

// 编辑按钮
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑项目'
  formData.id = row.id
  formData.code = row.code
  formData.name = row.name
  formData.managerId = row.managerId
  dialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        if (formData.id) {
          await updateProject(formData.id, formData)
          ElMessage.success('更新成功')
        } else {
          await createProject(formData)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        fetchData()
      } catch (error) {
        ElMessage.error('操作失败')
      }
    }
  })
}

// 删除
const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该项目吗?', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteProject(row.id)
    ElMessage.success('删除成功')
    fetchData()
  }).catch(() => {})
}
</script>