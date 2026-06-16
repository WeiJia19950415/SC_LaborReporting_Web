<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2 style="text-align: center; margin: 0;">劳动申报系统登录</h2>
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { loginApi, getAppConfigApi } from '../api/index'; // 引入我们统一管理的 API
import { useUserStore } from '../stores/user'; 

const router = useRouter();
const userStore = useUserStore(); 
const loading = ref(false);

const loginForm = ref({
  username: '',
  password: ''
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
      ElMessage.success('登录成功！');
      localStorage.setItem('is_login', '1'); 
      try {
        await userStore.fetchApplicationConfiguration();
      } catch (err) {
        console.error('获取登录人信息失败', err);
      }
      router.push('/');
    } else {
      ElMessage.error(res.description || '用户名或密码错误');
    }
  } catch (error) {
    console.error('登录异常:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f3f4f6;
}
.login-card {
  width: 400px;
}
</style>