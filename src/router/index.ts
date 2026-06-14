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