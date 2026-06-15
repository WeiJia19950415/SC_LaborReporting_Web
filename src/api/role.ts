import request from '../utils/request';

// ================= 角色 CRUD 接口 =================
// 获取角色列表
export function getRoleList(params: any) {
  return request({ url: '/api/identity/roles', method: 'get', params });
}
// 新增角色
export function createRole(data: any) {
  return request({ url: '/api/identity/roles', method: 'post', data });
}
// 修改角色
export function updateRole(id: string, data: any) {
  return request({ url: `/api/identity/roles/${id}`, method: 'put', data });
}
// 删除角色
export function deleteRole(id: string) {
  return request({ url: `/api/identity/roles/${id}`, method: 'delete' });
}

// ================= 权限管理接口 =================
// 获取指定角色的权限清单（ providerName: 'R' 代表 Role, providerKey: 角色名称 ）
export function getRolePermissions(roleName: string) {
  return request({ 
    url: '/api/permission-management/permissions', 
    method: 'get', 
    params: { providerName: 'R', providerKey: roleName } 
  });
}

// 保存角色的权限配置
export function updateRolePermissions(roleName: string, data: any) {
  return request({ 
    url: '/api/permission-management/permissions', 
    method: 'put', 
    params: { providerName: 'R', providerKey: roleName },
    data 
  });
}