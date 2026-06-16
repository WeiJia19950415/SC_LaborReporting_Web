import request from '../utils/request'

export function getProjectRoles(params?: any) {
  return request({ url: '/api/app/project-role', method: 'get', params })
}

export function createProjectRole(data: any) {
  return request({ url: '/api/app/project-role', method: 'post', data })
}

export function updateProjectRole(id: string, data: any) {
  return request({ url: `/api/app/project-role/${id}`, method: 'put', data })
}

export function deleteProjectRole(id: string) {
  return request({ url: `/api/app/project-role/${id}`, method: 'delete' })
}