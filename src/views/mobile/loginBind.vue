<template>
  <div class="mobile-login">
    <van-nav-bar title="企业微信授权" />
    
    <!-- 静默授权加载状态 -->
    <div v-if="initLoading" class="loading-wrapper">
      <van-loading type="spinner" size="24px" vertical>正在获取企业微信授权信息...</van-loading>
    </div>

    <!-- 绑定表单（仅在未绑定时显示） -->
    <div v-else-if="showLoginForm">
      <div class="logo-area">
        <h2>思创报工系统</h2>
        <p>初次使用企业微信，请验证并绑定系统账号</p>
      </div>
      
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="loginForm.userNameOrEmailAddress"
            name="userNameOrEmailAddress"
            label="工号/账号"
            placeholder="请输入工号"
            :rules="[{ required: true, message: '请填写账号' }]"
          />
          <van-field
            v-model="loginForm.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请填写密码' }]"
          />
        </van-cell-group>
        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            验证并绑定
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 强制修改初始密码弹窗 -->
    <van-dialog 
      v-model:show="showChangePwdDialog" 
      title="安全提示：请修改初始密码" 
      show-cancel-button
      cancel-button-text="退出"
      confirm-button-text="确认修改"
      @confirm="submitChangePwd"
      @cancel="cancelChangePwd"
      :before-close="onBeforeClosePwdDialog"
    >
      <van-form ref="changePwdFormRef" class="pwd-form">
        <van-cell-group inset>
          <van-field
            v-model="changePwdForm.currentPassword"
            type="password"
            label="原密码"
            placeholder="请输入原密码"
            :disabled="!!changePwdForm.currentPassword"
          />
          <van-field
            v-model="changePwdForm.newPassword"
            type="password"
            label="新密码"
            placeholder="至少6位"
            :rules="[{ required: true, message: '请输入新密码' }]"
          />
        </van-cell-group>
      </van-form>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { loginApi,getAppConfigApi } from '../../api/index'; 
import { loginByWeComCode, bindWeComUserId } from '../../api/auth'; 
import { getSystemConfigApi } from '../../api/systemConfig';
import { forceChangePassword, checkRequiresPasswordChange } from '../../api/user';
import { useUserStore } from '../../stores/user';
import { useSystemConfigStore } from '../../stores/systemConfig';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const systemConfigStore = useSystemConfigStore();

const initLoading = ref(true); // 初始授权加载状态
const showLoginForm = ref(false); // 是否显示绑定表单
const loading = ref(false);
const weComUserId = ref(''); // 存储从后端拿到的企微UserId

const loginForm = reactive({
  userNameOrEmailAddress: '',
  password: ''
});

// 改密弹窗相关
const showChangePwdDialog = ref(false);
const changePwdFormRef = ref();
const changePwdForm = reactive({
  currentPassword: '',
  newPassword: ''
});

onMounted(async () => {
  let code = route.query.code as string;

  // ========== 【新增】本地调试跳过真实企微授权 ==========
  if (import.meta.env.DEV) {
    console.warn('本地开发环境：跳过企微 OAuth 真实跳转，直接进入绑定调试');
    initLoading.value = false;
    showLoginForm.value = true; // 直接显示输入账号密码的表单
    // 你可以手动塞一个假的企微ID用于测试绑定接口
    weComUserId.value = 'Local_Test_WeCom_ID_001'; 
    return;
  }
  // =====================================================

  if (code) {
    // 1. 线上环境：如果有 Code，说明是企微重定向回来的，进行静默登录
    await handleWeComSilentLogin(code);
  } else {
    // 2. 线上环境：如果没有 Code，重定向到企微授权页
    await redirectToWeComOAuth();
  }
});

// 重定向到企业微信 OAuth
const redirectToWeComOAuth = async () => {
  try {
    const res: any = await getSystemConfigApi();
    const corpId = 'ww36932a56e46020af';
    if (!corpId) {
      showToast('未配置企业微信 CorpId');
      initLoading.value = false;
      showLoginForm.value = true;
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/mobile/login');
    const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=STATE#wechat_redirect`;
    
    window.location.replace(oauthUrl);
  } catch (error) {
    showToast('获取系统配置失败，无法发起授权');
    initLoading.value = false;
    showLoginForm.value = true; // 降级为直接账号密码登录
  }
};

// 处理静默登录
const handleWeComSilentLogin = async (code: string) => {
  try {
    // 调用我们在 auth.js 中新增的接口，后端通过 code 去企微换取 UserId，并签发系统 Token
    const res: any = await loginByWeComCode({ code });
    if (res && res.token) {
      // 已经绑定过，直接走登录成功流程
      await processLoginSuccess(res.token, '');
    }
  } catch (error: any) {
    // 如果后端抛出特定的未绑定异常（假设后端将weComUserId放在了error data里）
    if (error.response?.data?.error?.code === 'WeCom_Not_Bound') {
      weComUserId.value = error.response.data.error.data?.WeComUserId;
      showToast('账号未绑定，请验证身份');
    } else {
      showToast(error.response?.data?.error?.message || '授权登录失败，请手动登录');
    }
    // 无论如何，静默登录失败都显示账号密码绑定表单
    initLoading.value = false;
    showLoginForm.value = true;
  }
};

// 提交绑定与登录
// 记得在顶部引入 getAppConfigApi
// import { loginApi, getAppConfigApi } from '../../api/index'; 

const onSubmit = async () => {
  loading.value = true;
  try {
    // 1. 获取应用初始配置（对齐 PC 端）
    try {
      await getAppConfigApi();
    } catch (e) {
      console.warn('获取应用初始配置失败，继续尝试登录', e);
    }

    // 2. 发起登录请求
    const loginData = {
      userNameOrEmailAddress: loginForm.userNameOrEmailAddress,
      password: loginForm.password,
      rememberMe: true 
    };
    const loginRes: any = await loginApi(loginData);

    // 3. 判断是否登录成功 (复刻 PC 端逻辑)
    if (loginRes && loginRes.result === 1) {
      
      // 宽容获取 Token，如果没有拿到也不强求，因为身份可能已经在 Cookie 里了
      const token = loginRes.token || loginRes.accessToken || localStorage.getItem('token') || '';
      if (token) {
        localStorage.setItem('token', token);
        userStore.token = token;
      }

      // === 核心修复：不要因为没有 Token 就阻断流程 ===

      // 4. 如果有企微UserId，执行绑定（请求会自动带上刚种好的 Cookie）
      if (weComUserId.value) {
        try {
          await bindWeComUserId({ weComUserId: weComUserId.value });
          showToast('企微账号绑定成功');
        } catch (bindErr) {
          console.error('绑定失败', bindErr);
          showToast('账号登录成功，但企业微信绑定失败');
        }
      }

      // 5. 继续执行成功流程 (拉取配置、检查密码等)
      await processLoginSuccess(token, loginForm.password);
      
    } else {
      showToast(loginRes?.description || '用户名或密码错误');
    }
  } catch (error: any) {
    console.error('登录异常:', error);
    showToast(error.message || '登录遇到未知异常，请检查后端服务');
  } finally {
    loading.value = false;
  }
};
// 通用登录成功处理（加载配置 + 检查是否需强制改密）
const processLoginSuccess = async (token: string, currentPwd = '') => {
  localStorage.setItem('is_login', '1');
  if (token) userStore.token = token;

  try {
    await userStore.fetchApplicationConfiguration();
    await systemConfigStore.fetchSystemConfig();
  } catch (err) {
    console.error('获取配置失败', err);
  }

  try {
    const requiresChange = await checkRequiresPasswordChange();
    if (requiresChange) {
      changePwdForm.currentPassword = currentPwd;
      changePwdForm.newPassword = '';
      showChangePwdDialog.value = true;
      initLoading.value = false;
      return false; // 等待用户改密，阻断直接进入系统
    }
  } catch (err) {
    showToast('安全身份认证失败，未获取到有效凭证');
    return false; // 【关键修改】：如果检测密码接口报错（说明Cookie没带上），直接阻断，不要跳进业务页面！
  }

  showToast('登录成功');
  router.replace('/mobile/laborReport/list');
};
// 提交修改密码
const submitChangePwd = async () => {
  try {
    if (changePwdForm.newPassword.length < 6) {
      showToast('新密码至少6位');
      return false; // 阻止弹窗关闭
    }
    await forceChangePassword({
      currentPassword: changePwdForm.currentPassword,
      newPassword: changePwdForm.newPassword
    });
    
    showToast('密码修改成功');
    showChangePwdDialog.value = false;
    router.replace('/mobile/laborReport/list');
    return true;
  } catch (error: any) {
    showToast(error.response?.data?.error?.message || '密码修改失败');
    return false; // 阻止弹窗关闭
  }
};

// 退出改密流程
const cancelChangePwd = () => {
  userStore.logout();
  showLoginForm.value = true;
};

// 拦截弹窗默认关闭行为，必须依靠业务逻辑关闭
const onBeforeClosePwdDialog = (action: string) => {
  if (action === 'confirm') return false; 
  return true;
};
</script>

<style scoped>
.mobile-login { min-height: 100vh; background-color: #f7f8fa; }
.loading-wrapper { display: flex; justify-content: center; align-items: center; height: 60vh; }
.logo-area { text-align: center; padding: 40px 20px; }
.logo-area h2 { margin: 0; font-size: 24px; color: #333; }
.logo-area p { font-size: 14px; color: #666; margin-top: 10px; }
.pwd-form { padding-top: 10px; padding-bottom: 20px; }
</style>