import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request' 

export const useUserStore = defineStore('user', () => {
  const state = () => ({
    id: '',
    username: '',
    email: '',
    roles: [] as string[],
    userInfo: null as any,
    mustChangePassword: false 
  })

  const token = ref(localStorage.getItem('token') || '')
  
  // 1. 定义用户 ID 与用户基本信息
  const id = ref('') 
  const userInfo = ref<any>({
    id: '',
    userName: '',
    name: '',
    email: ''
  })
  
  // 权限列表
  const permissions = ref<Record<string, boolean>>({})

  /**
   * 核心方法：登录成功后，获取系统配置（同时包含【权限】与【当前用户ID】）
   */
  const fetchApplicationConfiguration = async () => {
    try {
      // 请求 ABP 官方的标准配置接口
      const res = await request({
        url: '/api/abp/application-configuration',
        method: 'get'
      })

      //提取并保存当前登录用户的 ID
      if (res && res.currentUser && res.currentUser.isAuthenticated) {
        const user = res.currentUser
        id.value = user.id || ''
        userInfo.value = {
          id: user.id || '',
          userName: user.userName || '',
          name: user.name || '',
          email: user.email || ''
        }
        
        console.log('成功获取到当前登录用户ID:', id.value)
      }

      //保存系统权限
      if (res && res.auth && res.auth.grantedPolicies) {
        permissions.value = res.auth.grantedPolicies
      }

      return res
    } catch (error) {
      console.error('同步用户权限及ID失败:', error)
      throw error
    }
  }

  //清除登录状态
  const logout = () => {
    token.value = ''
    id.value = ''
    userInfo.value = { id: '', userName: '', name: '', email: '' }
    permissions.value = {}
    localStorage.removeItem('token')
  }

  return {
    token,
    id,
    userInfo,
    permissions,
    fetchApplicationConfiguration,
    logout
  }
})