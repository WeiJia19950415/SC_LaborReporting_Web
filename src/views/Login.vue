<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="header-content">
          <img src="../img/logo.png" alt="logo" class="logo" />
          <h2 style="margin: 0;">思创报工系统</h2>
        </div>
      </template>
      <el-form :model="loginForm" label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width: 100%;" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog
      v-model="showChangePwdDialog"
      title="安全提示：首次登录或密码被重置，请修改密码"
      width="400px"
      :close-on-click-modal="false"
      :show-close="false"
      :close-on-press-escape="false"
      append-to-body
    >
      <el-form :model="changePwdForm" ref="changePwdFormRef" label-position="top">
        <el-form-item label="原密码">
          <el-input v-model="changePwdForm.currentPassword" type="password" disabled />
        </el-form-item>
        <el-form-item 
          label="新密码" 
          prop="newPassword" 
          :rules="[{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '长度至少6位', trigger: 'blur' }]"
        >
          <el-input v-model="changePwdForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :loading="pwdLoading" @click="submitChangePwd">确认修改并重新登录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { loginApi, getAppConfigApi } from '../api/index'; // 引入我们统一管理的 API
import { useUserStore } from '../stores/user'; 
import { forceChangePassword, checkRequiresPasswordChange } from '../api/user'; // 引入密码相关 API
import { useSystemConfigStore } from '../stores/systemConfig';

const router = useRouter();
const userStore = useUserStore(); 
const loading = ref(false);
const systemConfigStore = useSystemConfigStore();

const loginForm = ref({
  username: '',
  password: ''
});

// 改密弹窗相关变量
const showChangePwdDialog = ref(false);
const pwdLoading = ref(false);
const changePwdFormRef = ref();
const changePwdForm = ref({
  currentPassword: '',
  newPassword: ''
});

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }

  loading.value = true;
  try {
    try {
      await getAppConfigApi();
    } catch (e) {
      console.warn('获取应用初始配置失败，继续尝试登录', e);
    }
    const loginData = {
      userNameOrEmailAddress: loginForm.value.username,
      password: loginForm.value.password,
      rememberMe: true // 保持登录状态
    };
    const res: any = await loginApi(loginData);
    
    if (res && res.result === 1) {
      localStorage.setItem('is_login', '1'); 

      const savedToken = res.token || res.accessToken || localStorage.getItem('token');
      if (savedToken) {
        userStore.token = savedToken;
      }
      try {
        //获取登陆人信息
        await userStore.fetchApplicationConfiguration();
        //获取全局系统配置
        await systemConfigStore.fetchSystemConfig();
      } catch (err) {
        console.error('获取登录人信息失败', err);
      }

      // 2. 🚨 核心安全拦截逻辑（增加独立 try-catch 防止崩溃静默）
      let requiresChange;
      try {
        requiresChange = await checkRequiresPasswordChange();
      } catch (err) {
        console.error('检查密码状态失败:', err);
        ElMessage.error('密码安全检测失败，请联系管理员或检查网络接口');
        loading.value = false;
        return; // 阻断后续流程
      }

      if (requiresChange) {
        // 如果需要修改密码：弹出对话框，中断进入首页的流程
        changePwdForm.value.currentPassword = loginForm.value.password; // 自动填充刚刚输入的正确密码
        changePwdForm.value.newPassword = '';
        showChangePwdDialog.value = true;
        loading.value = false;
        return; 
      }

      // 不需要修改密码，正常进入系统
      ElMessage.success('登录成功！');
      router.push('/');
    } else {
      ElMessage.error(res.description || '用户名或密码错误');
    }
  } catch (error: any) {
    console.error('登录异常:', error);
    ElMessage.error(error.message || '登录遇到未知异常，请检查后端服务');
  } finally {
    loading.value = false;
  }
};

// 提交密码修改
const submitChangePwd = async () => {
  if (!changePwdFormRef.value) return;
  await changePwdFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      pwdLoading.value = true;
      try {
        await forceChangePassword({
          currentPassword: changePwdForm.value.currentPassword,
          newPassword: changePwdForm.value.newPassword
        });
        
        ElMessage.success('密码修改成功，请使用新密码重新登录！');
        showChangePwdDialog.value = false;
        
        // 修改成功后，清除现有登录状态，要求用户重新输入新密码
        userStore.logout(); 
        loginForm.value.password = ''; // 清空登录框的旧密码
      } catch (error: any) {
        // 捕获后端返回的密码规则不满足等错误
        ElMessage.error(error.response?.data?.error?.message || '密码修改失败，请确认新密码符合复杂度要求！');
      } finally {
        pwdLoading.value = false;
      }
    }
  });
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-image: url('../img/bj.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #f3f4f6; 
}

.login-card {
  width: 400px;
  margin-top: -350px; 
  background: rgba(255, 255, 255, 0.95); 
  border: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px; 
}

.logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}
</style>