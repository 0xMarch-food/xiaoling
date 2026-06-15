/**
 * DailyStat 模型 — 每日统计数据
 *
 * 每天一条汇总记录，用于管理后台数据大屏展示
 * 由聊天消息自动聚合生成，也可手动插入历史数据
 */

import mongoose from 'mongoose'

const dailyStatSchema = new mongoose.Schema({
  // 统计日期（"2026-06-13" 格式）
  date: {
    type: String,
    required: true,
    unique: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, '日期格式需为 YYYY-MM-DD'],
  },

  // 当天服务人次（有发送消息的唯一用户数）
  visitorCount: { type: Number, default: 0 },

  // 当天提问总数
  questionCount: { type: Number, default: 0 },

  // 平均满意度（1-5）
  avgSatisfaction: { type: Number, default: 0, min: 1, max: 5 },

  // 情绪分布
  positiveCount: { type: Number, default: 0 },
  neutralCount:  { type: Number, default: 0 },
  negativeCount: { type: Number, default: 0 },
})

const DailyStat = mongoose.model('DailyStat', dailyStatSchema)

export default DailyStat
