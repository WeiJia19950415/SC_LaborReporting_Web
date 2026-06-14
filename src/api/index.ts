import request from '../utils/request';

// 统一管理所有的 API 路径
export const API_URLS = {
  login: '/api/account/login',
  getPermissions: '/api/app/user-permission/my-permissions',
  getAppConfig: '/api/abp/application-configuration',
  getUserList: '/api/identity/users' // 获取用户列表的 API 路径
};

// =======================
// === 具体的请求方法 ===
// =======================

export const getAppConfigApi = () => {
  return request.get(API_URLS.getAppConfig);
};


// 获取用户列表
export const getUserListApi = (params: any) => {
  return request.get(API_URLS.getUserList, { params });
};
/**
 * 用户登录接口
 * @param data 包含用户名和密码的对象
 */
export const loginApi = (data: any) => {
  return request.post(API_URLS.login, data);
};

/**
 * 获取当前登录用户的所有权限
 */
export const getMyPermissionsApi = () => {
  return request.get(API_URLS.getPermissions);
};

/**
 * 获取当前登录用户的所有权限
 */
