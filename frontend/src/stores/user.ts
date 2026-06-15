import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserProfile } from '@/types/chat'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const isLoggedIn = ref(false)
  const role = ref<'user' | 'admin' | ''>('')
  const username = ref('')
  const avatar = ref('')
  const email = ref('')
  const phone = ref('')
  const hasCompletedQuestionnaire = ref(false)
  const userProfile = ref<UserProfile | null>(null)

  function login(t: string, user?: { username?: string; avatar?: string; email?: string; phone?: string; role?: string; hasCompletedQuestionnaire?: boolean }) {
    token.value = t
    isLoggedIn.value = true
    username.value = user?.username || ''
    avatar.value = user?.avatar || ''
    email.value = user?.email || ''
    phone.value = user?.phone || ''
    role.value = (user?.role as 'user' | 'admin') || 'user'
    hasCompletedQuestionnaire.value = user?.hasCompletedQuestionnaire || false
    localStorage.setItem('token', t)
    localStorage.setItem('username', username.value)
    localStorage.setItem('avatar', avatar.value)
    localStorage.setItem('email', email.value)
    localStorage.setItem('phone', phone.value)
    localStorage.setItem('role', role.value)
  }

  function logout() {
    token.value = ''
    isLoggedIn.value = false
    username.value = ''
    avatar.value = ''
    email.value = ''
    phone.value = ''
    role.value = ''
    hasCompletedQuestionnaire.value = false
    userProfile.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('avatar')
    localStorage.removeItem('email')
    localStorage.removeItem('phone')
    localStorage.removeItem('role')
  }

  function saveProfile(profile: UserProfile) {
    userProfile.value = profile
    hasCompletedQuestionnaire.value = true
  }

  // 初始化：从 localStorage 恢复登录状态
  const savedToken = localStorage.getItem('token')
  if (savedToken) {
    token.value = savedToken
    isLoggedIn.value = true
    username.value = localStorage.getItem('username') || ''
    avatar.value = localStorage.getItem('avatar') || ''
    email.value = localStorage.getItem('email') || ''
    phone.value = localStorage.getItem('phone') || ''
    role.value = (localStorage.getItem('role') as 'user' | 'admin') || 'user'
  }

  return { token, isLoggedIn, username, avatar, email, phone, role, hasCompletedQuestionnaire, userProfile, login, logout, saveProfile }
})
