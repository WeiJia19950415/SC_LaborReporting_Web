import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: { protocol: 'ws', host: '127.0.0.1' },
    
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:44355', // 注意：你发的是 https，所以这里必须用 https，端口是 44355
        changeOrigin: true,
        secure: false, // 忽略自签名证书错误（必须为 false，否则代理 https 会报错）
        headers: { 'Host': 'localhost:44355' } // 骗过 IIS Express
      },
      '/connect': { 
        target: 'https://127.0.0.1:44355',
        gin: true,
        secure: false,
        headers: { 'Host': 'localhost:44355' }
      },
      // 【关键新增】：专门为这俩没有 /api 前缀的接口开通代理绿色通道
      '/requires-password-change': {
        target: 'https://127.0.0.1:44355',
        changeOrigin: true,
        secure: false,
        headers: { 'Host': 'localhost:44355' }
      },
      '/force-change-password': {
        target: 'https://127.0.0.1:44355',
        changeOrigin: true,
        secure: false,
        headers: { 'Host': 'localhost:44355' }
      }
    }
  }
})