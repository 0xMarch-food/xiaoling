/**
 * AI 回复核心服务
 *
 * 组合 RAG 检索 + 用户画像 + 大模型调用，
 * 实现个性化、知识增强的 AI 导游回复。
 */

import { callLLM } from './llm.js'
import { searchKnowledge } from './knowledgeBase.js'
import Questionnaire from '../models/Questionnaire.js'
import Message from '../models/Message.js'
import DailyStat from '../models/DailyStat.js'

/**
 * 构建 AI 回复的 prompt messages（不含当前用户消息）
 * 流式和非流式共用此函数
 */
export async function buildAIPrompt(userId, language = '普通话') {
  const questionnaire = await Questionnaire.findOne({ userId })
  const userProfile = questionnaire
    ? `当前游客偏好：${questionnaire.interests?.join('、') || '无'}；游玩风格：${questionnaire.travelStyle || '未填写'}。`
    : ''

  const recentMessages = await Message.find({ userId })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('role content')
  const chatHistory = recentMessages.reverse()
    .map(m => `${m.role === 'user' ? '游客' : '导游'}: ${m.content}`)
    .join('\n')

  const messages = [
    {
      role: 'system',
      content: `你是无锡灵山胜境景区的AI数字人导游"小灵"，性格亲切热情、幽默风趣。你要做到：
1. 当语言是"英语"时，用英文回复游客；当语言是方言（四川话、粤语、东北话、闽南语）时，模仿该方言的口语表达习惯用普通话回复；当语言是"普通话"时，用标准普通话回复
2. 回答简洁有趣，多用 emoji 和 Markdown 格式增强可读性
3. 只回答与灵山胜境旅游相关的问题（灵山大佛、九龙灌浴、梵宫、五印坛城、祥符禅寺、拈花湾等），无关问题礼貌引导回正题
4. 遇到不确定的信息，诚实说明而非编造
当前选择语言：${language}
${userProfile}`,
    },
  ]

  if (chatHistory) {
    messages.push({
      role: 'system',
      content: `最近的对话记录：\n${chatHistory}`,
    })
  }

  return messages
}

/**
 * 获取 AI 回复（主入口）
 * @param {string} userMessage - 用户消息
 * @param {string} userId - 用户 ID
 * @returns {Promise<string>} AI 回复文本（Markdown 格式）
 */
export async function getAIReply(userMessage, userId, language = '普通话') {
  // ===== 1. 知识库检索 =====
  const knowledgeDocs = await searchKnowledge(userMessage, 3)
  const knowledgeContext = knowledgeDocs.length > 0
    ? `参考以下资料回答问题：\n${knowledgeDocs.map(d => `【${d.name}】${d.content}`).join('\n\n')}`
    : ''

  // ===== 2. 构建 prompt =====
  const messages = await buildAIPrompt(userId, language)
  // 注入知识库上下文到 system prompt
  messages[0].content += `\n${knowledgeContext}`
  // 添加当前用户问题
  messages.push({ role: 'user', content: userMessage })

  // ===== 3. 调用大模型 =====
  const reply = await callLLM(messages)

  // ===== 4. 更新每日统计 =====
  updateDailyStat(userId).catch(err => console.error('[AI] 统计更新失败:', err))

  return reply
}

// ===== 辅助：更新每日统计数据 =====
async function updateDailyStat(userId) {
  const today = new Date().toISOString().slice(0, 10)   // "2026-06-13"

  // 查询今天是否已有该用户的对话（判断是否新访客）
  const todayMsg = await Message.findOne({
    userId,
    createdAt: { $gte: new Date(today) },
  })

  const isNewVisitor = !todayMsg

  await DailyStat.findOneAndUpdate(
    { date: today },
    {
      $inc: {
        questionCount: 1,
        visitorCount: isNewVisitor ? 1 : 0,      // 新访客才 +1
      },
      $setOnInsert: {
        date: today,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        avgSatisfaction: 0,
      },
    },
    { upsert: true, new: true },
  )
}
