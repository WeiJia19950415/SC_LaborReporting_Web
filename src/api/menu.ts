import request from '@/utils/request' // 如果你已经有 axios 封装

export function getMenus() {
  return request({
    url: '/api/app/menu/getMenus',
    method: 'get'
  })
}