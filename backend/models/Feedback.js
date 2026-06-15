/**
 * Feedback 模型 — 用户反馈
 *
 * 用户提交的建议或问题反馈，包含评分（1-5）
 * 管理后台可查看所有反馈列表
 */

import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema({
  // 提交用户（可选 — 游客也可能提交反馈）
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // 反馈内容
  content: {
    type: String,
    required: [true, '反馈内容不能为空'],
    trim: true,
    maxlength: [1000, '反馈内容不能超过1000字'],
  },

  // 评分（1-5 星）
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// 按时间倒序查看最新反馈
feedbackSchema.index({ createdAt: -1 })

const Feedback = mongoose.model('Feedback', feedbackSchema)

export default Feedback
