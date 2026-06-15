<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const currentImage = ref('default')
const currentCloth = ref('tour-guide')
const currentVoice = ref('gentle-female')

const images = [
  { id: 'default', name: '现代导游', avatar: '👩‍🦰' },
  { id: 'ancient', name: '古代人物', avatar: '👘' },
  { id: 'mascot', name: '景区吉祥物', avatar: '🧸' },
]

const cloths = [
  { id: 'tour-guide', name: '导游制服', color: '#1890ff' },
  { id: 'traditional', name: '传统服饰', color: '#f5222d' },
  { id: 'casual', name: '休闲装', color: '#52c41a' },
  { id: 'business', name: '商务装', color: '#333' },
]

const voices = [
  { id: 'gentle-female', name: '温柔女声', desc: '亲切自然，适合导览讲解' },
  { id: 'bright-female', name: '明亮女声', desc: '活泼轻快，适合景区介绍' },
  { id: 'warm-male', name: '温暖男声', desc: '沉稳大气，适合历史讲解' },
]

function selectImage(id: string) {
  currentImage.value = id
  ElMessage.success(`已切换为：${images.find(i => i.id === id)?.name}`)
}

function selectCloth(id: string) {
  currentCloth.value = id
  ElMessage.success(`已更换服装：${cloths.find(c => c.id === id)?.name}`)
}

function selectVoice(id: string) {
  currentVoice.value = id
  ElMessage.success(`已切换声音：${voices.find(v => v.id === id)?.name}`)
}
</script>

<template>
  <div class="digital-human-page">
    <h2 class="page-title">数字人管理</h2>

    <!-- 形象选择 -->
    <div class="section-card">
      <h3>数字人形象</h3>
      <div class="options-grid">
        <div
          v-for="img in images"
          :key="img.id"
          class="option-item"
          :class="{ selected: currentImage === img.id }"
          @click="selectImage(img.id)"
        >
          <div class="option-preview">{{ img.avatar }}</div>
          <span>{{ img.name }}</span>
          <el-icon v-if="currentImage === img.id" class="check-icon"><svg viewBox="0 0 1024 1024" width="1em" height="1em"><path d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896z m-55.808 537.344l-81.92-81.92a38.4 38.4 0 1 0-54.272 54.272l108.544 108.544a38.4 38.4 0 0 0 53.76 0.512L709.12 458.752a38.4 38.4 0 0 0-54.784-53.76L456.192 601.344z" fill="#667eea"/></svg></el-icon>
        </div>
      </div>
    </div>

    <!-- 服装选择 -->
    <div class="section-card">
      <h3>服装配置</h3>
      <div class="options-grid">
        <div
          v-for="cloth in cloths"
          :key="cloth.id"
          class="option-item"
          :class="{ selected: currentCloth === cloth.id }"
          @click="selectCloth(cloth.id)"
        >
          <div class="cloth-color" :style="{ background: cloth.color }" />
          <span>{{ cloth.name }}</span>
          <el-icon v-if="currentCloth === cloth.id" class="check-icon"><svg viewBox="0 0 1024 1024" width="1em" height="1em"><path d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896z m-55.808 537.344l-81.92-81.92a38.4 38.4 0 1 0-54.272 54.272l108.544 108.544a38.4 38.4 0 0 0 53.76 0.512L709.12 458.752a38.4 38.4 0 0 0-54.784-53.76L456.192 601.344z" fill="#667eea"/></svg></el-icon>
        </div>
      </div>
    </div>

    <!-- 声音选择 -->
    <div class="section-card">
      <h3>声音配置</h3>
      <el-radio-group v-model="currentVoice" @change="selectVoice">
        <div class="voice-list">
          <div
            v-for="voice in voices"
            :key="voice.id"
            class="voice-option"
            :class="{ selected: currentVoice === voice.id }"
          >
            <el-radio :value="voice.id" size="large">
              <div class="voice-info">
                <strong>{{ voice.name }}</strong>
                <p>{{ voice.desc }}</p>
              </div>
            </el-radio>
          </div>
        </div>
      </el-radio-group>
    </div>
  </div>
</template>

<style scoped>
.digital-human-page {
  padding: 24px;
}

.page-title {
  font-size: 22px;
  color: #333;
  margin-bottom: 20px;
}

.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.section-card h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
}

.options-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.option-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border: 2px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  width: 140px;
}

.option-item:hover {
  border-color: #667eea;
}

.option-item.selected {
  border-color: #667eea;
  background: rgba(102,126,234,0.05);
}

.option-preview {
  font-size: 48px;
}

.cloth-color {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 20px;
}

.voice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-option {
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  transition: all 0.2s;
}

.voice-option.selected {
  border-color: #667eea;
  background: rgba(102,126,234,0.03);
}

.voice-info p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #999;
}
</style>
