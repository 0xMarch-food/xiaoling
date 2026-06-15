<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Icon } from '@iconify/vue'

interface DashboardData {
  todayVisitors: number
  weekVisitors: number
  todayQuestions: number
  popularQuestions: { question: string; count: number }[]
  satisfactionTrend: number[]
  visitorTrend: number[]
  emotionDistribution: { positive: number; neutral: number; negative: number }
}

const data = ref<DashboardData>({
  todayVisitors: 0,
  weekVisitors: 0,
  todayQuestions: 0,
  popularQuestions: [],
  satisfactionTrend: [],
  visitorTrend: [],
  emotionDistribution: { positive: 0, neutral: 0, negative: 0 },
})
const loading = ref(true)
const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const chartRef1 = ref<HTMLDivElement | null>(null)
const chartRef2 = ref<HTMLDivElement | null>(null)
const chartRef3 = ref<HTMLDivElement | null>(null)

async function fetchDashboard() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/stats/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      data.value = json.data
    }
  } catch {
    // 保持默认值
  } finally {
    loading.value = false
    await nextTick()
    renderCharts()
  }
}

function renderCharts() {
  renderVisitorChart()
  renderSatisfactionChart()
  renderEmotionChart()
}

function renderVisitorChart() {
  if (!chartRef1.value) return
  const chart = echarts.init(chartRef1.value)
  const trend = data.value.visitorTrend.length >= 7
    ? data.value.visitorTrend.slice(-7)
    : data.value.visitorTrend
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { data: dayLabels.slice(0, trend.length) },
    yAxis: { type: 'value' },
    series: [{
      data: trend,
      type: 'line',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(102,126,234,0.4)' },
          { offset: 1, color: 'rgba(102,126,234,0.02)' },
        ]),
      },
      lineStyle: { color: '#667eea' },
      itemStyle: { color: '#667eea' },
    }],
  })
}

function renderSatisfactionChart() {
  if (!chartRef2.value) return
  const chart = echarts.init(chartRef2.value)
  const trend = data.value.satisfactionTrend.length >= 7
    ? data.value.satisfactionTrend.slice(-7)
    : data.value.satisfactionTrend
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { data: dayLabels.slice(0, trend.length) },
    yAxis: { type: 'value', min: 3, max: 5 },
    series: [{
      data: trend,
      type: 'line',
      smooth: true,
      lineStyle: { color: '#52c41a' },
      itemStyle: { color: '#52c41a' },
    }],
  })
}

function renderEmotionChart() {
  if (!chartRef3.value) return
  const chart = echarts.init(chartRef3.value)
  const { positive, neutral, negative } = data.value.emotionDistribution
  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [
        { value: positive, name: '正面', itemStyle: { color: '#52c41a' } },
        { value: neutral, name: '中性', itemStyle: { color: '#faad14' } },
        { value: negative, name: '负面', itemStyle: { color: '#ff4d4f' } },
      ],
    }],
  })
}

onMounted(() => fetchDashboard())
</script>

<template>
  <div class="dashboard" v-loading="loading">
    <h2 class="page-title">数据大屏概览</h2>

    <!-- 数据卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon today">
          <Icon icon="mdi:account-group" width="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.todayVisitors.toLocaleString() }}</div>
          <div class="stat-label">今日服务人次</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon week">
          <Icon icon="mdi:chart-line" width="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.weekVisitors.toLocaleString() }}</div>
          <div class="stat-label">本周服务人次</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon questions">
          <Icon icon="mdi:chat-question" width="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.todayQuestions.toLocaleString() }}</div>
          <div class="stat-label">今日提问数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon satisfaction">
          <Icon icon="mdi:star" width="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.satisfactionTrend[data.satisfactionTrend.length - 1] || '-' }}</div>
          <div class="stat-label">今日满意度（满分5）</div>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="chart-row">
      <div class="chart-card chart-wide">
        <h3>本周服务人次趋势</h3>
        <div ref="chartRef1" style="width:100%;height:260px" />
      </div>
      <div class="chart-card chart-narrow">
        <h3>游客情绪分布</h3>
        <div ref="chartRef3" style="width:100%;height:260px" />
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card chart-half">
        <h3>满意度趋势</h3>
        <div ref="chartRef2" style="width:100%;height:240px" />
      </div>
      <div class="chart-card chart-half">
        <h3>热门问答 TOP5</h3>
        <div v-if="data.popularQuestions.length > 0" class="hot-list">
          <div v-for="(q, i) in data.popularQuestions" :key="i" class="hot-item">
            <span class="hot-rank">{{ i + 1 }}</span>
            <span class="hot-question">{{ q.question }}</span>
            <span class="hot-count">{{ q.count }}次</span>
          </div>
        </div>
        <div v-else class="empty-hint">暂无数据，等待游客提问...</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 24px;
}

.page-title {
  font-size: 22px;
  color: #333;
  margin: 0 0 20px;
}

/* 卡片行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-icon.today { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-icon.week { background: linear-gradient(135deg, #f093fb, #f5576c); }
.stat-icon.questions { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-icon.satisfaction { background: linear-gradient(135deg, #43e97b, #38f9d7); }

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

/* 图表行 */
.chart-row {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.chart-card h3 {
  font-size: 15px;
  color: #333;
  margin: 0 0 12px;
}

.chart-wide { flex: 2; }
.chart-narrow { flex: 1; }
.chart-half { flex: 1; }

.empty-hint {
  text-align: center;
  color: #bbb;
  font-size: 13px;
  padding: 40px 0;
}

/* 热门列表 */
.hot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.hot-item + .hot-item {
  border-top: 1px solid #f5f5f5;
}

.hot-rank {
  width: 22px;
  height: 22px;
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

.hot-question {
  flex: 1;
  font-size: 13px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-count {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
</style>
