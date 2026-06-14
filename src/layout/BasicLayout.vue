<template>
  <div class="layout">
    <Sidebar />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
</script>