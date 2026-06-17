import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../layout/Layout.vue'; 
import { useUserStore } from '../stores/user'; 

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
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const isLogin = localStorage.getItem('is_login');
  if (to.name !== 'Login' && !isLogin) {
    next({ name: 'Login' });
  } else {
    if (isLogin && to.name !== 'Login') {
      const userStore = useUserStore();
      if (!userStore.id) {
        try {
          await userStore.fetchApplicationConfiguration();
          next({ ...to, replace: true });
        } catch (error) {
          console.error('刷新时获取用户信息失败，可能 Token 已过期');
          userStore.logout();
          next({ name: 'Login' });
        }
      } else {
        next();
      }
    } else {
      next();
    }
  }
});

export default router;