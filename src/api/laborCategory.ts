import request from '../utils/request';

export function getLaborCategoryList() {
  return request({ url: '/api/app/labor-category', method: 'get' });
}
export function createLaborCategory(data: any) {
  return request({ url: '/api/app/labor-category', method: 'post', data });
}
export function updateLaborCategory(id: string, data: any) {
  return request({ url: `/api/app/labor-category/${id}`, method: 'put', data });
}
export function deleteLaborCategory(id: string) {
  return request({ url: `/api/app/labor-category/${id}`, method: 'delete' });
}

export function getLeafCategories(params: { projectRoleId?: string, departmentId?: string, laborClass: number }) {
  return request({
    url: '/api/app/labor-category/leaf-categories',
    method: 'get',
    params
  })
}