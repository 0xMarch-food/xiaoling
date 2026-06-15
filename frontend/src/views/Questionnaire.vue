<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import type { UserProfile } from '@/types/chat'
import backgroundSvg from '@/assets/background.svg'

const API_BASE = 'http://localhost:3000/api'

const router = useRouter()
const userStore = useUserStore()

const currentStep = ref(0)
const loading = ref(false)

const steps = [
  { title: '基础信息', icon: '👤' },
  { title: '地域信息', icon: '📍' },
  { title: '语言偏好', icon: '💬' },
  { title: '兴趣标签', icon: '🏷️' },
  { title: '游玩风格', icon: '🎯' },
]

const form = reactive<UserProfile>({
  name: '',
  gender: '',
  age: 0,
  country: '中国',
  province: '江苏',
  city: '无锡',
  hometown: '',
  nativeLanguage: '普通话',
  interests: [],
  travelStyle: '',
})

const interestOptions = ['历史文化', '古建筑', '美食', '自然风景', '摄影打卡', '民俗文化', '博物馆', '红色文化']
const travelStyleOptions = [
  { value: '深度游', desc: '深入了解文化内涵，慢慢品味每一处细节' },
  { value: '快速游', desc: '高效打卡核心景点，半天到一天走完精华' },
  { value: '家庭游', desc: '适合全家老小，轻松舒适的游览节奏' },
  { value: '情侣游', desc: '浪漫打卡，寻找最美的拍照点' },
  { value: '亲子游', desc: '寓教于乐，让孩子边玩边学' },
]
const languageOptions = ['普通话', '英语', '四川话', '粤语', '东北话', '闽南语']

// 语言推荐
const showLangDialog = ref(false)
const recommendedLang = ref('')

function checkLangRecommend() {
  if (form.hometown && form.hometown.includes('四川')) {
    recommendedLang.value = '四川话'
    showLangDialog.value = true
  } else if (form.hometown && form.hometown.includes('广东')) {
    recommendedLang.value = '粤语'
    showLangDialog.value = true
  }
}

function acceptLang() {
  form.nativeLanguage = recommendedLang.value
  showLangDialog.value = false
  router.push('/home')
}

function rejectLang() {
  showLangDialog.value = false
  router.push('/home')
}

// 导航
const isFirstStep = computed(() => currentStep.value === 0)
const isLastStep = computed(() => currentStep.value === steps.length - 1)

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 提交
async function handleSubmit() {
  if (!form.name || !form.gender || !form.hometown) {
    ElMessage.warning('请填写姓名、性别和家乡')
    return
  }
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/questionnaire`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.token}`,
      },
      body: JSON.stringify({
        name: form.name,
        gender: form.gender,
        age: form.age,
        country: form.country,
        province: form.province,
        city: form.city,
        hometown: form.hometown,
        nativeLanguage: form.nativeLanguage,
        interests: form.interests,
        travelStyle: form.travelStyle,
      }),
    })
    const data = await res.json()
    if (data.code === 200) {
      userStore.saveProfile({ ...form })
      checkLangRecommend()
      if (!showLangDialog.value) {
        ElMessage.success(data.message || '保存成功')
        router.push('/home')
      }
    } else {
      ElMessage.error(data.message || '保存失败')
    }
  } catch {
    ElMessage.error('网络错误，请检查后端服务是否启动')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="questionnaire-page">
    <!-- 背景 -->
    <img :src="backgroundSvg" class="bg-image" alt="" />

    <!-- 卡片 -->
    <div class="q-card">
      <!-- Logo -->
      <div class="card-logo">
        <svg class="logomark" width="28" height="32" viewBox="0 0 28 32" fill="none">
          <defs>
            <radialGradient id="qLogoGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stop-color="#FFE1CC" />
              <stop offset="100%" stop-color="#FFFFFF" />
            </radialGradient>
          </defs>
          <path d="M14 0L16.8 10.4L27 12.8L16.8 15.2L14 25.6L11.2 15.2L1 12.8L11.2 10.4L14 0Z" fill="url(#qLogoGrad)" />
          <path d="M5 16L6.6 20.8L11.2 22.4L6.6 24L5 28.8L3.4 24L1 22.4L3.4 20.8L5 16Z" fill="url(#qLogoGrad)" opacity="0.6" />
        </svg>
        <span class="logo-text">完善个人画像</span>
      </div>
      <p class="card-subtitle">AI导游小灵将根据您的偏好，定制专属讲解内容</p>

      <!-- 进度条 -->
      <div class="progress-bar-wrap">
        <span class="progress-label">{{ steps[currentStep].title }}</span>
        <span class="progress-num">{{ currentStep + 1 }} / {{ steps.length }}</span>
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: ((currentStep + 1) / steps.length * 100) + '%' }"
          />
        </div>
      </div>

      <!-- ===== Step 0: 基础信息 ===== -->
      <div v-show="currentStep === 0" class="step-content">
        <h3 class="step-title">基础信息</h3>
        <el-form label-position="top">
          <el-form-item label="姓名">
            <el-input v-model="form.name" placeholder="请输入您的姓名" size="large" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="性别">
                <el-select v-model="form.gender" placeholder="请选择" size="large" popper-class="q-popper" style="width:100%">
                  <el-option label="男" value="男" />
                  <el-option label="女" value="女" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="年龄">
                <el-input-number v-model="form.age" :min="1" :max="120" size="large" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- ===== Step 1: 地域信息 ===== -->
      <div v-show="currentStep === 1" class="step-content">
        <h3 class="step-title">地域信息</h3>
        <el-form label-position="top">
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="国家">
                <el-input v-model="form.country" size="large" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="省份">
                <el-input v-model="form.province" placeholder="如：江苏" size="large" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="城市">
                <el-input v-model="form.city" placeholder="如：无锡" size="large" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="家乡">
            <el-input v-model="form.hometown" placeholder="如：四川成都" size="large" />
          </el-form-item>
        </el-form>
      </div>

      <!-- ===== Step 2: 语言偏好 ===== -->
      <div v-show="currentStep === 2" class="step-content">
        <h3 class="step-title">语言偏好</h3>
        <p class="step-desc">选择您最习惯的语言，AI 导游将用该语言为您讲解</p>
        <div class="lang-options">
          <button
            v-for="lang in languageOptions"
            :key="lang"
            class="lang-btn"
            :class="{ active: form.nativeLanguage === lang }"
            @click="form.nativeLanguage = lang"
          >
            {{ lang }}
          </button>
        </div>
      </div>

      <!-- ===== Step 3: 兴趣标签 ===== -->
      <div v-show="currentStep === 3" class="step-content">
        <h3 class="step-title">兴趣标签</h3>
        <p class="step-desc">选择您感兴趣的类别（可多选），AI 导游将重点介绍相关内容</p>
        <div class="interest-options">
          <button
            v-for="item in interestOptions"
            :key="item"
            class="interest-btn"
            :class="{ active: form.interests.includes(item) }"
            @click="
              form.interests.includes(item)
                ? (form.interests = form.interests.filter(i => i !== item))
                : form.interests.push(item)
            "
          >
            {{ item }}
          </button>
        </div>
      </div>

      <!-- ===== Step 4: 游玩风格 ===== -->
      <div v-show="currentStep === 4" class="step-content">
        <h3 class="step-title">游玩风格</h3>
        <p class="step-desc">选择最符合您的游览方式</p>
        <div class="style-options">
          <button
            v-for="style in travelStyleOptions"
            :key="style.value"
            class="style-card"
            :class="{ active: form.travelStyle === style.value }"
            @click="form.travelStyle = style.value"
          >
            <span class="style-value">{{ style.value }}</span>
            <span class="style-desc">{{ style.desc }}</span>
          </button>
        </div>
      </div>

      <!-- 导航按钮 -->
      <div class="step-nav">
        <button v-if="!isFirstStep" class="nav-btn prev" @click="prevStep">← 上一步</button>
        <div v-else class="nav-spacer" />
        <button
          v-if="!isLastStep"
          class="nav-btn next"
          @click="nextStep"
        >
          下一步 →
        </button>
        <button
          v-else
          class="nav-btn submit"
          :disabled="loading"
          @click="handleSubmit"
        >
          {{ loading ? '保存中...' : '保存并进入导览' }}
        </button>
      </div>
    </div>

    <!-- 语言推荐弹窗 -->
    <el-dialog
      v-model="showLangDialog"
      width="380px"
      :close-on-click-modal="false"
      class="lang-dialog"
    >
      <div class="dialog-body">
        <p class="dialog-title">检测到您可能更习惯 <strong>{{ recommendedLang }}</strong></p>
        <p class="dialog-sub">是否切换为 {{ recommendedLang }}？</p>
      </div>
      <template #footer>
        <button class="dialog-btn secondary" @click="rejectLang">使用普通话</button>
        <button class="dialog-btn primary" @click="acceptLang">使用 {{ recommendedLang }}</button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&family=Noto+Sans+SC:wght@400;500;700&display=swap');
</style>

<style scoped>
/* ===== 整体 ===== */
.questionnaire-page {
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

/* ===== 卡片 ===== */
.q-card {
  position: relative;
  z-index: 1;
  width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 40px 44px 32px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* ===== Logo ===== */
.card-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 6px;
}

.logomark {
  flex-shrink: 0;
}

.logo-text {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: #fff;
}

.card-subtitle {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 28px;
}

/* ===== 进度条 ===== */
.progress-bar-wrap {
  margin-bottom: 28px;
}

.progress-label {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.progress-num {
  float: right;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
}

.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  margin-top: 10px;
}

.progress-fill {
  height: 100%;
  background: #FFE1CC;
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ===== 步骤内容 ===== */
.step-content {
  min-height: 220px;
}

.step-title {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.step-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 20px;
}

/* ===== 表单深色覆盖 ===== */
.step-content :deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 13px;
}

.step-content :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: none !important;
}

.step-content :deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

.step-content :deep(.el-input__wrapper.is-focus) {
  border-color: #FFE1CC;
}

.step-content :deep(.el-input__inner) {
  color: #fff;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.step-content :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.3);
}

/* select 输入框 */ 
.step-content :deep(.el-select .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.step-content :deep(.el-select .el-input__inner) {
  color: #fff;
}

/* select 箭头图标 */
.step-content :deep(.el-select .el-input__suffix) {
  color: rgba(255, 255, 255, 0.4);
}

.step-content :deep(.el-select .el-input__suffix-inner .el-select__caret) {
  color: rgba(255, 255, 255, 0.4);
}

/* input-number 按钮 */
.step-content :deep(.el-input-number__decrease),
.step-content :deep(.el-input-number__increase) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.step-content :deep(.el-input-number__decrease:hover),
.step-content :deep(.el-input-number__increase:hover) {
  color: #FFE1CC;
}

.step-content :deep(.el-input-number__decrease.is-disabled),
.step-content :deep(.el-input-number__increase.is-disabled) {
  color: rgba(255, 255, 255, 0.2);
}

/* ===== 语言选项 ===== */
.lang-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.lang-btn {
  padding: 12px 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-btn:hover {
  border-color: rgba(255, 225, 204, 0.4);
}

.lang-btn.active {
  background: rgba(255, 225, 204, 0.15);
  border-color: #FFE1CC;
  color: #FFE1CC;
}

/* ===== 兴趣标签 ===== */
.interest-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.interest-btn {
  padding: 12px 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.interest-btn:hover {
  border-color: rgba(255, 225, 204, 0.4);
}

.interest-btn.active {
  background: rgba(255, 225, 204, 0.15);
  border-color: #FFE1CC;
  color: #FFE1CC;
}

/* ===== 游玩风格卡片 ===== */
.style-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.style-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.style-card:hover {
  border-color: rgba(255, 225, 204, 0.4);
}

.style-card.active {
  background: rgba(255, 225, 204, 0.1);
  border-color: #FFE1CC;
}

.style-value {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.style-card.active .style-value {
  color: #FFE1CC;
}

.style-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

/* ===== 导航按钮 ===== */
.step-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 28px;
  gap: 12px;
}

.nav-spacer {
  flex: 1;
}

.nav-btn {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 500;
  font-size: 14px;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn.prev {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
}

.nav-btn.prev:hover {
  background: rgba(255, 255, 255, 0.12);
}

.nav-btn.next,
.nav-btn.submit {
  background: linear-gradient(to right, #FFE1CC, #FFFFFF);
  color: #111;
  margin-left: auto;
}

.nav-btn.next:hover,
.nav-btn.submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(255, 225, 204, 0.25);
}

.nav-btn.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ===== 语言弹窗覆盖 ===== */
:deep(.lang-dialog) {
  border-radius: 16px !important;
}

:deep(.lang-dialog .el-dialog__header) {
  display: none;
}

:deep(.lang-dialog .el-dialog__body) {
  padding: 32px 24px 16px !important;
}

:deep(.lang-dialog .el-dialog__footer) {
  padding: 0 24px 24px !important;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-body {
  text-align: center;
}

.dialog-title {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 16px;
  color: #fff;
  margin-bottom: 8px;
}

.dialog-title strong {
  color: #FFE1CC;
}

.dialog-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

.dialog-btn {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.dialog-btn.primary {
  background: linear-gradient(to right, #FFE1CC, #FFFFFF);
  color: #111;
}

.dialog-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
}

.dialog-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* ===== 滚动条 ===== */
.q-card::-webkit-scrollbar {
  width: 4px;
}

.q-card::-webkit-scrollbar-track {
  background: transparent;
}

.q-card::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

/* ===== 响应式 ===== */
@media (max-width: 600px) {
  .q-card {
    width: 92vw;
    padding: 28px 24px 24px;
  }

  .lang-options,
  .interest-options {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

<style>
/* ===== 问卷页 select 下拉面板（全局，因为 teleport 到 body） ===== */
.q-popper {
  background: rgba(30, 30, 40, 0.97) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  backdrop-filter: blur(20px);
}

.q-popper .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.q-popper .el-select-dropdown__item.hover,
.q-popper .el-select-dropdown__item:hover {
  background: rgba(255, 225, 204, 0.1);
}

.q-popper .el-select-dropdown__item.selected {
  color: #FFE1CC;
  font-weight: 600;
}

.q-popper .el-popper__arrow::before {
  background: rgba(30, 30, 40, 0.97);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
