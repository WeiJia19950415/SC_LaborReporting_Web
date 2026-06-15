import request from '../utils/request';

// 1. 获取所有部门平铺列表
export function getDepartmentList() {
  return request({
    url: '/api/app/department',
    method: 'get',
  });
}

// 2. 创建部门 (支持根部门或子部门)
export function createDepartment(data: { parentId?: string; displayName: string }) {
  return request({
    url: '/api/app/department',
    method: 'post',
    data,
  });
}

// 3. 修改部门名称
export function updateDepartment(id: string, data: { displayName: string }) {
  return request({
    url: `/api/app/department/${id}`,
    method: 'put',
    data,
  });
}

// 4. 删除部门
export function deleteDepartment(id: string) {
  return request({
    url: `/api/app/department/${id}`,
    method: 'delete',
  });
}

// 5. 根据部门ID获取员工
export function getDepartmentUsers(departmentId: string) {
  return request({
    url: `/api/app/department/users-by-department-id/${departmentId}`,
    method: 'get',
  });
}