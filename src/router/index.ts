import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../layout/Layout.vue'; 
import { useUserStore } from '../stores/user'; 
import { checkRequiresPasswordChange } from '../api/user';
import { ElMessage } from 'element-plus';
import { useSystemConfigStore } from '../stores/systemConfig';

// 引入环境判断方法和移动端提示组件 (需确保你已创建该方法并安装了vant)
import { isWeComOrMobile } from '../utils/env'; 
import { showToast } from 'vant';

const routes = [
  // ================= 移动端/企微 专属路由 =================
  {
    path: '/mobile/login',
    name: 'MobileLogin',
    component: () => import('../views/mobile/loginBind.vue'),
    meta: { title: '绑定企微' }
  },
  {
    path: '/mobile/laborReport/list',
    name: 'MobileReportList',
    component: () => import('../views/mobile/laborReport/list.vue'),
    meta: { title: '我的报工' }
  },
  {
    path: '/mobile/laborReport/detail',
    name: 'MobileReportDetail',
    component: () => import('../views/mobile/laborReport/detail.vue'),
    meta: { title: '工时填报' }
  },

  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    component: Layout,
    redirect: '/home', // PC端真实的首页入口在这里
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
        path: 'productseries',
        name: 'productseries',
        component: () => import('../views/productSeries/index.vue'),
        meta: { title: '产品系列维护' }
      },
      {
        path: 'laborReport', 
        name: 'LaborReport',
        component: () => import('../views/laborReport/index.vue'),
        meta: { title: '工时填报', icon: 'Memo' } 
      },
      {
        path: 'laborReportHistory', 
        name: 'LaborReportHistory',
        component: () => import('../views/laborReportHistory/index.vue'),
        meta: { title: '工时填报-历史', icon: 'Memo' } 
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
          isFinance: false 
        }
      },
      {
        path: 'userFinanceReport',
        name: 'UserFinanceReport',
        component: () => import('../views/reports/userCrossReport.vue'),
        meta: { 
          title: '人员财务工时表', 
          icon: 'Money',
          isFinance: true 
        }
      },
      {
        path: 'laborReportSummary',
        name: 'laborReportSummary',
        component: () => import('../views/reports/laborReportSummarys.vue'),
        meta: { 
          title: '工时汇总报表', 
          icon: 'Money'
        }
      },
      {
        path: 'unsubmitted',
        name: 'unsubmitted',
        component: () => import('../views/reports/unsubmittedReport.vue'),
        meta: { 
          title: '未交工时人员清单', 
          icon: 'User'
        }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// ================= 全局路由守卫 =================
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const isLogin = localStorage.getItem('is_login') === '1'
  const systemConfigStore = useSystemConfigStore()

  // 1. 获取当前环境并动态设置 登录路由 和 首页路径
  const isMobileEnv = isWeComOrMobile()
  const LOGIN_NAME = isMobileEnv ? 'MobileLogin' : 'Login'
  // 根据你上面的代码，PC端的默认首页重定向是 '/'
  const HOME_PATH = isMobileEnv ? '/mobile/list' : '/' 

  // 2. 环境隔离拦截：PC不能去移动端页面，移动端不能去PC页面
  const isToMobileRoute = to.path.startsWith('/mobile')
  if (isMobileEnv && !isToMobileRoute && to.name !== 'Login') {
    return next({ path: HOME_PATH, query: to.query })
  }
  if (!isMobileEnv && isToMobileRoute && to.name !== 'MobileLogin') {
    return next({ path: HOME_PATH, query: to.query })
  }

  // 3. 处理访问登录页的情况
  if (to.name === 'Login' || to.name === 'MobileLogin') {
    if (isLogin) {
      // 已经登录了，踢回首页
      return next({ path: HOME_PATH })
    } else {
      // 未登录时，如果环境不对，强行纠正登录页面
      if ((isMobileEnv && to.name === 'Login') || (!isMobileEnv && to.name === 'MobileLogin')) {
        return next({ name: LOGIN_NAME, query: to.query })
      }
      return next() // 环境正确，放行到登录页
    }
  }

  // 4. 未登录拦截：如果是未登录状态，拦截到对应环境的登录页
  if (!isLogin) {
    // 【关键】保留 query，为了让企业微信的 ?code=xxx 能够传递到登录页
    return next({ name: LOGIN_NAME, query: to.query })
  }

  // 5. 已登录状态的校验 (完全复用你原有的校验逻辑)
  if (!userStore.id) { // Vuex/Pinia 状态为空（说明刷新了页面或新开标签页）
    try {
      await userStore.fetchApplicationConfiguration()
      await systemConfigStore.fetchSystemConfig()
      
      const requiresChange = await checkRequiresPasswordChange()
      if (requiresChange) {
        // 根据环境使用不同的弹窗UI
        if (isMobileEnv) {
          showToast('必须修改初始密码后才能访问')
        } else {
          ElMessage.warning('检测到您的密码为初始密码，必须修改后才能访问系统！')
        }
        userStore.logout() // 清理掉偷跑的token
        return next({ name: LOGIN_NAME }) // 强制踢回对应的登录页
      }
      
      next() // 状态正常，正常放行
    } catch (error) {
      console.error('登录失效已过期，请重新登录', error)
      userStore.logout()
      return next({ name: LOGIN_NAME })
    }
  } else {
    if (!systemConfigStore.isLoaded) {
      await systemConfigStore.fetchSystemConfig();
    } 
    next() // 状态正常，正常放行
  }
})

export default router;