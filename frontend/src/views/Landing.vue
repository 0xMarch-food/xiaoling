<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import backgroundSvg from '@/assets/background.svg'
import lingShanDaFo from '@/assets/LandingImgs/灵山大佛.jpg'
import jiuLongGuanYu from '@/assets/LandingImgs/九龙灌浴.jpg'
import lingShanFanGong from '@/assets/LandingImgs/灵山梵宫.jpg'
import wuYinTanCheng from '@/assets/LandingImgs/五印坛城.jpg'

const router = useRouter()

const navItems = [
  { label: '首页', href: '#hero' },
  { label: '功能介绍', href: '#features' },
  { label: '景点导览', href: '#scenic' },
  { label: '关于我们', href: '#about' },
]

const scenicSpots = [
  { name: '灵山大佛', desc: '88米青铜立像，抱佛脚祈福', icon: lingShanDaFo, position: 'center 30%' },
  { name: '九龙灌浴', desc: '动态音乐群雕，再现佛陀诞生', icon: jiuLongGuanYu },
  { name: '灵山梵宫', desc: '佛教艺术的卢浮宫', icon: lingShanFanGong },
  { name: '五印坛城', desc: '藏传佛教文化瑰宝', icon: wuYinTanCheng },
]

function goChat() {
  const token = localStorage.getItem('token')
  if (token) {
    router.push('/home')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="landing-page">
    <!-- ===== 全幅背景图 ===== -->
    <img :src="backgroundSvg" class="bg-image" alt="" />

    <!-- ===== 导航栏 ===== -->
    <nav class="navbar">
      <div class="nav-inner">
        <!-- Logo -->
        <div class="nav-logo" @click="router.push('/')">
          <svg
            class="logomark"
            width="28"
            height="32"
            viewBox="0 0 28 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="logoGrad" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stop-color="#FFE1CC" />
                <stop offset="100%" stop-color="#FFFFFF" />
              </radialGradient>
            </defs>
            <path
              d="M14 0L16.8 10.4L27 12.8L16.8 15.2L14 25.6L11.2 15.2L1 12.8L11.2 10.4L14 0Z"
              fill="url(#logoGrad)"
            />
            <path
              d="M5 16L6.6 20.8L11.2 22.4L6.6 24L5 28.8L3.4 24L1 22.4L3.4 20.8L5 16Z"
              fill="url(#logoGrad)"
              opacity="0.6"
            />
          </svg>
          <span class="logo-text">灵境-AI导览</span>
        </div>

        <!-- 导航菜单 -->
        <div class="nav-links">
          <a
            v-for="item in navItems"
            :key="item.label"
            :href="item.href"
            class="nav-link"
          >
            {{ item.label }}
          </a>
        </div>

        <!-- 快速开始按钮 -->
        <div class="nav-cta-outer" @click="goChat">
          <div class="nav-cta-inner">快速开始</div>
        </div>
      </div>
    </nav>

    <!-- ===== Hero 主标题 ===== -->
    <section class="hero-section">
      <h1 class="hero-title">灵境</h1>

      <div class="hero-subtitle">
        <p class="subtitle-line1">一入灵境，AI随行。</p>
        <p class="subtitle-line2">
          灵山胜境专属 AI 数字人导游，小灵带您深度游览东方佛国。
        </p>
      </div>

      <button class="cta-button" @click="goChat">开始对话</button>
    </section>

    <!-- ===== 功能介绍 ===== -->
    <section id="features" class="section features-section">
      <div class="section-header">
        <h2>核心功能</h2>
        <p>AI 技术赋能智慧文旅，打造沉浸式游览体验</p>
      </div>
      <div class="features-grid">
        <div v-for="(f, i) in 4" :key="i" class="feature-card">
          <div class="feature-icon">
            <template v-if="i === 0">🤖</template>
            <template v-else-if="i === 1">🎙️</template>
            <template v-else-if="i === 2">📚</template>
            <template v-else>🧑</template>
          </div>
          <h3>
            <template v-if="i === 0">AI 智能问答</template>
            <template v-else-if="i === 1">数字人语音导游</template>
            <template v-else-if="i === 2">知识库问答</template>
            <template v-else>个性化推荐</template>
          </h3>
          <p>
            <template v-if="i === 0">DeepSeek 大模型驱动，回答关于灵山胜境的一切问题</template>
            <template v-else-if="i === 1">百度 TTS 高拟真语音合成，AI 导游"小灵"为您倾情讲解</template>
            <template v-else-if="i === 2">基于景区官方公开资料的知识增强，回答准确可靠</template>
            <template v-else>根据您的兴趣偏好，定制专属游览路线与讲解内容</template>
          </p>
        </div>
      </div>
    </section>

    <!-- ===== 景点导览 ===== -->
    <section id="scenic" class="section scenic-section">
      <div class="section-header">
        <h2>灵山胜境 · 核心景点</h2>
        <p>五大必游景点，感受佛教文化的庄严与恢弘</p>
      </div>
      <div class="scenic-grid">
        <div v-for="(s, i) in scenicSpots" :key="i" class="scenic-card">
          <img :src="s.icon" :alt="s.name" class="scenic-image" :style="s.position ? { objectPosition: s.position } : {}" />
          <div class="scenic-info">
            <h3>{{ s.name }}</h3>
            <p>{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section id="about" class="section cta-section">
      <div class="cta-card">
        <h2>准备好开始你的灵山之旅了吗？</h2>
        <p>AI 数字人导游「小灵」24小时在线，随时为您解答</p>
        <button class="cta-button" @click="goChat">立即开始导览</button>
      </div>
    </section>

    <!-- ===== Footer ===== -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span>灵境·AI导览</span>
        </div>
        <p class="footer-desc">
          基于 DeepSeek 大模型 · 百度 TTS 语音合成 · 灵山胜境官方公开资料<br />
          仅供学习参考，非商业用途
        </p>
        <p class="footer-copy">© 2026 灵境·AI导览 — 灵山胜境智能导游系统</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* ===== 引入字体 ===== */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
</style>

<style scoped>
/* ===== 全局 ===== */
.landing-page {
  position: relative;
  min-height: 100vh;
  color: #fff;
  overflow-x: hidden;
  background: #0a0a0f;
}

/* ===== 全幅背景图 ===== */
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

/* ===== 导航栏 ===== */
.navbar {
  position: fixed;
  top: 27px;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  padding: 0 33px;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1120px;
  height: 64px;
  padding: 12px 16px;
  border-radius: 16px;
  background:
    linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.04)),
    radial-gradient(ellipse at 30% 50%, rgba(255, 255, 255, 0.06) 0%, transparent 70%);
  backdrop-filter: blur(12.6px);
  -webkit-backdrop-filter: blur(12.6px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* ---- Logo ---- */
.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 148px;
  padding-left: 16px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.logomark {
  flex-shrink: 0;
}

.logo-text {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 900;
  font-size: 20px;
  line-height: 1.5;
  color: #fff;
  white-space: nowrap;
}

/* ---- 导航菜单 ---- */
.nav-links {
  display: flex;
  gap: 40px;
  align-items: center;
}

.nav-link {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 500;
  font-size: 16px;
  line-height: 24px;
  color: #fff;
  text-decoration: none;
  transition: opacity 0.2s;
}

.nav-link:hover {
  opacity: 0.7;
}

/* ---- 快速开始按钮 ---- */
.nav-cta-outer {
  border-radius: 8px;
  background: #FFE1CC;
  padding: 4px;
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.1),
    inset 0 4px 4px rgba(255, 255, 255, 0.15);
  cursor: pointer;
  flex-shrink: 0;
}

.nav-cta-inner {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 20px;
  color: #050505;
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  transition: transform 0.2s;
}

.nav-cta-outer:hover .nav-cta-inner {
  transform: scale(0.97);
}

/* ===== Hero 区域 ===== */
.hero-section {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
  pointer-events: none;
}

/* ---- 主标题 "灵境" ---- */
.hero-title {
  font-family: 'Inter', 'Noto Sans JP', 'Noto Sans SC', sans-serif;
  font-weight: 600;
  font-size: 50px;
  line-height: 60px;
  text-align: center;
  margin: 0 0 24px;
  background: linear-gradient(to right, #FFE1CC, #FFFFFF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ---- 副标题 ---- */
.hero-subtitle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 679px;
  margin-bottom: 40px;
}

.subtitle-line1 {
  font-family: 'Inter', 'Noto Sans JP', 'Noto Sans SC', sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 27px;
  color: #fff;
  text-align: center;
  margin: 0;
}

.subtitle-line2 {
  font-family: 'Inter', 'Noto Sans JP', 'Noto Sans SC', sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 27px;
  color: #fff;
  text-align: center;
  margin: 0;
}

/* ---- 开始对话按钮 ---- */
.cta-button {
  pointer-events: auto;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 500;
  font-size: 16px;
  line-height: 1;
  color: #111111;
  background: linear-gradient(to right, #FFE1CC, #FFFFFF);
  border: none;
  border-radius: 8px;
  padding: 14px 28px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  pointer-events: auto;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(255, 225, 204, 0.25);
}

/* ===== 通透章节 ===== */
.section {
  position: relative;
  z-index: 1;
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-header h2 {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
}

.section-header p {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
}

/* ---- 功能介绍 ---- */
.features-section {
  background: rgba(10, 10, 15, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  max-width: none;
  padding: 80px 24px;
}

.features-section .section-header h2,
.scenic-section .section-header h2 {
  background: linear-gradient(135deg, #FFE1CC, #FFFFFF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.features-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 225, 204, 0.2);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.feature-card p {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.6;
}

/* ---- 景点导览 ---- */
.scenic-section {
  max-width: none;
  padding: 80px 24px;
}

.scenic-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.scenic-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s;
  cursor: pointer;
}

.scenic-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 225, 204, 0.15);
}

.scenic-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}

.scenic-info {
  padding: 20px;
}

.scenic-info h3 {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.scenic-info p {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

/* ---- CTA ---- */
.cta-section {
  max-width: none;
  padding: 40px 24px 80px;
  background: rgba(10, 10, 15, 0.4);
}

.cta-card {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 64px 48px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.cta-card h2 {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 28px;
  color: #fff;
  margin-bottom: 12px;
}

.cta-card p {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 32px;
}

/* ---- Footer ---- */
.footer {
  position: relative;
  z-index: 1;
  background: rgba(10, 10, 15, 0.8);
  padding: 48px 24px;
  text-align: center;
}

.footer-content {
  max-width: 600px;
  margin: 0 auto;
}

.footer-brand {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.footer-desc {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.8;
  margin-bottom: 16px;
}

.footer-copy {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .navbar {
    top: 12px;
    padding: 0 16px;
  }

  .nav-inner {
    height: 56px;
    padding: 8px 12px;
    border-radius: 12px;
  }

  .nav-links {
    display: none;
  }

  .nav-logo {
    width: auto;
    padding-left: 4px;
    gap: 8px;
  }

  .logo-text {
    font-size: 16px;
  }

  .nav-cta-inner {
    padding: 8px 12px;
    font-size: 13px;
  }

  .hero-title {
    font-size: 36px;
    line-height: 44px;
  }

  .hero-subtitle {
    max-width: 90vw;
  }

  .subtitle-line1,
  .subtitle-line2 {
    font-size: 15px;
    line-height: 24px;
  }

  .cta-button {
    font-size: 15px;
    padding: 16px 28px;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .scenic-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .cta-card {
    padding: 40px 24px;
  }

  .cta-card h2 {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .features-grid {
    grid-template-columns: 1fr;
  }

  .scenic-grid {
    grid-template-columns: 1fr;
  }
}
</style>
