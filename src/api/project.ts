import request from '../utils/request'

// 获取项目列表
export function getProjects(params: any) {
  return request({
    url: '/api/app/project',
    method: 'get',
    params
  })
}

// 创建项目
export function createProject(data: any) {
  return request({
    url: '/api/app/project',
    method: 'post',
    data
  })
}

// 更新项目
export function updateProject(id: string, data: any) {
  return request({
    url: `/api/app/project/${id}`,
    method: 'put',
    data
  })
}

// 删除项目
export function deleteProject(id: string) {
  return request({
    url: `/api/app/project/${id}`,
    method: 'delete'
  })
}