/**
 * Message 模型 — 聊天消息
 *
 * 每条消息属于一个用户，按 createdAt 排序即为对话顺序
 * feedback 字段记录用户对 AI 回复的评价（like / dislike）
 */

import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,         // 按用户查询聊天历史
  },

  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },

  content: {
    type: String,
    required: [true, '消息内容不能为空'],
  },

  // 仅 AI 回复可用：TTS 语音文件 URL
  audioUrl: {
    type: String,
    default: '',
  },

  // 仅 AI 回复可用：用户反馈
  feedback: {
    type: String,
    enum: ['like', 'dislike', ''],
    default: '',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// 复合索引：按用户+时间查询聊天历史
messageSchema.index({ userId: 1, createdAt: 1 })

const Message = mongoose.model('Message', messageSchema)

export default Message
