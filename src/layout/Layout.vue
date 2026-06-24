<template>
  <el-container class="app-wrapper">
    <el-aside width="200px" class="sidebar-container">
      <div class="logo">报工系统</div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        background-color="#096be2"
        text-color="#e0e7ff"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-sub-menu index="system" v-if="hasPermission('SC_LaborReporting.UserManagement') || hasPermission('SC_LaborReporting.DepartmentManagement')|| hasPermission('SC_LaborReporting.RoleManagement')">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
            <el-menu-item index="/users" v-if="hasPermission('SC_LaborReporting.UserManagement')">
              <el-icon><User /></el-icon>
              用户管理
            </el-menu-item>
            
            <el-menu-item index="/department" v-if="hasPermission('SC_LaborReporting.DepartmentManagement')">
              <el-icon><OfficeBuilding /></el-icon>
              部门管理
            </el-menu-item>
            
            <el-menu-item index="/roles" v-if="hasPermission('SC_LaborReporting.RoleManagement')">
              <el-icon><Lock /></el-icon>
              角色管理
            </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="system2" v-if="hasPermission('SC_LaborReporting.LaborCategoriesManagement') || hasPermission('SC_LaborReporting.ProjectManagement')|| hasPermission('SC_LaborReporting.ProjectRoles')">
          <template #title>
            <el-icon><Tools /></el-icon>
            <span>基础数据管理</span>
          </template>
            <el-menu-item index="/laborCategories" v-if="hasPermission('SC_LaborReporting.LaborCategoriesManagement')">
              <el-icon><Operation /></el-icon>
              工时分类设置
            </el-menu-item>
            <el-menu-item index="/projects" v-if="hasPermission('SC_LaborReporting.Projects')">
              <el-icon><Star /></el-icon>
              项目管理
            </el-menu-item>
            <el-menu-item index="/projectRoles" v-if="hasPermission('SC_LaborReporting.ProjectRoles')">
              <el-icon><Avatar /></el-icon>
              项目角色
            </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/laborReport" v-if="hasPermission('SC_LaborReporting.LaborReport')">
          <el-icon><Calendar /></el-icon>
          <span>工时填报</span>
        </el-menu-item>

        <el-menu-item index="/approval" v-if="hasPermission('SC_LaborReporting.LaborReport')">
          <el-icon><Timer /></el-icon>
          <span>工时审批</span>
        </el-menu-item>



        <el-sub-menu index="system3" v-if="hasPermission('SC_LaborReporting.ReportManagement.BusinessDetails') ">
          <template #title>
            <el-icon><DataBoard /></el-icon>
            <span>报表查询</span>
          </template>
          <el-menu-item index="/reports" v-if="hasPermission('SC_LaborReporting.ReportManagement.BusinessDetails')">
            <el-icon><Document /></el-icon>
            <span>报表明细-业务</span>
          </el-menu-item>
        </el-sub-menu>
        
        <el-menu-item @click="logout" index="">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="main-container">
      <el-header class="app-header">
        <div class="header-breadcrumb">欢迎使用思创激光报工系统</div>
      </el-header>
      
      <el-main class="app-main">
        <router-view />
      </el-main>
      
    </el-container>
  </el-container>
  <template>
  <el-container class="layout-container">
    <el-dialog
      v-model="userStore.mustChangePassword"
      title="安全提示：请修改初始密码"
      width="450px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      destroy-on-close
      append-to-body
    >
      <el-alert
        title="出于系统安全要求，首次登录或密码被重置后，必须修改密码才能继续使用系统。"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px;"
      />
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="pwdForm.currentPassword" type="password" show-password placeholder="请输入当前密码(初始密码)" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="text-align: center;">
          <el-button type="primary" style="width: 100%;" :loading="pwdLoading" @click="submitPwdChange">
            确认修改并重新登录
          </el-button>
        </div>
      </template>
    </el-dialog>

  </el-container>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, onMounted ,reactive} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getMyPermissionsApi } from '../api/index'; 
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/user'
import { forceChangePassword } from '../api/user' 

const userStore = useUserStore()
const route = useRoute();
const router = useRouter();

const pwdFormRef = ref()
const pwdLoading = ref(false)
const pwdForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const validateConfirm = (rule: any, value: any, callback: any) => {
  if (value !== pwdForm.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
  } else {
    callback()
  }
}

const pwdRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const submitPwdChange = async () => {
  if (!pwdFormRef.value) return
  await pwdFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      pwdLoading.value = true
      try {
        // 调用后端接口执行改密
        await forceChangePassword({
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword
        })
        
        ElMessage.success('密码修改成功，请使用新密码重新登录！')
        
        // 🌟 核心：修改成功后，彻底清理本地状态并打回登录页
        localStorage.removeItem('token')
        localStorage.removeItem('is_login')
        userStore.$reset()
        
        // 使用 window.location.href 强制刷新页面跳回 login，保证所有内存状态被清空
        window.location.href = '/login'
        
      } catch (error) {
        console.error('改密失败', error)
      } finally {
        pwdLoading.value = false
      }
    }
  })
}

// 存储从后端获取的权限列表
const permissions = ref<string[]>([]);

// 自动高亮当前所在的菜单项
const activeMenu = computed(() => route.path);

// 判断是否拥有某个权限的方法
const hasPermission = (permissionName: string) => {
  return permissions.value.includes(permissionName);
};

const logout = () => {
  localStorage.removeItem('is_login'); // 清除登录标记
  router.push('/login');
};

// 页面加载时请求权限接口
const fetchMyPermissions = async () => {
  try {
    const res: any = await getMyPermissionsApi();
    if (res && Array.isArray(res)) {
      permissions.value = res; 
    }
  } catch (error) {
    console.error("获取权限失败", error);
  }
};

// 组件挂载时执行
onMounted(() => {
  fetchMyPermissions();
});
</script>

<style scoped>

.app-wrapper {
  height: 100vh;
  width: 100vw;
  display: flex;
}
.sidebar-container {
  background-color: #096be2;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-weight: bold;
  font-size: 18px;
  background-color: #094b9b;
  flex-shrink: 0;
}
.el-menu-vertical {
  border-right: none;
  flex-grow: 1;
  background-color: #2968b6;
}
.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.app-header {
  height: 60px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 10;
}
.app-main {
  background-color: #f0f2f5;
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}
.app-footer {
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 13px;
  color: #909399; 
  background-color: #f0f2f5; 
  letter-spacing: 1px;
}
</style>