import axios from 'axios';
import router from '../router';
import { ElMessage } from 'element-plus';

// 创建 axios 实例
const request = axios.create({
  baseURL: 'https://localhost:44355/', 
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

request.interceptors.response.use(
(response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        ElMessage.error('登录已过期，请重新登录');
        localStorage.removeItem('is_login'); 
        localStorage.removeItem('token')
        router.push('/login');
      }  else if (status === 400) {
        ElMessage.error(error.response.data?.error?.message || '请求参数错误或缺少防伪令牌');
      } else {
        ElMessage.error(error.response.data?.error?.message || '请求失败，请稍后再试');
      }
    }
    return Promise.reject(error);
  }
);

export default request;