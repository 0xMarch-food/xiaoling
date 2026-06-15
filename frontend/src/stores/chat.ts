import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage } from '@/types/chat'

const API_BASE = 'http://localhost:3000/api'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)

  // 流式发送消息 → AI 回复逐字输出
  async function sendMessage(text: string): Promise<{ assistantMsgId: string } | undefined> {
    const token = localStorage.getItem('token')
    if (!token) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    messages.value.push(userMsg)

    // 先建立 AI 占位消息
    const aiId = `msg_stream_${Date.now()}`
    const aiMsg: ChatMessage = {
      id: aiId,
      role: 'assistant',
      content: '',
      typing: true,
      timestamp: Date.now(),
    }
    messages.value.push(aiMsg)
    isLoading.value = true

    // ⚠️ 从数组中取出响应式代理，直接修改 aiMsg.content 不会触发 Vue 响应式
    const reactiveMsg = messages.value[messages.value.length - 1]

    try {
      const res = await fetch(`${API_BASE}/chat/send-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()

          try {
            const json = JSON.parse(data)
            if (json.chunk) {
              // 收到第一个真正的 chunk 时，清除"思考中"占位文字
              if (!reactiveMsg.content || reactiveMsg.content === '小灵正在思考...') {
                reactiveMsg.content = json.chunk
              } else {
                reactiveMsg.content += json.chunk
              }
            } else if (json.status === 'thinking') {
              reactiveMsg.content = '小灵正在思考...'
            } else if (json.done) {
              reactiveMsg.typing = false
              reactiveMsg.id = json.aiMsgId || aiId
              if (json.userMsgId) userMsg.id = json.userMsgId
            } else if (json.error) {
              reactiveMsg.content = '抱歉，出错了：' + json.error
              reactiveMsg.typing = false
            }
          } catch { /* skip unparseable */ }
        }
      }

      return { assistantMsgId: reactiveMsg.id }
    } catch (err: any) {
      reactiveMsg.content = err.message === 'Failed to fetch'
        ? '网络错误，请检查后端服务是否启动'
        : '抱歉，我暂时无法回答，请稍后再试~'
      reactiveMsg.typing = false
    } finally {
      isLoading.value = false
    }
  }

  function clearMessages() {
    messages.value = []
  }

  return { messages, isLoading, sendMessage, clearMessages }
})
