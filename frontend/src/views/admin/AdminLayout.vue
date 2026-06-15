<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { DataBoard, Document, UserFilled, TrendCharts } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const menuItems = [
  { path: '/admin/dashboard', label: '数据大屏', icon: DataBoard },
  { path: '/admin/knowledge', label: '知识库管理', icon: Document },
  { path: '/admin/digital-human', label: '数字人管理', icon: UserFilled },
  { path: '/admin/analytics', label: '游客分析', icon: TrendCharts },
]

function isActive(path: string) {
  return route.path === path
}

function backToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <svg class="logo-svg" width="26" height="26" viewBox="0 0 41 40" fill="none">
          <defs>
            <linearGradient id="alLogoGrad" x1="20.2692" y1="0" x2="20.2692" y2="39.2308" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FFE1CC" />
              <stop offset="100%" stop-color="#FFFFFF" />
            </linearGradient>
          </defs>
          <path d="M25.5 0L29.5617 10.9767L40.5385 15.0385L29.5617 19.1002L25.5 30.0769L21.4382 19.1002L10.4615 15.0385L21.4382 10.9767L25.5 0Z" fill="url(#alLogoGrad)" />
          <path d="M10.4615 18.3077L13.2871 25.9437L20.9231 28.7692L13.2871 31.5948L10.4615 39.2308L7.63597 31.5948L0 28.7692L7.63597 25.9437L10.4615 18.3077Z" fill="url(#alLogoGrad)" opacity="0.6" />
        </svg>
        <span class="title">灵境-数据管理后台</span>
      </div>
      <div class="sidebar-menu">
        <div
          v-for="item in menuItems"
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          @click="router.push(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </div>
      </div>
      <div class="sidebar-footer">
        <el-button text @click="backToLogin">← 返回首页</el-button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="main-area">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  width: 100%;
  height: 100%;
  display: flex;
}

.sidebar {
  width: 220px;
  height: 100%;
  background: #1d1e2c;
  color: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.sidebar-header .logo-svg {
  flex-shrink: 0;
}

.sidebar-header .title {
  font-size: 16px;
  font-weight: 600;
}

.sidebar-menu {
  flex: 1;
  padding: 12px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  cursor: pointer;
  color: rgba(255,255,255,0.6);
  font-size: 14px;
  transition: all 0.2s;
}

.menu-item:hover {
  background: rgba(255,255,255,0.06);
  color: #fff;
}

.menu-item.active {
  background: rgba(102,126,234,0.3);
  color: #fff;
  border-right: 3px solid #667eea;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.sidebar-footer :deep(.el-button) {
  color: rgba(255,255,255,0.5);
}

.main-area {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}
</style>
