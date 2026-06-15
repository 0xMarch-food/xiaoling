<script setup lang="ts">
import { ref, nextTick, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { Icon } from '@iconify/vue'
import MarkdownIt from 'markdown-it'
import backgroundSvg from '@/assets/background.svg'
import { useLive2D } from '@/composables/useLive2D'

const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

const md = new MarkdownIt({ breaks: true })

// 侧边栏
const sidebarCollapsed = ref(false)
const sidebarWidth = computed(() => (sidebarCollapsed.value ? '60px' : '200px'))

type SidebarItem = {
  key: string; icon: string; label: string; action?: () => void
}

const sidebarItems: SidebarItem[] = [
  { key: 'profile',     icon: 'mdi:account-circle-outline', label: '个人中心' },
  { key: 'preferences', icon: 'mdi:tune',                   label: '偏好设置' },
  { key: 'history',     icon: 'mdi:history',                 label: '历史聊天' },
  { key: 'feedback',    icon: 'mdi:message-reply-text',      label: '我的反馈' },
]

// 弹出面板
const activePanel = ref('')   // '' | 'profile' | 'preferences' | 'history' | 'feedback'

function openPanel(key: string) {
  activePanel.value = activePanel.value === key ? '' : key
}

// 偏好设置
const prefLanguage = ref('普通话')
const prefFontSize = ref(14)
const languageOptions = ['普通话', '英语', '四川话', '粤语', '东北话', '闽南语']
const travelStyleOptions = ['深度游', '快速游', '家庭游', '情侣游', '老年游', '亲子游']
const interestOptions = ['历史文化', '古建筑', '美食', '自然风景', '摄影打卡', '民俗文化', '博物馆', '红色文化']
const prefTravelStyle = ref('')
const prefInterests = ref<string[]>([])
const prefSaving = ref(false)
const prefMsg = ref('')
let prefOriginal: any = null  // 保存原始问卷数据，提交时合并必填字段

function toggleInterest(interest: string) {
  const i = prefInterests.value.indexOf(interest)
  if (i >= 0) prefInterests.value.splice(i, 1)
  else prefInterests.value.push(interest)
}

async function fetchQuestionnaire() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/questionnaire', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200 && json.data) {
      const q = json.data
      prefOriginal = q
      prefLanguage.value = q.nativeLanguage || '普通话'
      prefTravelStyle.value = q.travelStyle || ''
      prefInterests.value = q.interests || []
    }
  } catch { /* ignore */ }
}

async function handleSavePreferences() {
  prefSaving.value = true
  prefMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const body: any = {
      nativeLanguage: prefLanguage.value,
      travelStyle: prefTravelStyle.value,
      interests: prefInterests.value,
    }
    // 合并原始问卷的必填字段
    if (prefOriginal) {
      body.name = prefOriginal.name || ''
      body.gender = prefOriginal.gender || ''
      body.hometown = prefOriginal.hometown || ''
    }
    const res = await fetch('http://localhost:3000/api/questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.code === 200) {
      prefOriginal = { ...prefOriginal, ...body }
      prefMsg.value = '✅ 保存成功'
    } else {
      prefMsg.value = `❌ ${json.message}`
    }
  } catch {
    prefMsg.value = '❌ 网络错误'
  } finally {
    prefSaving.value = false
  }
}

// 打开偏好面板时拉问卷数据
watch(activePanel, (val) => {
  if (val === 'preferences') fetchQuestionnaire()
})

// 个人中心表单
const profileForm = ref({ username: '', email: '', phone: '' })
const profileSaving = ref(false)
const profileMsg = ref('')

// 密码修改表单
const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const passwordSaving = ref(false)
const passwordMsg = ref('')

// 头像上传
const avatarUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function initProfileForm() {
  profileForm.value = {
    username: userStore.username,
    email: userStore.email,
    phone: userStore.phone,
  }
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  profileMsg.value = ''
  passwordMsg.value = ''
}

// 打开面板时从后端拉最新数据
watch(activePanel, async (val) => {
  if (val !== 'profile') return
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      const u = json.data
      userStore.username = u.username
      userStore.email = u.email
      userStore.phone = u.phone || ''
      userStore.avatar = u.avatar || ''
      localStorage.setItem('username', u.username)
      localStorage.setItem('email', u.email)
      localStorage.setItem('phone', u.phone || '')
      localStorage.setItem('avatar', u.avatar || '')
    }
  } catch { /* ignore */ }
  initProfileForm()
})

async function handleSaveProfile() {
  profileSaving.value = true
  profileMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileForm.value),
    })
    const json = await res.json()
    if (json.code === 200) {
      userStore.username = profileForm.value.username
      userStore.email = profileForm.value.email
      userStore.phone = profileForm.value.phone
      localStorage.setItem('username', profileForm.value.username)
      localStorage.setItem('email', profileForm.value.email)
      localStorage.setItem('phone', profileForm.value.phone)
      profileMsg.value = '✅ 保存成功'
    } else {
      profileMsg.value = `❌ ${json.message}`
    }
  } catch {
    profileMsg.value = '❌ 网络错误'
  } finally {
    profileSaving.value = false
  }
}

async function handleSavePassword() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value
  if (newPassword !== confirmPassword) {
    passwordMsg.value = '❌ 两次输入的新密码不一致'
    return
  }
  passwordSaving.value = true
  passwordMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    })
    const json = await res.json()
    if (json.code === 200) {
      passwordMsg.value = '✅ 密码修改成功'
      passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    } else {
      passwordMsg.value = `❌ ${json.message}`
    }
  } catch {
    passwordMsg.value = '❌ 网络错误'
  } finally {
    passwordSaving.value = false
  }
}

function triggerAvatarInput() {
  fileInputRef.value?.click()
}

async function handleAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 转 base64
  const reader = new FileReader()
  reader.onload = async () => {
    avatarUploading.value = true
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3000/api/auth/avatar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: reader.result }),
      })
      const json = await res.json()
      if (json.code === 200) {
        userStore.avatar = json.data.avatar
        localStorage.setItem('avatar', json.data.avatar)
      }
    } catch {
      // ignore
    } finally {
      avatarUploading.value = false
    }
  }
  reader.readAsDataURL(file)
}

// 历史聊天
interface HistoryItem {
  id: string
  question: string
  answer: string
  time: string
  dateLabel: string
  iso: string
}
const historyList = ref<HistoryItem[]>([])
const historyLoading = ref(false)
const expandedId = ref('')

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? '' : id
}

function formatTime(iso: string): { label: string; dateLabel: string } {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (diff < 86400000 && now.getDate() === d.getDate()) return { label: `${hh}:${mm}`, dateLabel: '今天' }
  if (diff < 172800000) return { label: `${hh}:${mm}`, dateLabel: '昨天' }
  return { label: `${d.getMonth() + 1}-${d.getDate()}`, dateLabel: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
}

const groupedHistory = computed(() => {
  const groups: { label: string; items: HistoryItem[] }[] = []
  for (const item of historyList.value) {
    const last = groups[groups.length - 1]
    if (last && last.label === item.dateLabel) {
      last.items.push(item)
    } else {
      groups.push({ label: item.dateLabel, items: [item] })
    }
  }
  return groups
})

const groupedFeedback = computed(() => {
  const groups: { label: string; items: FeedbackItem[] }[] = []
  for (const item of feedbackList.value) {
    const last = groups[groups.length - 1]
    if (last && last.label === item.dateLabel) {
      last.items.push(item)
    } else {
      groups.push({ label: item.dateLabel, items: [item] })
    }
  }
  return groups
})

async function fetchHistory() {
  historyLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/chat/history', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      const msgs = json.data as any[]
      const items: HistoryItem[] = []
      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].role === 'user' && msgs[i + 1]?.role === 'assistant') {
          const ft = formatTime(msgs[i].createdAt)
          items.push({
            id: msgs[i]._id,
            question: msgs[i].content,
            answer: msgs[i + 1].content,
            time: ft.label,
            dateLabel: ft.dateLabel,
            iso: msgs[i].createdAt,
          })
          i++
        }
      }
      historyList.value = items.reverse()
    }
  } catch {
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

// 打开历史面板时拉数据
watch(activePanel, (val) => {
  if (val === 'history') fetchHistory()
  if (val === 'feedback') fetchFeedbackList()
})

// ========== 反馈（点赞/踩） ==========
const feedbackSubmitting = ref('')  // 正在提交反馈的消息 id

async function handleFeedback(msgId: string, type: 'like' | 'dislike') {
  const msg = chatStore.messages.find(m => m.id === msgId)
  if (!msg) return

  // 如果点同一个，取消
  if (msg.feedback === type) {
    type = 'like'  // 取消逻辑先简单处理：点了就固定
    // 暂不支持取消，直接覆盖
  }

  feedbackSubmitting.value = msgId
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:3000/api/chat/feedback/${msgId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ feedback: type }),
    })
    const json = await res.json()
    if (json.code === 200) {
      msg.feedback = type
    }
  } catch {
    // ignore
  } finally {
    feedbackSubmitting.value = ''
  }
}

// 我的反馈列表
interface FeedbackItem {
  id: string
  question: string
  answer: string
  feedback: 'like' | 'dislike'
  time: string
  dateLabel: string
}
const feedbackList = ref<FeedbackItem[]>([])
const feedbackLoading = ref(false)

async function fetchFeedbackList() {
  feedbackLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:3000/api/chat/history', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      const msgs = json.data as any[]
      const items: FeedbackItem[] = []
      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].role === 'assistant' && msgs[i].feedback) {
          const userMsg = msgs[i - 1]
          const ft = formatTime(msgs[i].createdAt)
          items.push({
            id: msgs[i]._id,
            question: userMsg?.content || '(已删除)',
            answer: msgs[i].content,
            feedback: msgs[i].feedback,
            time: ft.label,
            dateLabel: ft.dateLabel,
          })
        }
      }
      feedbackList.value = items.reverse()
    }
  } catch {
    feedbackList.value = []
  } finally {
    feedbackLoading.value = false
  }
}

// 数字人状态
const digitalHumanName = ref('小灵')
const digitalHumanEmotion = ref<'smile' | 'happy' | 'surprised' | 'thinking' | 'speaking'>('smile')

const emotionIcon: Record<string, string> = {
  smile:     'mdi:emoticon-happy',
  happy:     'mdi:emoticon-excited',
  surprised: 'mdi:emoticon-cool',
  thinking:  'mdi:head-thinking',
  speaking:  'mdi:account-voice',
}

// Live2D 数字人
const live2dCanvas = ref<HTMLCanvasElement | null>(null)
const { state: live2dState, initCanvas, setExpression, startLipSync, stopLipSync, destroy: destroyLive2D } = useLive2D()

// 点击数字人：随机问候 + 表情切换
const greetings = [
  '你好呀！有什么想了解的吗？😊',
  '嗨！需要我帮你规划游览路线吗~',
  '阿弥陀佛，小灵在此为你服务 🙏',
  '欢迎来到灵山胜境！我是你的AI导游 ✨',
  '今天想看点什么呢？大佛、梵宫还是九龙灌浴？',
]
let greetTimer: ReturnType<typeof setTimeout> | null = null

function handleHumanClick() {
  if (chatStore.isLoading) return
  // 清除上一次的定时器，防止表情被过早复位
  if (greetTimer) clearTimeout(greetTimer)

  const greeting = greetings[Math.floor(Math.random() * greetings.length)]
  ElMessage({ message: greeting, type: 'info', duration: 2500, showClose: false })

  digitalHumanEmotion.value = 'happy'
  greetTimer = setTimeout(() => {
    digitalHumanEmotion.value = 'smile'
    greetTimer = null
  }, 2500)
}

// 页面挂载：加载用户语言偏好 + 初始化 Live2D
onMounted(async () => {
  await fetchQuestionnaire()
  await nextTick()
  if (live2dCanvas.value) {
    console.log('[Home] Live2D canvas 就绪，开始初始化')
    initCanvas(live2dCanvas.value)
  }
})

// 情绪变化 → Live2D 表情切换
watch(digitalHumanEmotion, (emo) => {
  setExpression(emo)
})

// 面板切换 → 离开聊天模式时销毁 Live2D，返回时重新初始化
watch(activePanel, async (val) => {
  if (val === '') {
    // 刚切回聊天面板
    fetchQuestionnaire()
    await nextTick()
    if (live2dCanvas.value) {
      console.log('[Home] 面板返回，重新初始化 Live2D')
      initCanvas(live2dCanvas.value)
    }
  } else {
    // 离开聊天面板 → 销毁实例释放 WebGL 上下文
    destroyLive2D()
  }
})

onUnmounted(() => {
  destroyLive2D()
})

// 输入
const inputText = ref('')
const chatListRef = ref<HTMLElement | null>(null)

// 语音输入（百度 ASR）
const listening = ref(false)
const voiceSupported = ref(false)
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []

/** 将 Float32 PCM 编码为 16-bit WAV */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)           // chunk size
  view.setUint16(20, 1, true)            // PCM
  view.setUint16(22, 1, true)            // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)            // block align
  view.setUint16(34, 16, true)           // bits per sample
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

async function handleVoiceInput() {
  // 已在录音 → 停止
  if (listening.value) {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
    return
  }

  // 开始录音
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    voiceSupported.value = true

    // 使用 AudioContext 采集 PCM
    const audioCtx = new AudioContext({ sampleRate: 16000 })
    const source = audioCtx.createMediaStreamSource(stream)
    const processor = audioCtx.createScriptProcessor(4096, 1, 1)
    const pcmChunks: Float32Array[] = []

    source.connect(processor)
    processor.connect(audioCtx.destination)

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      pcmChunks.push(new Float32Array(input))
    }

    // 同时用 MediaRecorder 作为备用（某些浏览器 ScriptProcessor 可能有问题）
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    audioChunks = []
    mediaRecorder.ondataavailable = (e) => { audioChunks.push(e.data) }

    mediaRecorder.onstop = async () => {
      listening.value = false
      stream.getTracks().forEach((t) => t.stop())
      audioCtx.close()

      // 合并 PCM 数据并编码为 WAV
      const total = pcmChunks.reduce((acc, c) => acc + c.length, 0)
      const merged = new Float32Array(total)
      let pos = 0
      for (const chunk of pcmChunks) {
        merged.set(chunk, pos)
        pos += chunk.length
      }
      const wavBlob = encodeWAV(merged, 16000)

      console.log('[语音] 录音结束，PCM 采样数:', total, 'WAV 大小:', (wavBlob.size / 1024).toFixed(1), 'KB')

      if (wavBlob.size < 1024) {
        ElMessage.warning('录音太短，请重新说话')
        return
      }

      // 发送到后端识别
      try {
        const token = localStorage.getItem('token')
        const form = new FormData()
        form.append('audio', wavBlob, 'recording.wav')

        const res = await fetch('http://localhost:3000/api/chat/asr', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })

        const json = await res.json()
        if (json.code === 200 && json.data?.text) {
          inputText.value = json.data.text
          ElMessage.success('识别成功')
        } else {
          ElMessage.warning(json.message || '未识别到语音')
        }
      } catch (err: any) {
        console.error('[语音] ASR 请求失败:', err)
        ElMessage.error('语音识别请求失败')
      }
    }

    mediaRecorder.start()
    listening.value = true
    console.log('[语音] 开始录音...')

    // 最长录制 30 秒
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }, 30000)
  } catch (err: any) {
    console.error('[语音] 无法访问麦克风:', err)
    voiceSupported.value = false
    if (err.name === 'NotAllowedError') {
      ElMessage.warning('请在浏览器设置中允许麦克风权限')
    } else {
      ElMessage.warning('当前浏览器不支持语音输入')
    }
  }
}

// 音频播放
const playingMsgId = ref('')     // 正在播放的消息 id
const loadingMsgId = ref('')     // 正在合成 TTS 的消息 id
let currentAudio: HTMLAudioElement | null = null

async function handlePlayAudio(msgId: string) {
  // 如果正在播放同一段 → 暂停
  if (playingMsgId.value === msgId && currentAudio) {
    currentAudio.pause()
    playingMsgId.value = ''
    return
  }

  // 暂停之前的播放
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  loadingMsgId.value = msgId
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:3000/api/chat/audio/${msgId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()

    if (json.code === 200 && json.data.audioUrl) {
      const url = `http://localhost:3000${json.data.audioUrl}`
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.src = url
      currentAudio = audio

      try {
        console.log('[语音播放] 语言偏好:', prefLanguage.value, '| 后端音色映射见终端 [Chat] 日志')
        await audio.play()
        playingMsgId.value = msgId
        digitalHumanEmotion.value = 'speaking'
        startLipSync(audio)
        audio.onended = () => {
          playingMsgId.value = ''
          currentAudio = null
          stopLipSync(audio)
          digitalHumanEmotion.value = 'smile'
        }
      } catch (playErr: any) {
        console.error('[播放失败]', playErr.message)
        if (playErr.name === 'NotAllowedError') {
          // 浏览器拦截自动播放，静默失败，用户可手动点击播放按钮
          console.warn('浏览器拦截自动播放，请手动点击播放按钮')
          // 重置播放状态
          playingMsgId.value = ''
          currentAudio = null
        }
      }
    } else {
      console.error('[音频获取失败]', json)
    }
  } catch (err) {
    console.error('[请求失败]', err)
  } finally {
    loadingMsgId.value = ''
  }
}

// 快捷按钮
const quickButtons = [
  { label: '灵山大佛', text: '灵山大佛有多高？怎么参观？' },
  { label: '九龙灌浴', text: '九龙灌浴表演是什么？几点开始？' },
  { label: '灵山梵宫', text: '灵山梵宫有哪些艺术珍品？' },
  { label: '游览路线', text: '帮我推荐一条灵山胜境游览路线' },
  { label: '素斋美食', text: '灵山胜境有什么好吃的素斋？' },
]

// 发送消息
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || chatStore.isLoading) return
  inputText.value = ''
  digitalHumanEmotion.value = 'thinking'

  const result = await chatStore.sendMessage(text)
  digitalHumanEmotion.value = 'smile'

  // 流式输出完成后自动播放语音
  if (result?.assistantMsgId) {
    setTimeout(() => {
      handlePlayAudio(result.assistantMsgId)
    }, 600)
  }
}

// 快捷按钮
function handleQuick(text: string) {
  inputText.value = text
  handleSend()
}

watch(() => chatStore.isLoading, (val) => {
  if (!val) scrollToBottom()
})

function scrollToBottom() {
  nextTick(() => {
    chatListRef.value?.scrollTo({ top: chatListRef.value.scrollHeight, behavior: 'smooth' })
  })
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="home-root">
    <!-- 背景 -->
    <img :src="backgroundSvg" class="bg-image" alt="" />

    <!-- 顶部导航 -->
    <header class="top-bar">
      <div class="top-left">
        <svg class="logomark" width="24" height="28" viewBox="0 0 28 32" fill="none">
          <defs>
            <radialGradient id="hLogoGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stop-color="#FFE1CC" />
              <stop offset="100%" stop-color="#FFFFFF" />
            </radialGradient>
          </defs>
          <path d="M14 0L16.8 10.4L27 12.8L16.8 15.2L14 25.6L11.2 15.2L1 12.8L11.2 10.4L14 0Z" fill="url(#hLogoGrad)" />
          <path d="M5 16L6.6 20.8L11.2 22.4L6.6 24L5 28.8L3.4 24L1 22.4L3.4 20.8L5 16Z" fill="url(#hLogoGrad)" opacity="0.6" />
        </svg>
        <span class="logo-text">灵境·AI 导游</span>
      </div>

      <div class="top-right">
        <div class="user-badge">
          <img
            v-if="userStore.avatar"
            :src="userStore.avatar"
            class="user-avatar-img"
            alt="avatar"
          />
          <Icon v-else icon="mdi:account-circle" width="22" />
          <span class="username">{{ userStore.username || '游客' }}</span>
          <Icon icon="mdi:chevron-down" width="16" class="chevron" />
        </div>
      </div>
    </header>

    <!-- 主体 -->
    <div class="main-area">
      <!-- 侧边栏 -->
      <aside class="sidebar" :style="{ width: sidebarWidth }">
        <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
          <Icon
            :icon="sidebarCollapsed ? 'mdi:menu-open' : 'mdi:menu-close'"
            width="22"
          />
        </div>

        <nav class="sidebar-nav">
          <div
            v-for="item in sidebarItems"
            :key="item.key"
            class="sidebar-item"
            :class="{ active: activePanel === item.key }"
            @click="openPanel(item.key)"
          >
            <Icon :icon="item.icon" width="20" />
            <span v-show="!sidebarCollapsed" class="sidebar-label">{{ item.label }}</span>
          </div>
        </nav>

        <div class="sidebar-bottom">
          <div class="sidebar-item logout" @click="handleLogout">
            <Icon icon="mdi:logout" width="18" />
            <span v-show="!sidebarCollapsed" class="sidebar-label logout-label">退出登录</span>
          </div>
        </div>
      </aside>

      <!-- 聊天模式：数字人 + 聊天面板 -->
      <template v-if="!activePanel">
        <div class="human-panel">
        <div class="human-display" :class="digitalHumanEmotion">
          <div class="human-glow" />
          <!-- Live2D 数字人画布（始终渲染，加载完成前透明） -->
          <canvas
            ref="live2dCanvas"
            class="live2d-canvas"
            @click="handleHumanClick"
          />
          <!-- 加载中 / 失败时显示兜底图标 -->
          <template v-if="live2dState.status !== 'loaded'">
            <Icon
              v-if="live2dState.status === 'loading'"
              icon="mdi:loading"
              width="24"
              class="human-icon loading-spin"
            />
            <template v-else>
              <Icon :icon="emotionIcon[digitalHumanEmotion]" width="64" class="human-icon" />
              <div class="human-body-placeholder">
                <div class="body-shape" />
              </div>
            </template>
          </template>
        </div>
        <div class="human-info">
          <div class="human-name-row">
            <span class="human-name">{{ digitalHumanName }}</span>
            <span class="human-lang">{{ prefLanguage }}</span>
          </div>
          <div class="human-status">
            <span class="status-dot online" />
            <span class="status-text">在线</span>
          </div>
        </div>
      </div>

        <div class="chat-panel">
        <div ref="chatListRef" class="chat-list">
          <!-- 欢迎 -->
          <div v-if="chatStore.messages.length === 0" class="welcome-area">
            <Icon icon="mdi:chat-question" width="40" class="welcome-icon" />
            <h2>您好！我是您的 AI 导游 {{ digitalHumanName }}</h2>
            <p>有什么关于灵山胜境的问题，随时问我哦</p>
          </div>

          <!-- 消息 -->
          <div
            v-for="msg in chatStore.messages"
            :key="msg.id"
            class="message-row"
            :class="msg.role"
          >
            <div class="message-bubble" :class="msg.role">
              <div v-if="msg.role === 'assistant'" class="bubble-arrow" />
              <div class="bubble-content" v-html="md.render(msg.content)" />
              <span v-if="msg.typing" class="typing-cursor">|</span>
              <!-- AI 消息播放按钮 + 反馈 -->
              <div v-if="msg.role === 'assistant'" class="bubble-actions">
                <button
                  class="feedback-btn"
                  :class="{ active: msg.feedback === 'like' }"
                  :disabled="feedbackSubmitting === msg.id"
                  @click="handleFeedback(msg.id, 'like')"
                  title="有用"
                >
                  <Icon v-if="feedbackSubmitting === msg.id" icon="mdi:loading" width="16" class="spin" />
                  <Icon v-else icon="mdi:thumb-up-outline" width="16" />
                </button>
                <button
                  class="feedback-btn dislike"
                  :class="{ active: msg.feedback === 'dislike' }"
                  :disabled="feedbackSubmitting === msg.id"
                  @click="handleFeedback(msg.id, 'dislike')"
                  title="没用"
                >
                  <Icon v-if="feedbackSubmitting === msg.id" icon="mdi:loading" width="16" class="spin" />
                  <Icon v-else icon="mdi:thumb-down-outline" width="16" />
                </button>
                <button
                  class="play-btn"
                  :class="{ playing: playingMsgId === msg.id, loading: loadingMsgId === msg.id }"
                  @click="handlePlayAudio(msg.id)"
                  :disabled="loadingMsgId === msg.id"
                  :title="playingMsgId === msg.id ? '暂停' : '播放语音'"
                >
                  <Icon
                    v-if="playingMsgId === msg.id"
                    icon="mdi:pause-circle"
                    width="18"
                  />
                  <Icon
                    v-else-if="loadingMsgId === msg.id"
                    icon="mdi:loading"
                    width="18"
                    class="spin"
                  />
                  <Icon
                    v-else
                    icon="mdi:volume-high"
                    width="18"
                  />
                </button>
              </div>
            </div>
          </div>

          <!-- 加载中 -->
          <div v-if="chatStore.isLoading" class="message-row assistant">
            <div class="message-bubble assistant">
              <div class="bubble-arrow" />
              <div class="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="input-area">
          <div class="quick-row">
            <button
              v-for="btn in quickButtons"
              :key="btn.label"
              class="quick-pill"
              @click="handleQuick(btn.text)"
            >
              {{ btn.label }}
            </button>
          </div>

          <div class="input-row">
            <input
              v-model="inputText"
              class="msg-input"
              placeholder="请输入您想了解的灵山胜境信息"
              @keyup.enter="handleSend"
            />
            <button
              class="voice-btn"
              :class="{ listening }"
              :title="listening ? '正在聆听...' : '语音输入'"
              @click="handleVoiceInput"
            >
              <Icon v-if="listening" icon="mdi:microphone" width="20" class="pulse" />
              <Icon v-else icon="mdi:microphone-outline" width="20" />
            </button>
            <button class="send-btn" @click="handleSend" :disabled="chatStore.isLoading">
              <Icon icon="mdi:send" width="20" />
            </button>
          </div>
        </div>
        </div>
      </template>

      <!-- 内容面板模式（个人中心/偏好设置/历史聊天/我的反馈） -->
      <template v-else>
        <div class="content-panel">
          <!-- 返回按钮 -->
          <div class="content-panel-header">
            <button class="back-btn" @click="activePanel = ''">
              <Icon icon="mdi:arrow-left" width="20" />
              <span>返回</span>
            </button>
          </div>

          <div class="content-panel-body">
            <!-- 个人中心 -->
            <template v-if="activePanel === 'profile'">
              <h2 class="panel-title">
                <Icon icon="mdi:account-circle-outline" width="24" />
                个人中心
              </h2>

              <!-- 头像区 -->
              <div class="avatar-section">
                <div class="avatar-preview" @click="triggerAvatarInput">
                  <img v-if="userStore.avatar" :src="userStore.avatar" class="avatar-img" />
                  <Icon v-else icon="mdi:account-circle" width="52" class="avatar-placeholder" />
                  <div class="avatar-overlay">
                    <Icon v-if="avatarUploading" icon="mdi:loading" width="18" class="spin" />
                    <Icon v-else icon="mdi:camera" width="18" />
                  </div>
                </div>
                <div class="avatar-info">
                  <span class="avatar-nickname">{{ userStore.username || '未设置' }}</span>
                  <span class="avatar-hint">点击更换头像</span>
                </div>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="file-hidden"
                  @change="handleAvatarChange"
                />
              </div>

              <!-- 基本信息表单 -->
              <div class="form-group">
                <label class="form-label">用户名</label>
                <input v-model="profileForm.username" class="form-input" placeholder="请输入用户名" />
              </div>
              <div class="form-group">
                <label class="form-label">手机号</label>
                <input v-model="profileForm.phone" class="form-input" placeholder="请输入手机号" />
              </div>
              <div class="form-group">
                <label class="form-label">邮箱</label>
                <input v-model="profileForm.email" class="form-input" placeholder="请输入邮箱" />
              </div>

              <div class="form-actions">
                <button class="btn-save" :disabled="profileSaving" @click="handleSaveProfile">
                  {{ profileSaving ? '保存中...' : '保存修改' }}
                </button>
              </div>
              <p v-if="profileMsg" class="form-msg" :class="{ error: profileMsg.startsWith('❌') }">{{ profileMsg }}</p>

              <!-- 分隔线 -->
              <div class="section-divider">
                <span>安全设置</span>
              </div>

              <!-- 修改密码表单 -->
              <div class="form-group">
                <label class="form-label">旧密码</label>
                <input v-model="passwordForm.oldPassword" type="password" class="form-input" placeholder="请输入旧密码" />
              </div>
              <div class="form-group">
                <label class="form-label">新密码</label>
                <input v-model="passwordForm.newPassword" type="password" class="form-input" placeholder="请输入新密码（至少6位）" />
              </div>
              <div class="form-group">
                <label class="form-label">确认新密码</label>
                <input v-model="passwordForm.confirmPassword" type="password" class="form-input" placeholder="请再次输入新密码" />
              </div>

              <div class="form-actions">
                <button class="btn-save" :disabled="passwordSaving" @click="handleSavePassword">
                  {{ passwordSaving ? '修改中...' : '修改密码' }}
                </button>
              </div>
              <p v-if="passwordMsg" class="form-msg" :class="{ error: passwordMsg.startsWith('❌') }">{{ passwordMsg }}</p>
            </template>

            <!-- 偏好设置 -->
            <template v-if="activePanel === 'preferences'">
              <h2 class="panel-title">
                <Icon icon="mdi:tune" width="24" />
                偏好设置
              </h2>
              <div class="setting-group">
                <div class="setting-label">
                  <Icon icon="mdi:translate" width="16" />
                  <span>语言偏好</span>
                </div>
                <div class="setting-options">
                  <button
                    v-for="lang in languageOptions"
                    :key="lang"
                    class="option-pill"
                    :class="{ selected: prefLanguage === lang }"
                    @click="prefLanguage = lang"
                  >
                    {{ lang }}
                  </button>
                </div>
              </div>

              <div class="setting-group">
                <div class="setting-label">
                  <Icon icon="mdi:format-font" width="16" />
                  <span>字体大小</span>
                </div>
                <div class="setting-options">
                  <button
                    v-for="size in [12, 14, 16, 18]"
                    :key="size"
                    class="option-pill"
                    :class="{ selected: prefFontSize === size }"
                    @click="prefFontSize = size"
                  >
                    {{ size }}px
                  </button>
                </div>
              </div>

              <div class="setting-group">
                <div class="setting-label">
                  <Icon icon="mdi:map-marker-path" width="16" />
                  <span>旅行风格</span>
                </div>
                <div class="setting-options">
                  <button
                    v-for="style in travelStyleOptions"
                    :key="style"
                    class="option-pill"
                    :class="{ selected: prefTravelStyle === style }"
                    @click="prefTravelStyle = style"
                  >
                    {{ style }}
                  </button>
                </div>
              </div>

              <div class="setting-group">
                <div class="setting-label">
                  <Icon icon="mdi:heart-multiple" width="16" />
                  <span>兴趣爱好（多选）</span>
                </div>
                <div class="setting-options">
                  <button
                    v-for="it in interestOptions"
                    :key="it"
                    class="option-pill tag"
                    :class="{ selected: prefInterests.includes(it) }"
                    @click="toggleInterest(it)"
                  >
                    {{ it }}
                  </button>
                </div>
              </div>

              <div class="form-actions">
                <button class="btn-save" :disabled="prefSaving" @click="handleSavePreferences">
                  {{ prefSaving ? '保存中...' : '保存设置' }}
                </button>
              </div>
              <p v-if="prefMsg" class="form-msg" :class="{ error: prefMsg.startsWith('❌') }">{{ prefMsg }}</p>
            </template>

            <!-- 历史聊天 -->
            <template v-if="activePanel === 'history'">
              <h2 class="panel-title">
                <Icon icon="mdi:history" width="24" />
                历史聊天
              </h2>
              <p v-if="historyLoading" class="panel-empty">加载中...</p>
              <p v-else-if="historyList.length === 0" class="panel-empty">暂无聊天记录</p>
              <div v-else class="history-list">
                <template v-for="group in groupedHistory" :key="group.label">
                  <div class="history-date-label">{{ group.label }}</div>
                  <div
                    v-for="item in group.items"
                    :key="item.id"
                    class="history-card"
                    :class="{ expanded: expandedId === item.id }"
                    @click="toggleExpand(item.id)"
                  >
                    <div class="history-card-header">
                      <Icon icon="mdi:chat-question" width="16" />
                      <span class="history-question">{{ item.question }}</span>
                      <span class="history-time">{{ item.time }}</span>
                      <Icon
                        :icon="expandedId === item.id ? 'mdi:chevron-up' : 'mdi:chevron-down'"
                        width="16"
                        class="history-chevron"
                      />
                    </div>
                    <div v-if="expandedId === item.id" class="history-answer">
                      {{ item.answer }}
                    </div>
                  </div>
                </template>
              </div>
            </template>

            <!-- 我的反馈 -->
            <template v-if="activePanel === 'feedback'">
              <h2 class="panel-title">
                <Icon icon="mdi:message-reply-text" width="24" />
                我的反馈
              </h2>

              <div v-if="feedbackLoading" class="panel-empty">加载中...</div>
              <div v-else-if="feedbackList.length === 0" class="panel-empty">暂无反馈记录，去聊天里给 AI 回复点个赞吧~</div>

              <div v-else class="feedback-list">
                <template v-for="group in groupedFeedback" :key="group.label">
                  <div class="history-date-label">{{ group.label }}</div>
                  <div
                    v-for="item in group.items"
                    :key="item.id"
                    class="feedback-card"
                    :class="item.feedback"
                  >
                    <div class="feedback-q">{{ item.question }}</div>
                    <div class="feedback-a">{{ item.answer }}</div>
                    <div class="feedback-meta">
                      <span class="feedback-time">{{ item.time }}</span>
                      <span class="feedback-tag" :class="item.feedback">
                        <Icon :icon="item.feedback === 'like' ? 'mdi:thumb-up' : 'mdi:thumb-down'" width="14" />
                        {{ item.feedback === 'like' ? '有用' : '没用' }}
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ========== 全局 ========== */
.home-root {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.bg-image {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  z-index: -1;
}

/* ========== 顶部导航 ========== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 10;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logomark {
  flex-shrink: 0;
}

.logo-text {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  white-space: nowrap;
}

.top-right {
  display: flex;
  align-items: center;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-avatar-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.user-badge:hover {
  background: rgba(255, 255, 255, 0.12);
}

.chevron {
  opacity: 0.4;
}

/* ========== 主体 ========== */
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 14px 14px 6px;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: color 0.2s;
}

.sidebar-toggle:hover {
  color: rgba(255, 255, 255, 0.7);
}

.sidebar-nav {
  flex: 1;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
}

.sidebar-item.active {
  background: rgba(255, 225, 204, 0.1);
  color: #FFE1CC;
}

.sidebar-label {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 13px;
}

.sidebar-bottom {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-item.logout:hover {
  background: rgba(255, 80, 80, 0.15);
  color: #ff6b6b;
}

.logout-label {
  font-size: 12px;
}

/* ========== 右侧内容面板（非聊天模式） ========== */
.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: rgba(0, 0, 0, 0.1);
}

.content-panel-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}

.content-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.content-panel-body::-webkit-scrollbar {
  width: 4px;
}

.content-panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.content-panel-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px;
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.panel-title :deep(svg) {
  color: #FFE1CC;
}

/* 信息行（个人中心） */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.info-row + .info-row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.info-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

.info-value {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

/* 空态 */
.panel-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  padding: 40px 0;
  margin: 0;
}

/* ========== 历史聊天列表 ========== */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-date-label {
  padding: 16px 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.history-date-label:first-child {
  padding-top: 0;
}

.history-card {
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 2px;
}

.history-card:hover {
  background: rgba(255, 255, 255, 0.04);
}

.history-card.expanded {
  background: rgba(255, 255, 255, 0.05);
}

.history-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-card-header :deep(svg) {
  flex-shrink: 0;
}

.history-card-header :deep(svg:first-child) {
  color: #FFE1CC;
}

.history-question {
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.history-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

.history-chevron {
  color: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

.history-answer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* ========== 个人中心表单 ========== */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}

.avatar-preview {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s;
  color: #fff;
}

.avatar-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.avatar-nickname {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.avatar-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

.file-hidden {
  display: none;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.form-input {
  width: 50%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 13px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: rgba(255, 225, 204, 0.4);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.form-actions {
  margin-top: 20px;
}

.btn-save {
  height: 40px;
  padding: 0 32px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 225, 204, 0.85), rgba(255, 245, 235, 0.7));
  color: #1a1a1a;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-save:hover {
  opacity: 0.9;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-msg {
  margin: 10px 0 0;
  font-size: 12px;
  color: #52c41a;
}

.form-msg.error {
  color: #ff6b6b;
}

.section-divider {
  display: flex;
  align-items: center;
  margin: 28px 0 20px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 12px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.section-divider span {
  padding: 0 12px;
}

/* 设置组（偏好设置） */
.setting-group + .setting-group {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.setting-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.option-pill {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.option-pill:hover {
  border-color: rgba(255, 225, 204, 0.3);
  color: rgba(255, 255, 255, 0.8);
}

.option-pill.selected {
  background: rgba(255, 225, 204, 0.15);
  border-color: #FFE1CC;
  color: #FFE1CC;
}

/* ========== 数字人面板 ========== */
.human-panel {
  width: 32%;
  min-width: 240px;
  max-width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.human-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.human-glow {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 225, 204, 0.12) 0%, transparent 70%);
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}

.human-icon {
  color: rgba(255, 225, 204, 0.85);
  z-index: 1;
  margin-bottom: 12px;
}

.loading-spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.live2d-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  z-index: 1;
}

.human-body-placeholder {
  z-index: 1;
}

.body-shape {
  width: 48px;
  height: 80px;
  border-radius: 24px 24px 8px 8px;
  background: linear-gradient(180deg, rgba(255, 225, 204, 0.4), rgba(255, 225, 204, 0.15));
}

.human-info {
  padding: 14px 20px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.human-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.human-name {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.human-lang {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 225, 204, 0.15);
  color: #FFE1CC;
}

.human-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.status-dot.online {
  background: #52c41a;
  box-shadow: 0 0 6px rgba(82, 196, 26, 0.5);
}

.status-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

/* ========== 聊天面板 ========== */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.chat-list::-webkit-scrollbar {
  width: 4px;
}

.chat-list::-webkit-scrollbar-track {
  background: transparent;
}

.chat-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

/* 欢迎区 */
.welcome-area {
  text-align: center;
  padding: 60px 20px;
}

.welcome-icon {
  color: rgba(255, 225, 204, 0.5);
  margin-bottom: 16px;
}

.welcome-area h2 {
  font-family: 'Geist', 'Inter', 'Noto Sans SC', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px;
}

.welcome-area p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}

/* 消息气泡 */
.message-row {
  display: flex;
  margin-bottom: 18px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 72%;
  padding: 10px 16px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.7;
  position: relative;
}

.message-bubble.user {
  background: linear-gradient(135deg, rgba(255, 225, 204, 0.85), rgba(255, 245, 235, 0.7));
  color: #1a1a1a;
  border-bottom-right-radius: 4px;
}

.message-bubble.assistant {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  border-bottom-left-radius: 4px;
}

.bubble-arrow {
  position: absolute;
  left: -7px;
  top: 12px;
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-right: 7px solid rgba(255, 255, 255, 0.05);
}

/* markdown 内容 */
.bubble-content :deep(p) {
  margin: 0 0 6px;
}

.bubble-content :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble-content :deep(strong) {
  color: #FFE1CC;
}

.bubble-content :deep(ul), .bubble-content :deep(ol) {
  padding-left: 18px;
  margin: 4px 0;
}

/* 播放按钮 + 反馈按钮 */
.bubble-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.65);
}

.feedback-btn.active {
  background: rgba(150, 220, 150, 0.2);
  color: #96dc96;
}

.feedback-btn.dislike.active {
  background: rgba(255, 150, 150, 0.2);
  color: #ff9696;
}

.feedback-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn:hover {
  background: rgba(255, 225, 204, 0.15);
  color: #FFE1CC;
}

.play-btn.playing {
  background: rgba(255, 225, 204, 0.2);
  color: #FFE1CC;
}

.play-btn.loading {
  cursor: wait;
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 打字动画 */
.typing-dots {
  display: flex;
  gap: 5px;
  padding: 4px 0;
}

.typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: blink 1.4s infinite both;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

/* 打字机光标 */
.typing-cursor {
  color: var(--el-color-primary);
  font-weight: bold;
  font-size: 16px;
  animation: blink 1s infinite;
  margin-left: 2px;
}

/* ========== 输入区 ========== */
.input-area {
  padding: 12px 20px 16px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.quick-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.quick-pill {
  padding: 5px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-pill:hover {
  background: rgba(255, 225, 204, 0.15);
  border-color: rgba(255, 225, 204, 0.3);
  color: #FFE1CC;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-input {
  flex: 1;
  height: 42px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 14px;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  outline: none;
  transition: border-color 0.2s;
}

.msg-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.msg-input:focus {
  border-color: rgba(255, 225, 204, 0.4);
}

.voice-btn,
.send-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.voice-btn {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
}

.voice-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

.voice-btn.listening {
  background: rgba(255, 80, 80, 0.2);
  color: #ff5555;
}

.pulse {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.15); }
}

.send-btn {
  background: linear-gradient(135deg, #FFE1CC, #FFFFFF);
  color: #1a1a1a;
}

.send-btn:hover {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ========== 反馈列表 ========== */
.feedback-list {
  padding: 4px 0;
}

.feedback-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-left: 3px solid transparent;
  transition: background 0.2s;
}

.feedback-card:hover {
  background: rgba(255, 255, 255, 0.06);
}

.feedback-card.like {
  border-left-color: #96dc96;
}

.feedback-card.dislike {
  border-left-color: #ff9696;
}

.feedback-q {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.feedback-a {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.feedback-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feedback-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
}

.feedback-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
}

.feedback-tag.like {
  color: #96dc96;
  background: rgba(150, 220, 150, 0.12);
}

.feedback-tag.dislike {
  color: #ff9696;
  background: rgba(255, 150, 150, 0.12);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .human-panel {
    display: none;
  }

  .sidebar {
    width: 48px !important;
  }

  .sidebar-label {
    display: none;
  }
}
</style>
