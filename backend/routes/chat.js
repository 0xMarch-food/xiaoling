/**
 * 聊天路由 — POST /send  GET /history  DELETE /history  POST /feedback/:id  POST /asr
 */

import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import Message from '../models/Message.js'
import Questionnaire from '../models/Questionnaire.js'
import auth from '../middleware/auth.js'
import { getAIReply, buildAIPrompt } from '../services/ai.js'
import { textToSpeech, getVoiceForLanguage } from '../services/tts.js'
import { speechToText } from '../services/asr.js'
import { callLLMStream } from '../services/llm.js'
import { searchKnowledge } from '../services/knowledgeBase.js'

const router = Router()

// ===== Multer 配置（音频上传）=====
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/audio/',
    filename: (_req, _file, cb) => {
      const id = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, 'asr_' + id + '.wav')
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
})

// ==================== POST /api/chat/send-stream ====================
// 流式输出 AI 回复（SSE）
router.post('/send-stream', auth, async (req, res) => {
  const { message } = req.body
  if (!message || !message.trim()) {
    return res.status(400).json({ code: 400, message: '消息不能为空' })
  }

  // 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 禁用 Nagle 算法：确保每个 res.write() 立即发送，不被 TCP 缓冲合并
  if (req.socket) req.socket.setNoDelay(true)

  res.flushHeaders()

  // 立即发送"思考中"状态，给用户即时反馈（避免白屏等待）
  res.write(`data: ${JSON.stringify({ status: 'thinking' })}\n\n`)

  let fullContent = ''

  try {
    // 1. 保存用户消息
    const userMsg = await Message.create({
      userId: req.userId,
      role: 'user',
      content: message.trim(),
    })

    // 2. 获取语言偏好
    const questionnaire = await Questionnaire.findOne({ userId: req.userId })
    const nativeLanguage = questionnaire?.nativeLanguage || '普通话'

    // 3. 构建 prompt + 知识库检索（RAG）
    const messages = await buildAIPrompt(req.userId, nativeLanguage)
    const knowledgeDocs = await searchKnowledge(message.trim(), 3)
    if (knowledgeDocs.length > 0) {
      const knowledgeContext = knowledgeDocs.map(d => `【${d.name}】${d.content}`).join('\n\n')
      messages[0].content += `\n参考以下资料回答问题：\n${knowledgeContext}`
    }
    messages.push({ role: 'user', content: message.trim() })

    // 4. 流式调用 LLM（每个 chunk 立即写入响应）
    for await (const chunk of callLLMStream(messages)) {
      fullContent += chunk
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      // setTimeout（timers 阶段）让出 poll 阶段给 I/O，确保 chunk 被立即推送
      await new Promise(resolve => setTimeout(resolve, 20))
    }

    // 5. 保存 AI 消息
    const aiMsg = await Message.create({
      userId: req.userId,
      role: 'assistant',
      content: fullContent,
    })

    // 6. 发送完成事件（含 AI 消息 ID，前端用于获取 TTS）
    res.write(`data: ${JSON.stringify({ done: true, userMsgId: userMsg._id, aiMsgId: aiMsg._id, content: fullContent })}\n\n`)

    // 7. 异步合成 TTS
    const voiceId = getVoiceForLanguage(nativeLanguage)
    console.log('[Chat-Stream] 语言:', nativeLanguage, '→ 音色:', voiceId)
    textToSpeech(fullContent, voiceId)
      .then(async (result) => {
        if (result.url) {
          await Message.findByIdAndUpdate(aiMsg._id, { audioUrl: result.url })
          console.log('[Chat-Stream] TTS 音频已关联:', result.url)
        }
      })
      .catch(err => console.error('[Chat-Stream] TTS 失败:', err.message))

    res.end()
  } catch (err) {
    console.error('[Chat-Stream] 错误:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// ==================== POST /api/chat/send ====================
// 发送消息，返回用户消息 + AI 回复
router.post('/send', auth, async (req, res) => {
  try {
    const { message } = req.body
    if (!message || !message.trim()) {
      return res.status(400).json({ code: 400, message: '消息不能为空' })
    }

    // 1. 保存用户消息
    const userMsg = await Message.create({
      userId: req.userId,
      role: 'user',
      content: message.trim(),
    })

    // 2. 获取用户语言偏好
    const questionnaire = await Questionnaire.findOne({ userId: req.userId })
    const nativeLanguage = questionnaire?.nativeLanguage || '普通话'

    // 3. 获取 AI 回复
    let aiContent
    try {
      aiContent = await getAIReply(message.trim(), req.userId, nativeLanguage)
    } catch (aiErr) {
      console.error('[Chat] AI 回复失败:', aiErr)
      aiContent = '抱歉，我暂时无法回答这个问题，请稍后再试~ 😅'
    }

    // 4. 保存 AI 回复
    const aiMsg = await Message.create({
      userId: req.userId,
      role: 'assistant',
      content: aiContent,
    })

    // 5. TTS 语音合成（异步，不阻塞回复）
    let audioUrl = ''
    const voiceId = getVoiceForLanguage(nativeLanguage)
    console.log('[Chat] 语言:', nativeLanguage, '→ 音色:', voiceId)
    textToSpeech(aiContent, voiceId)
      .then(async (result) => {
        if (result.url) {
          const updated = await Message.findByIdAndUpdate(aiMsg._id, { audioUrl: result.url }, { new: true })
          console.log('[Chat] TTS 音频已关联:', result.url, '→', updated ? 'OK' : 'FAIL')
        }
      })
      .catch(err => console.error('[Chat] TTS 合成失败:', err.message))

    res.json({
      code: 200,
      data: {
        userMessage: userMsg,
        aiReply: { ...aiMsg.toObject(), audioUrl: aiMsg.audioUrl || '' },
      },
    })
  } catch (err) {
    console.error('[Chat] 发送消息失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== GET /api/chat/history ====================
// 获取当前用户的聊天历史（最近 100 条）
router.get('/history', auth, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.userId })
      .sort({ createdAt: 1 })            // 正序
      .limit(100)
      .select('-userId')                  // 不返回 userId

    res.json({ code: 200, data: messages })
  } catch (err) {
    console.error('[Chat] 获取历史失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== DELETE /api/chat/history ====================
// 清空当前用户的聊天记录
router.delete('/history', auth, async (req, res) => {
  try {
    await Message.deleteMany({ userId: req.userId })
    res.json({ code: 200, message: '聊天记录已清空' })
  } catch (err) {
    console.error('[Chat] 清空历史失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== GET /api/chat/audio/:messageId ====================
// 按需获取 AI 回复的 TTS 语音（有缓存则直接返回，无则合成）
router.get('/audio/:messageId', auth, async (req, res) => {
  try {
    const msg = await Message.findOne({
      _id: req.params.messageId,
      userId: req.userId,
      role: 'assistant',
    })

    if (!msg) {
      return res.status(404).json({ code: 404, message: '消息不存在' })
    }

    // 已有缓存 → 直接返回
    if (msg.audioUrl) {
      return res.json({ code: 200, data: { audioUrl: msg.audioUrl } })
    }

    // 无缓存 → 加载语言偏好并合成
    console.log('[Chat] 按需合成 TTS，消息:', msg._id)
    const questionnaire = await Questionnaire.findOne({ userId: req.userId })
    const nativeLanguage = questionnaire?.nativeLanguage || '普通话'
    const voiceId = getVoiceForLanguage(nativeLanguage)
    const result = await textToSpeech(msg.content, voiceId)

    if (result.url) {
      await Message.findByIdAndUpdate(msg._id, { audioUrl: result.url })
      return res.json({ code: 200, data: { audioUrl: result.url } })
    }

    res.status(500).json({ code: 500, message: '语音合成失败，请稍后重试' })
  } catch (err) {
    console.error('[Chat] 获取音频失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== POST /api/chat/feedback/:messageId ====================
// 对 AI 回复点赞/踩
router.post('/feedback/:messageId', auth, async (req, res) => {
  try {
    const { feedback } = req.body      // 'like' | 'dislike'
    if (!['like', 'dislike'].includes(feedback)) {
      return res.status(400).json({ code: 400, message: 'feedback 值无效，请传 like 或 dislike' })
    }

    const msg = await Message.findOneAndUpdate(
      { _id: req.params.messageId, userId: req.userId, role: 'assistant' },
      { feedback },
      { new: true },
    )

    if (!msg) {
      return res.status(404).json({ code: 404, message: '消息不存在' })
    }

    res.json({ code: 200, message: '反馈成功', data: msg })
  } catch (err) {
    console.error('[Chat] 反馈失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

router.post('/asr', auth, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '未收到音频文件' })
    }

    console.log('[Chat] 收到语音，文件:', req.file.path, '大小:', (req.file.size / 1024).toFixed(1), 'KB')

    const text = await speechToText(req.file.path, 'wav', 16000)

    // 识别完成后删除临时文件
    fs.unlink(req.file.path, () => {})

    if (!text || !text.trim()) {
      return res.status(400).json({ code: 400, message: '未识别到语音内容，请重试' })
    }

    res.json({ code: 200, data: { text: text.trim() } })
  } catch (err) {
    console.error('[Chat] ASR 失败:', err.message)
    // 清理临时文件
    if (req.file) fs.unlink(req.file.path, () => {})
    res.status(500).json({ code: 500, message: '语音识别失败: ' + err.message })
  }
})

export default router
