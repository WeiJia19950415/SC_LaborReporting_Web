import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../layout/Layout.vue'; 

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    component: Layout, // 全局唯一的布局外壳
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
        path: 'department', // 全路径匹配 /system/department
        name: 'Department',
        component: () => import('../views/departments/index.vue'),
        meta: { title: '部门管理', icon: 'Memo' } 
      },
      {
        path: 'roles', // 全路径匹配 /system/department
        name: 'Roles',
        component: () => import('../views/roles/index.vue'),
        meta: { title: '角色管理', icon: 'Memo' } 
      },
      {
        path: 'laborCategories', // 全路径匹配 /system/department
        name: 'LaborCategories',
        component: () => import('../views/laborCategories/index.vue'),
        meta: { title: '工时分类设置', icon: 'Memo' } 
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const isLogin = localStorage.getItem('is_login');
  if (to.name !== 'Login' && !isLogin) {
    next({ name: 'Login' });
  } else {
    next();
  }
});

export default router;