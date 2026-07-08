<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="header-content">
          <img src="../img/logo.png" alt="logo" class="logo" />
          <h2 style="margin: 0;">思创报工系统</h2>
        </div>
      </template>

      <div v-show="loginType === 'account'">
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
        <div class="login-type-switch">
          <el-button type="primary" link @click="switchLoginType('wecom')">
            <el-icon style="margin-right: 4px;"><ChatDotSquare /></el-icon>使用企业微信登录
          </el-button>
        </div>
      </div>

      <div v-show="loginType === 'wecom'" class="wecom-login-wrapper">
        <div id="wx_reg" v-loading="wecomLoading"></div>
        <div class="login-type-switch">
          <el-button type="primary" link @click="switchLoginType('account')">
            <el-icon style="margin-right: 4px;"><User /></el-icon>返回账号密码登录
          </el-button>
        </div>
      </div>
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
          <el-input v-model="changePwdForm.currentPassword" type="password" :disabled="!!changePwdForm.currentPassword" placeholder="请输入原密码" />
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
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ChatDotSquare, User } from '@element-plus/icons-vue'; // 引入图标
import { loginApi, getAppConfigApi } from '../api/index'; 
import { useUserStore } from '../stores/user'; 
import { forceChangePassword, checkRequiresPasswordChange } from '../api/user'; 
import { useSystemConfigStore } from '../stores/systemConfig';
import { isWeCom } from '../utils/env';
import { getSystemConfigApi } from '../api/systemConfig';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore(); 
const systemConfigStore = useSystemConfigStore();

const loading = ref(false);
const loginType = ref<'account' | 'wecom'>('account');
const wecomLoading = ref(false);

const loginForm = ref({
  username: '',
  password: ''
});

// 授权回调地址必须是完整的当前页面URL，并在企微后台配置了可信域名
const redirectUri = encodeURIComponent(window.location.origin + '/login'); 

// 弹窗相关
const showChangePwdDialog = ref(false);
const pwdLoading = ref(false);
const changePwdFormRef = ref();
const changePwdForm = ref({
  currentPassword: '',
  newPassword: ''
});

onMounted(() => {
  // 1. 检查 URL 中是否有企业微信回调的 code
  const code = route.query.code as string;
  if (code) {
    handleWeComCodeLogin(code);
    return;
  }

  // 2. 环境判断，决定初始登录方式
  if (isWeCom()) {
    // 企微内置浏览器：直接发起 OAuth2 网页静默授权
    const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=STATE#wechat_redirect`;
    window.location.replace(oauthUrl);
  } else {
    // PC端浏览器：默认显示账号密码，可切换扫码
    loginType.value = 'account';
  }
});

// 切换登录方式
const switchLoginType = (type: 'account' | 'wecom') => {
  loginType.value = type;
  if (type === 'wecom') {
    initWeComQR();
  }
};

// 初始化PC端企业微信扫码登录
const initWeComQR = () => {
  wecomLoading.value = true;
  // 避免重复加载 JS
  if (document.getElementById('wwLoginScript')) {
    renderQrCode();
    wecomLoading.value = false;
    return;
  }

  const script = document.createElement('script');
  script.id = 'wwLoginScript';
  script.src = 'https://rescdn.qqmail.com/node/ww/wwopenmng/js/sso/wwLogin-1.0.0.js';
  script.onload = () => {
    renderQrCode();
    wecomLoading.value = false;
  };
  script.onerror = () => {
    ElMessage.error('企业微信扫码组件加载失败');
    wecomLoading.value = false;
  }
  document.body.appendChild(script);
};

const renderQrCode = async () => {
  document.getElementById('wx_reg')!.innerHTML = ''; 
  
  try {
    // 直接 await 请求数据
    const res: any = await getSystemConfigApi();
    const corpId = res.weComCorpId; 
    const agentId = res.weComAgentId;
    console.log('获取到的配置信息:', res);

    // @ts-ignore
    window.WwLogin({
      "id": "wx_reg",  
      "appid": corpId,
      "agentid": agentId,
      "redirect_uri": redirectUri,
      "state": "STATE",
      "href": "", 
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    ElMessage.error('获取扫码登录配置失败');
  }
};

// 提取公共逻辑：登录成功后的通用处理（拉配置 + 检查改密）
const processLoginSuccess = async (token: string, currentPwd = '') => {
  localStorage.setItem('is_login', '1'); 
  if (token) userStore.token = token;

  try {
    await userStore.fetchApplicationConfiguration();
    await systemConfigStore.fetchSystemConfig();
  } catch (err) {
    console.error('获取登录人信息或系统配置失败', err);
  }

  // 核心安全拦截逻辑
  let requiresChange;
  try {
    requiresChange = await checkRequiresPasswordChange();
  } catch (err) {
    console.error('检查密码状态失败:', err);
    ElMessage.error('密码安全检测失败，请联系管理员');
    return false; // 阻断流程
  }

  if (requiresChange) {
    // 企微单点登录时，用户可能不知道原密码，如果业务允许可以直接置空让用户手动输入原密码，或后端SSO跳过此检查。
    changePwdForm.value.currentPassword = currentPwd; 
    changePwdForm.value.newPassword = '';
    showChangePwdDialog.value = true;
    return false; 
  }

  ElMessage.success('登录成功！');
  router.push('/');
  return true;
};

// 账号密码登录
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
      rememberMe: true 
    };
    const res: any = await loginApi(loginData);
    
    if (res && res.result === 1) {
      const savedToken = res.token || res.accessToken || localStorage.getItem('token');
      await processLoginSuccess(savedToken, loginForm.value.password);
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

// 企业微信 Code 登录
const handleWeComCodeLogin = async (code: string) => {
  loading.value = true;
  try {
    // 调用我们在 user.ts store 中新增的方法
    const token = await userStore.loginByWeComCode(code);
    if (token) {
      // 企微登录由于没有输入原密码，传空字符串
      await processLoginSuccess(token, '');
    }
  } catch (error: any) {
    console.error('企微授权登录失败:', error);
    ElMessage.error('企业微信快捷登录失败，请使用账号密码登录');
    // 如果失败，清除URL上的code参数，防止死循环刷新
    router.replace({ path: '/login' }); 
    loginType.value = 'account';
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
        
        ElMessage.success('密码修改成功，请重新登录！');
        showChangePwdDialog.value = false;
        
        userStore.logout(); 
        loginForm.value.password = ''; 
        router.replace({ path: '/login' }); // 确保留在登录页
        loginType.value = 'account'; // 改密后强制切回账号密码登录重新验证
      } catch (error: any) {
        ElMessage.error(error.response?.data?.error?.message || '密码修改失败，请确认原密码无误且新密码符合要求！');
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

.login-type-switch {
  margin-top: 15px;
  text-align: center;
}

.wecom-login-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
}

#wx_reg {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>