<template>
  <el-container class="app-wrapper">
    <el-aside width="200px" class="sidebar-container">
      <div class="logo">报工系统</div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <span>首页大盘</span>
        </el-menu-item>

        <el-menu-item index="/books" v-if="hasPermission('SC_LaborReporting.Books')">
          <el-icon><Reading /></el-icon>
          <span>书籍管理</span>
        </el-menu-item>

        <el-sub-menu index="system" v-if="hasPermission('AbpIdentity.Users') || hasPermission('AbpIdentity.Roles')">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
            <el-menu-item index="/users" v-if="hasPermission('AbpIdentity.Users')">
              <el-icon><User /></el-icon>
              用户管理
            </el-menu-item>
            
            <el-menu-item index="/department" v-if="hasPermission('AbpIdentity.Users')">
              <el-icon><User /></el-icon>
              部门管理
            </el-menu-item>
            
            <el-menu-item index="/roles" v-if="hasPermission('AbpIdentity.Roles')">
              <el-icon><UserFilled /></el-icon>
              角色管理
            </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="system2" v-if="hasPermission('AbpIdentity.Users') || hasPermission('AbpIdentity.Roles')">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>基础数据管理</span>
          </template>
            <el-menu-item index="/laborCategories" v-if="hasPermission('AbpIdentity.Users')">
              <el-icon><el-icon-collection-tag /></el-icon>
              工时分类设置
            </el-menu-item>

        </el-sub-menu>


        
        <el-menu-item @click="logout" index="">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="main-container">
      <el-header class="app-header">
        <div class="header-breadcrumb">欢迎使用 思创激光报工 系统</div>
      </el-header>
      
      <el-main class="app-main">
        <router-view />
      </el-main>

      <el-footer class="app-footer">
        Copyright © {{ new Date().getFullYear() }} 四川思创激光科技有限公司 
      </el-footer>
      
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getMyPermissionsApi } from '../api/index'; 
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();

// 存储从后端获取的权限列表
const permissions = ref<string[]>([]);

// 自动高亮当前所在的菜单项
const activeMenu = computed(() => route.path);

// 判断是否拥有某个权限的方法
const hasPermission = (permissionName: string) => {
  return permissions.value.includes(permissionName);
};

const logout = () => {
  localStorage.removeItem('is_login'); // 清除登录标记
  router.push('/login');
};

// 页面加载时请求权限接口
const fetchMyPermissions = async () => {
  try {
    const res: any = await getMyPermissionsApi();
    if (res && Array.isArray(res)) {
      permissions.value = res; 
    }
  } catch (error) {
    console.error("获取权限失败", error);
  }
};

// 组件挂载时执行
onMounted(() => {
  fetchMyPermissions();
});
</script>

<style scoped>
/* 让最外层包裹器铺满全屏 */
.app-wrapper {
  height: 100vh;
  width: 100vw;
  display: flex;
}

/* 侧边栏样式 */
.sidebar-container {
  background-color: #304156;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 侧边栏 Logo */
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-weight: bold;
  font-size: 18px;
  background-color: #2b3643;
  flex-shrink: 0;
}

/* 去除菜单自带的右侧边框 */
.el-menu-vertical {
  border-right: none;
  flex-grow: 1;
}

/* 右侧内容区容器 */
.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* 右侧顶部导航条 */
.app-header {
  height: 60px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 10;
}

/* 右侧页面主体 */
.app-main {
  background-color: #f0f2f5;
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

/* ⭐ 新增：页脚样式 */
.app-footer {
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 13px;
  color: #909399; /* 柔和的灰色 */
  background-color: #f0f2f5; /* 与主体背景色保持一致，或者改为 #fff */
  letter-spacing: 1px;
}
</style>