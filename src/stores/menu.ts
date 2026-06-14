// src/stores/menu.ts
import { defineStore } from 'pinia'
import { getMenus } from '@/api/menu'

export const useMenuStore = defineStore('menu', {
  state: () => ({
    menus: [] as any[]
  }),
  actions: {
    async fetchMenus() {
      const res = await getMenus()
      this.menus = res
    }
  }
})