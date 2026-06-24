import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../layout/Layout.vue'; 
import { useUserStore } from '../stores/user'; 
import { checkRequiresPasswordChange } from '../api/user';

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
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// src/router/index.ts

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth) {
    if (localStorage.getItem('is_login') === '1') {
      if (!userStore.id) {
        try {
          await userStore.fetchApplicationConfiguration()
          const requiresChange = await checkRequiresPasswordChange()
          userStore.mustChangePassword = requiresChange
          next()
        } catch (error) {
          console.error('登录失效已过期，请重新登录', error)
          localStorage.removeItem('is_login')
          localStorage.removeItem('token')
          userStore.$reset()
          next({ name: 'Login' })
        }
      } else {
        next()
      }
    } else {
      next({ name: 'Login' })
    }
  } else {
    next()
  }
})

export default router;