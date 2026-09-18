import request from '../utils/request';

// 获取用户列表
export function getUserList(params: any) {
  return request({ url: '/api/app/user-management', method: 'get', params });
}
// 获取单用户详情
export function getUser(id: string) {
  return request({ url: `/api/app/user-management/${id}`, method: 'get' });
}
// 新增用户
export function createUser(data: any) {
  return request({ url: '/api/app/user-management', method: 'post', data });
}
// 修改用户
export function updateUser(id: string, data: any) {
  return request({ url: `/api/app/user-management/${id}`, method: 'put', data });
}
// 删除用户
export function deleteUser(id: string) {
  return request({ url: `/api/app/user-management/${id}`, method: 'delete' });
}
// 获取所有角色（下拉多选用）
export function getAllRoles() {
  return request({ url: '/api/identity/roles/all', method: 'get' });
}
// 重置密码
export function resetPassword(id: string) {
  return request({ url: `/api/app/user-management/${id}/reset-password`, method: 'post' });
}
// 检查是否需要强制改密
export function checkRequiresPasswordChange() {
  return request({
    url: '/requires-password-change',
    method: 'get'
  })
}
// 提交强制改密
export function forceChangePassword(data: any) {
  return request({
    url: '/force-change-password',
    method: 'post',
    data
  })
}

// 上传用户的接口
export const importUsersApi = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return request.post('/api/app/user-management/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    responseType: 'blob'
  });
};

export const loginByWeComCodeApi = (code: string) => {
  return request.get(`/api/app/we-com-auth/login-by-code?code=${code}`);
}

export const getUsersApi = (params?: any) => {
  return request.get('/api/identity/users', { 
    params: params || { maxResultCount: 1000 } // 默认拉取最多1000条用于下拉框
  });
};

export function getApplicationConfiguration() {
  return request({
    url: '/api/abp/application-configuration',
    method: 'get'
  });
}


// 上传考勤数据的接口
export function importAttendanceData(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request({
    url: '/api/app/user-management/import-attendance',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // 处理3万条数据可能需要一些时间，延长超时时间至 3 分钟
    timeout: 180000 
  });
}