import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ===== 游客端 =====
    {
      path: '/',
      name: 'Landing',
      component: () => import('@/views/Landing.vue'),
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/questionnaire',
      name: 'Questionnaire',
      component: () => import('@/views/Questionnaire.vue'),
    },
    {
      path: '/home',
      name: 'Home',
      component: () => import('@/views/Home.vue'),
    },

    // ===== 管理后台 =====
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      redirect: '/admin/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'AdminDashboard',
          component: () => import('@/views/admin/Dashboard.vue'),
        },
        {
          path: 'knowledge',
          name: 'KnowledgeBase',
          component: () => import('@/views/admin/KnowledgeBase.vue'),
        },
        {
          path: 'digital-human',
          name: 'DigitalHuman',
          component: () => import('@/views/admin/DigitalHuman.vue'),
        },
        {
          path: 'analytics',
          name: 'Analytics',
          component: () => import('@/views/admin/Analytics.vue'),
        },
      ],
    },
  ],
})

// ===== 路由守卫 =====
router.beforeEach((to, _from, next) => {
  // 管理后台：需登录 + admin 角色
  if (to.path.startsWith('/admin')) {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!token) {
      ElMessage.warning('请先登录')
      return next('/login')
    }
    if (role !== 'admin') {
      ElMessage.warning('无权访问管理后台')
      return next('/')
    }
  }
  // 首页和问卷：需登录
  if (to.path === '/home' || to.path === '/questionnaire') {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.warning('请先登录')
      return next('/login')
    }
  }
  next()
})

export default router
