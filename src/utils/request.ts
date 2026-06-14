import axios from "axios";

const request = axios.create({
  baseURL: "https://localhost:44355/api", // 后端地址
  timeout: 5000,
});

// 请求拦截器：带 token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：全局处理错误
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error);
  }
);

export default request;