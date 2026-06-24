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
    url: '/api/app/account-security/requires-password-change',
    method: 'get'
  })
}
// 提交强制改密
export function forceChangePassword(data: any) {
  return request({
    url: '/api/app/account-security/force-change-password',
    method: 'post',
    data
  })
}