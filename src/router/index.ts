import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../layout/Layout.vue'; 
import { useUserStore } from '../stores/user'; 
import { checkRequiresPasswordChange } from '../api/user';
import { ElMessage } from 'element-plus'; // 引入 ElMessage 用于拦截提示
import { useSystemConfigStore } from '../stores/systemConfig';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/Home.vue')
      },
      {
        path: 'books',
        name: 'Books',
        component: () => import('../views/Books.vue')
      },
      {
        path: 'users', 
        name: 'Users',
        component: () => import('../views/users/index.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'department', 
        name: 'Department',
        component: () => import('../views/departments/index.vue'),
        meta: { title: '部门管理', icon: 'Memo' } 
      },
      {
        path: 'roles', 
        name: 'Roles',
        component: () => import('../views/roles/index.vue'),
        meta: { title: '角色管理', icon: 'Memo' } 
      },
      {
        path: 'config', 
        name: 'Config',
        component: () => import('../views/systemConfig/index.vue'),
        meta: { title: '系统配置', icon: 'Memo' } 
      },
      {
        path: 'laborCategories', 
        name: 'LaborCategories',
        component: () => import('../views/laborCategories/index.vue'),
        meta: { title: '工时分类设置', icon: 'Memo' } 
      },
      {
        path: 'projects', 
        name: 'Projects',
        component: () => import('../views/projects/index.vue'),
        meta: { title: '项目管理', icon: 'Memo' } 
      },
      {
        path: 'laborReport', 
        name: 'LaborReport',
        component: () => import('../views/laborReport/index.vue'),
        meta: { title: '工时填报', icon: 'Memo' } 
      },
      {
        path: 'projectRoles', 
        name: 'ProjectRoles',
        component: () => import('../views/projectRoles/index.vue'),
        meta: { title: '项目角色管理', icon: 'Memo' } 
      },
      {
        path: 'approval',
        name: 'LaborReportApproval',
        component: () => import('../views/laborReport/approval.vue'),
        meta: { title: '工时审批', icon: 'Check' }
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('../views/reports/departmentReport.vue'),
        meta: { title: '报表查询', icon: 'Check' }
      },
      {
        path: 'userHoursReport',
        name: 'UserHoursReport',
        component: () => import('../views/reports/userCrossReport.vue'),
        meta: { 
          title: '人员有效工时表', 
          icon: 'User',
          isFinance: false // 渲染真实的 Hours
        }
      },
      {
        path: 'userFinanceReport',
        name: 'UserFinanceReport',
        component: () => import('../views/reports/userCrossReport.vue'),
        meta: { 
          title: '人员财务工时表', 
          icon: 'Money',
          isFinance: true // 渲染 Hoursfinance
        }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const isLogin = localStorage.getItem('is_login') === '1'
  const systemConfigStore = useSystemConfigStore()

  // 如果访问的不是登录页，则进行拦截校验
  if (to.name !== 'Login') {
    if (isLogin) {
      if (!userStore.id) { // Vuex/Pinia 状态为空（说明刷新了页面或新开标签页）
        try {
          await userStore.fetchApplicationConfiguration()
          await systemConfigStore.fetchSystemConfig()
          const requiresChange = await checkRequiresPasswordChange()
          if (requiresChange) {
            ElMessage.warning('检测到您的密码为初始密码，必须修改后才能访问系统！')
            userStore.logout() // 清理掉偷跑的token
            next({ name: 'Login' }) // 强制踢回登录页去触发弹窗
            return
          }
          
          next() // 状态正常，正常放行
        } catch (error) {
          console.error('登录失效已过期，请重新登录', error)
          userStore.logout()
          next({ name: 'Login' })
        }
      } else {
        if (!systemConfigStore.isLoaded) {
            await systemConfigStore.fetchSystemConfig();
        } 
        next() // 状态正常，正常放行
      }
    } else {
      next({ name: 'Login' }) // 没登录，跳回登录页
    }
  } else {
    next() // 访问的就是 Login 页，直接放行
  }
})

export default router;