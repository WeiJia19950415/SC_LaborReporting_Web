import axios from 'axios';
import router from '../router';
import { ElMessage } from 'element-plus';

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
  withCredentials: true, // 允许跨域请求时携带 Cookie
  xsrfCookieName: 'XSRF-TOKEN',               // ABP 默认放在 Cookie 中的 Token 名称
  xsrfHeaderName: 'RequestVerificationToken', // ABP 后端要求的请求头名称
});

// ================= 核心修改：请求拦截器 =================
request.interceptors.request.use(
  (config) => {
    // 1. 获取存在本地的 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // ================= 新增：手动读取 ABP 的防伪令牌 =================
    // 从浏览器的 cookie 中精准提取 XSRF-TOKEN
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
      
    if (csrfToken) {
      // 塞入 ABP 要求的防伪请求头中
      config.headers['RequestVerificationToken'] = csrfToken;
    }
    // ===============================================================

    // (可选) 租户ID
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['__tenant'] = tenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// ========================================================

// 响应拦截器 (保留你原来的代码即可)
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.error?.message;

      if (status === 401) {
        ElMessage.error('登录已过期，请重新登录');
        localStorage.removeItem('is_login'); 
        localStorage.removeItem('token');
        router.push('/login');
      } 
      else if (status === 403) {
        ElMessage.error(errorMessage || '抱歉，您没有权限执行此操作或触发了业务异常');
      } 
      else if (status === 400) {
        ElMessage.error(errorMessage || '请求参数错误或缺少防伪令牌');
      } 
      else {
        ElMessage.error(errorMessage || '请求失败，请稍后再试');
      }
    } else {
      ElMessage.error(error.message || '网络连接异常，请检查网络');
    }
    return Promise.reject(error);
  }
);

export default request;