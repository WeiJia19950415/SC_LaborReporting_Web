import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    vue(),
    basicSsl() 
  ],
  server: {
    port: 5173,
    host: true,
    hmr: {
      protocol: 'wss',     
      host: 'localhost',   
      port: 5173           
    }
  }
})