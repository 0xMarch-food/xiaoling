<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import type { LoginForm, RegisterForm } from '@/types/chat'
import backgroundSvg from '@/assets/background.svg'

const API_BASE = 'http://localhost:3000/api'

const router = useRouter()
const userStore = useUserStore()

const isLogin = ref(true)

// 登录表单
const loginForm = reactive<LoginForm>({
  account: '',
  password: '',
  loginType: 'phone',
})
const loginLoading = ref(false)

async function handleLogin() {
  if (!loginForm.account || !loginForm.password) {
    ElMessage.warning('请填写账号和密码')
    return
  }
  loginLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: loginForm.account, password: loginForm.password }),
    })
    const data = await res.json()
    if (data.code === 200) {
      userStore.login(data.data.token, data.data.user)
      ElMessage.success(data.message || '登录成功')
      // 管理员 → 后台大屏；普通用户 → 问卷或首页
      if (data.data.user.role === 'admin') {
        router.push('/admin')
      } else if (data.data.user.hasCompletedQuestionnaire) {
        router.push('/home')
      } else {
        router.push('/questionnaire')
      }
    } else {
      ElMessage.error(data.message || '登录失败')
    }
  } catch {
    ElMessage.error('网络错误，请检查后端服务是否启动')
  } finally {
    loginLoading.value = false
  }
}

// 注册表单
const registerForm = reactive<RegisterForm>({
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
})
const registerLoading = ref(false)

async function handleRegister() {
  if (!registerForm.username || !registerForm.email || !registerForm.password) {
    ElMessage.warning('请填写所有必填项')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }
  registerLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: registerForm.username,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password,
      }),
    })
    const data = await res.json()
    if (data.code === 201) {
      ElMessage.success('注册成功，请登录')
      isLogin.value = true
    } else {
      ElMessage.error(data.message || '注册失败')
    }
  } catch {
    ElMessage.error('网络错误，请检查后端服务是否启动')
  } finally {
    registerLoading.value = false
  }
}

function switchMode() {
  isLogin.value = !isLogin.value
}
</script>

<template>
  <div class="login-page">
    <!-- 背景 -->
    <img :src="backgroundSvg" class="bg-image" alt="" />

    <!-- 左上返回 -->
    <div class="back-arrow" @click="router.push('/')">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12 4L6 10L12 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <!-- 卡片 -->
    <div class="login-card">
      <!-- 顶部 Logo -->
      <div class="card-logo">
        <svg
          class="logomark"
          width="28"
          height="32"
          viewBox="0 0 28 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="loginLogoGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stop-color="#FFE1CC" />
              <stop offset="100%" stop-color="#FFFFFF" />
            </radialGradient>
          </defs>
          <path
            d="M14 0L16.8 10.4L27 12.8L16.8 15.2L14 25.6L11.2 15.2L1 12.8L11.2 10.4L14 0Z"
            fill="url(#loginLogoGrad)"
          />
          <path
            d="M5 16L6.6 20.8L11.2 22.4L6.6 24L5 28.8L3.4 24L1 22.4L3.4 20.8L5 16Z"
            fill="url(#loginLogoGrad)"
            opacity="0.6"
          />
        </svg>
        <span class="logo-text">灵境·AI导览</span>
      </div>
      <p class="card-subtitle">AI 数字人导游 · 灵山胜境智能导览系统</p>

      <!-- ===== 登录 ===== -->
      <template v-if="isLogin">
        <div class="login-type-tabs">
          <span
            :class="{ active: loginForm.loginType === 'phone' }"
            @click="loginForm.loginType = 'phone'"
          >手机号</span>
          <span
            :class="{ active: loginForm.loginType === 'email' }"
            @click="loginForm.loginType = 'email'"
          >邮箱</span>
          <span
            :class="{ active: loginForm.loginType === 'username' }"
            @click="loginForm.loginType = 'username'"
          >用户名</span>
        </div>

        <el-form @submit.prevent="handleLogin" class="form-area">
          <el-form-item>
            <el-input
              v-model="loginForm.account"
              :placeholder="loginForm.loginType === 'phone' ? '请输入手机号' : loginForm.loginType === 'email' ? '请输入邮箱' : '请输入用户名'"
              size="large"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
            />
          </el-form-item>
          <button
            type="submit"
            class="submit-btn"
            :disabled="loginLoading"
          >
            {{ loginLoading ? '登录中...' : '登 录' }}
          </button>
        </el-form>
      </template>

      <!-- ===== 注册 ===== -->
      <template v-else>
        <el-form @submit.prevent="handleRegister" class="form-area">
          <el-form-item>
            <el-input v-model="registerForm.username" placeholder="用户名" size="large" clearable />
          </el-form-item>
          <el-form-item>
            <el-input v-model="registerForm.email" placeholder="邮箱" size="large" clearable />
          </el-form-item>
          <el-form-item>
            <el-input v-model="registerForm.phone" placeholder="手机号（选填）" size="large" clearable />
          </el-form-item>
          <el-form-item>
            <el-input v-model="registerForm.password" type="password" placeholder="密码" size="large" show-password />
          </el-form-item>
          <el-form-item>
            <el-input v-model="registerForm.confirmPassword" type="password" placeholder="确认密码" size="large" show-password />
          </el-form-item>
          <button
            type="submit"
            class="submit-btn"
            :disabled="registerLoading"
          >
            {{ registerLoading ? '注册中...' : '注 册' }}
          </button>
        </el-form>
      </template>

      <!-- 切换 -->
      <div class="switch-link">
        <span v-if="isLogin">还没有账号？<a @click="switchMode">立即注册</a></span>
        <span v-else>已有账号？<a @click="switchMode">马上登录</a></span>
      </div>
  </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&family=Noto+Sans+SC:wght@400;500;700&display=swap');
</style>

<style scoped>
/* ===== 整体 ===== */
.login-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #0a0a0f;
}

.bg-image {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  pointer-events: none;
  z-index: 0;
}

/* ===== 返回箭头 ===== */
.back-arrow {
  position: fixed;
  top: 40px;
  left: 40px;
  z-index: 10;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.2s;
}

.back-arrow:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* ===== 卡片 ===== */
.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  padding: 44px 40px 32px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* ---- Logo ---- */
.card-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
}

.logomark {
  flex-shrink: 0;
}

.logo-text {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: #fff;
  white-space: nowrap;
}

.card-subtitle {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 32px;
}

/* ---- 登录方式切换 ---- */
.login-type-tabs {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-bottom: 24px;
}

.login-type-tabs span {
  cursor: pointer;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  padding-bottom: 6px;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.login-type-tabs span.active {
  color: #FFE1CC;
  border-bottom-color: #FFE1CC;
}

.login-type-tabs span:hover {
  color: rgba(255, 255, 255, 0.75);
}

/* ---- 表单 ---- */
.form-area {
  margin-top: 4px;
}

.form-area :deep(.el-form-item) {
  margin-bottom: 16px;
}

.form-area :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: none !important;
  transition: border-color 0.3s;
}

.form-area :deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

.form-area :deep(.el-input__wrapper.is-focus) {
  border-color: #FFE1CC;
}

.form-area :deep(.el-input__inner) {
  color: #fff;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.form-area :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.3);
}

.form-area :deep(.el-input__suffix) {
  color: rgba(255, 255, 255, 0.3);
}

.form-area :deep(.el-input__clear) {
  color: rgba(255, 255, 255, 0.3);
}

/* ---- 提交按钮 ---- */
.submit-btn {
  width: 100%;
  height: 44px;
  margin-top: 8px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 500;
  font-size: 15px;
  letter-spacing: 4px;
  color: #111111;
  background: linear-gradient(to right, #FFE1CC, #FFFFFF);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(255, 225, 204, 0.25);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ---- 切换链接 ---- */
.switch-link {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

.switch-link a {
  color: #FFE1CC;
  cursor: pointer;
  font-weight: 500;
}

.switch-link a:hover {
  text-decoration: underline;
}
</style>
