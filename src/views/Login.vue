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

const router = useRouter();
const loading = ref(false);

const loginForm = ref({
  username: '',
  password: ''
});

// 完整的登录处理逻辑
const handleLogin = async () => {
  // 1. 表单基础校验
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }

  loading.value = true;
  try {
    // 2. (可选) 预热请求：获取应用配置。
    // 虽然我们在后端关闭了防伪校验，但调用此接口可以让浏览器提前拿到 ABP 的本地化语言、配置等 Cookie
    try {
      await getAppConfigApi();
    } catch (e) {
      console.warn('获取应用初始配置失败，继续尝试登录', e);
    }

    // 3. 组装 ABP 后端要求的请求参数
    const loginData = {
      userNameOrEmailAddress: loginForm.value.username,
      password: loginForm.value.password,
      rememberMe: true // 保持登录状态
    };

    // 4. 发起 POST 登录请求
    const res: any = await loginApi(loginData);

    // 5. 判断返回值 (result: 1 表示成功)
    if (res && res.result === 1) {
      ElMessage.success('登录成功！');
      
      // 6. 写入前端登录标记，这样路由守卫 (router/index.ts) 就会放行，不会把我们踢回登录页
      localStorage.setItem('is_login', '1'); 
      
      // 7. 跳转到后台主页
      router.push('/');
    } else {
      // 登录失败，显示后端返回的具体错误提示 (比如 InvalidUserNameOrPassword)
      ElMessage.error(res.description || '用户名或密码错误');
    }
  } catch (error) {
    console.error('登录异常:', error);
    // 400/401 等错误提示已经在 request.ts 的拦截器里处理过了，这里只做简单的异常捕获
  } finally {
    // 无论成功还是失败，最后都要关闭按钮的 loading 状态
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