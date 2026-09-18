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
        <!-- 新增：历史项目 列 -->
        <el-table-column label="历史项目" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isOld ? 'warning' : 'success'">
              {{ row.isOld ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <!-- 补充了原来缺失的编辑按钮 -->
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
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
          <el-select v-model="formData.managerId" filterable clearable placeholder="请选择项目负责人" style="width: 100%">
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name ? `${user.name} (${user.userName})` : user.userName"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <!-- 新增：历史项目 表单项 -->
        <el-form-item label="历史项目" prop="isOld">
          <el-switch 
            v-model="formData.isOld" 
            active-text="是" 
            inactive-text="否" 
          />
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
import { getUserList } from '../../api/user' 

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

// 修改：增加 isOld 字段初始值
const formData = reactive({
  id: '',
  code: '',
  name: '',
  managerId: '',
  isOld: false 
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
  return user ? (user.name) : '未知'
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
  formData.isOld = false // 修改：重置 isOld 字段
  dialogVisible.value = true
}

// 编辑按钮
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑项目'
  formData.id = row.id
  formData.code = row.code
  formData.name = row.name
  formData.managerId = row.managerId
  formData.isOld = row.isOld ?? false // 修改：赋值 isOld 字段，如果后端未传则默认为 false
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