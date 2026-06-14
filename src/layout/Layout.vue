<template>
  <div class="layout">
    <Sidebar :menus="menus" />

    <div class="main">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from "./Sidebar.vue";
import { useMenuStore } from "../stores/menu";

const menuStore = useMenuStore();
const menus = menuStore.menus;
</script>

<style>
.layout {
  display: flex;
}
.main {
  flex: 1;
  padding: 20px;
}
</style>