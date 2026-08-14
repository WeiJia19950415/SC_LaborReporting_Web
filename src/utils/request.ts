import axios from 'axios';
import router from '../router';
import { ElMessage } from 'element-plus';

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  withCredentials: true, // 允许跨域请求时携带 Cookie
  xsrfCookieName: 'XSRF-TOKEN',               // ABP 默认放在 Cookie 中的 Token 名称
  xsrfHeaderName: 'RequestVerificationToken', // ABP 后端要求的请求头名称
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      // 提取 ABP 框架的标准错误信息
      const errorMessage = error.response.data?.error?.message;

      if (status === 401) {
        // 401：真正的未登录或 Token 失效，执行退出登录逻辑
        ElMessage.error('登录已过期，请重新登录');
        localStorage.removeItem('is_login'); 
        localStorage.removeItem('token');
        router.push('/login');
      } 
      else if (status === 403) {
        // 403：ABP 抛出的 UserFriendlyException 业务异常或无权限
        // 只做弹窗提示，绝对不退出登录！
        ElMessage.error(errorMessage || '抱歉，您没有权限执行此操作或触发了业务异常');
      } 
      else if (status === 400) {
        ElMessage.error(errorMessage || '请求参数错误或缺少防伪令牌');
      } 
      else {
        ElMessage.error(errorMessage || '请求失败，请稍后再试');
      }
    } else {
      // 处理跨域或网络完全断开的情况
      ElMessage.error(error.message || '网络连接异常，请检查网络');
    }
    return Promise.reject(error);
  }
);

export default request;