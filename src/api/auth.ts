import request from '../utils/request';
/**
 * 1. 账号密码登录 
 * 注意：ABP默认的登录可能是访问 /connect/token，如果你系统里已经有登录方法，直接复用即可。
 */
export function login(data: any) {
  return request({
    url: '/api/account/login', // 请替换为你们系统真实的账号密码登录API路径
    method: 'post',
    data
  })
}

/**
 * 2. 企微 Code 静默登录
 * @param data { code: '企微回调URL上带的code' }
 */
export function loginByWeComCode(data: { code: string }) {
  return request({
    url: '/api/app/we-com-auth/login-by-we-com-code',
    method: 'post',
    data
  })
}

/**
 * 3. 绑定企业微信 UserId
 * @param data { weComUserId: '企微的UserID' }
 */
export function bindWeComUserId(data: { weComUserId: string }) {
  return request({
    url: '/api/app/we-com-auth/bind-we-com-user-id',
    method: 'post',
    data
  })
}