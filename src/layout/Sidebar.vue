<template>
  <el-menu :router="true" :default-active="$route.path">
    <template v-for="item in menus" :key="item.path">
      <el-sub-menu v-if="item.children && item.children.length" :index="item.path">
        <template #title>
          <i :class="item.icon"></i>
          <span>{{ item.name }}</span>
        </template>
        <el-menu-item
          v-for="child in item.children"
          :key="child.path"
          :index="child.path"
        >
          {{ child.name }}
        </el-menu-item>
      </el-sub-menu>
      <el-menu-item v-else :index="item.path">
        <i :class="item.icon"></i>
        {{ item.name }}
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'

const menuStore = useMenuStore()
onMounted(() => {
  menuStore.fetchMenus()
})
const menus = menuStore.menus
</script>