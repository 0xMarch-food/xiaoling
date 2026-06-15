<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'

interface TopicItem { question: string; count: number }
interface DailyItem { _id: string; userCount: number; aiCount: number }
interface ReportData {
  topTopics: TopicItem[]
  likeRate: number
  likeCount: number
  dislikeCount: number
  topDislikeTopics: TopicItem[]
  dailyMessages: DailyItem[]
  suggestions: string[]
  generatedAt: string
}

const report = ref<ReportData | null>(null)
const loading = ref(true)
const error = ref('')

async function fetchReport() {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/stats/report', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      report.value = json.data
    } else {
      error.value = json.message || '获取报告失败'
    }
  } catch {
    error.value = '网络错误，请检查后端服务'
  } finally {
    loading.value = false
  }
}

const maxTopicCount = ref(1)
function updateMax() {
  if (report.value?.topTopics.length) {
    maxTopicCount.value = Math.max(...report.value.topTopics.map(t => t.count), 1)
  }
}

onMounted(async () => {
  await fetchReport()
  updateMax()
})

function formatDate(dateStr: string) {
  return dateStr.slice(5) // MM-DD
}
</script>

<template>
  <div class="analytics-page">
    <h2 class="page-title">游客分析</h2>

    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else-if="report">
      <!-- 概览卡片 -->
      <div class="overview-cards">
        <div class="overview-card">
          <Icon icon="mdi:chat-question" width="28" />
          <div>
            <div class="ov-value">{{ report.topTopics.reduce((s, t) => s + t.count, 0) }}</div>
            <div class="ov-label">总提问量</div>
          </div>
        </div>
        <div class="overview-card">
          <Icon icon="mdi:thumb-up" width="28" />
          <div>
            <div class="ov-value">{{ report.likeCount }}</div>
            <div class="ov-label">好评数</div>
          </div>
        </div>
        <div class="overview-card">
          <Icon icon="mdi:thumb-down" width="28" />
          <div>
            <div class="ov-value">{{ report.dislikeCount }}</div>
            <div class="ov-label">差评数</div>
          </div>
        </div>
        <div class="overview-card">
          <Icon icon="mdi:percent" width="28" />
          <div>
            <div class="ov-value">{{ report.likeRate }}%</div>
            <div class="ov-label">好评率</div>
          </div>
        </div>
      </div>

      <!-- 热门话题 -->
      <div class="section-card">
        <h3>🔥 热门话题 TOP10</h3>
        <div class="topic-list">
          <div v-for="(t, i) in report.topTopics" :key="i" class="topic-row">
            <span class="topic-rank">{{ i + 1 }}</span>
            <span class="topic-question">{{ t.question }}</span>
            <div class="topic-bar-track">
              <div class="topic-bar-fill" :style="{ width: (t.count / maxTopicCount * 100) + '%' }" />
            </div>
            <span class="topic-count">{{ t.count }}次</span>
          </div>
          <p v-if="report.topTopics.length === 0" class="empty-hint">暂无数据</p>
        </div>
      </div>

      <!-- 消息趋势 -->
      <div class="section-card" style="margin-top:16px">
        <h3>📈 近7天消息趋势</h3>
        <div class="trend-chart" v-if="report.dailyMessages.length > 0">
          <div v-for="d in report.dailyMessages" :key="d._id" class="trend-bar-group">
            <div class="trend-bar user" :style="{ height: Math.max(d.userCount * 4, 2) + 'px' }" :title="'提问 ' + d.userCount" />
            <div class="trend-bar ai" :style="{ height: Math.max(d.aiCount * 4, 2) + 'px' }" :title="'回复 ' + d.aiCount" />
            <span class="trend-date">{{ formatDate(d._id) }}</span>
          </div>
        </div>
        <p v-else class="empty-hint">暂无数据</p>
        <div class="trend-legend">
          <span><span class="dot user" /> 用户提问</span>
          <span><span class="dot ai" /> AI回复</span>
        </div>
      </div>

      <!-- 差评高发 -->
      <div class="section-card" style="margin-top:16px">
        <h3>⚠️ 差评高发话题</h3>
        <div v-if="report.topDislikeTopics.length > 0">
          <div v-for="(t, i) in report.topDislikeTopics" :key="i" class="dislike-row">
            <Icon icon="mdi:alert-circle" width="18" class="dislike-icon" />
            <span class="dislike-question">{{ t.question }}</span>
            <span class="dislike-count">{{ t.count }}次差评</span>
          </div>
        </div>
        <p v-else class="empty-hint">暂无差评，AI回答质量良好 🎉</p>
      </div>

      <!-- 服务建议 -->
      <div class="section-card suggestions-card" style="margin-top:16px">
        <h3>💡 服务改进建议</h3>
        <ul class="suggestions-list">
          <li v-for="(s, i) in report.suggestions" :key="i">
            <Icon icon="mdi:lightbulb-outline" width="18" />
            <span>{{ s }}</span>
          </li>
        </ul>
        <div class="report-time">报告生成时间：{{ new Date(report.generatedAt).toLocaleString('zh-CN') }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.analytics-page {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.page-title {
  font-size: 22px;
  color: #333;
  margin: 0 0 20px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 60px 0;
  color: #999;
  font-size: 14px;
}

/* 概览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.overview-card :deep(svg) {
  color: #667eea;
  flex-shrink: 0;
}

.ov-value {
  font-size: 22px;
  font-weight: 700;
  color: #333;
}

.ov-label {
  font-size: 12px;
  color: #999;
}

/* 通用卡片 */
.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.section-card h3 {
  font-size: 16px;
  color: #333;
  margin: 0 0 16px;
}

.empty-hint {
  text-align: center;
  color: #bbb;
  font-size: 13px;
  padding: 20px 0;
  margin: 0;
}

/* 热门话题 */
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.topic-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topic-rank {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #f0f2ff;
  color: #667eea;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topic-question {
  flex: 1;
  font-size: 13px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-bar-track {
  width: 120px;
  height: 6px;
  background: #f0f2f5;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.topic-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.topic-count {
  width: 48px;
  text-align: right;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

/* 趋势图 */
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 140px;
  padding: 0 10px;
}

.trend-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}

.trend-bar {
  width: 16px;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.4s ease;
}

.trend-bar.user {
  background: #667eea;
}

.trend-bar.ai {
  background: #a3b1ff;
}

.trend-date {
  font-size: 10px;
  color: #bbb;
  margin-top: 6px;
}

.trend-legend {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  font-size: 12px;
  color: #999;
  justify-content: center;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: -1px;
}

.dot.user { background: #667eea; }
.dot.ai { background: #a3b1ff; }

/* 差评 */
.dislike-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.dislike-row + .dislike-row {
  border-top: 1px solid #f5f5f5;
}

.dislike-icon {
  color: #f56c6c;
  flex-shrink: 0;
}

.dislike-question {
  flex: 1;
  font-size: 13px;
  color: #555;
}

.dislike-count {
  font-size: 12px;
  color: #f56c6c;
  flex-shrink: 0;
}

/* 建议 */
.suggestions-card {
  background: linear-gradient(135deg, #f0f2ff, #fff);
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestions-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}

.suggestions-list li :deep(svg) {
  color: #e6a23c;
  flex-shrink: 0;
  margin-top: 2px;
}

.report-time {
  text-align: right;
  font-size: 11px;
  color: #ccc;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}
</style>
