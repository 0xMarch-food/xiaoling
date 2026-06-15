/**
 * Questionnaire 模型 — 用户问卷信息
 *
 * 与 User 一对一关联（userId 唯一索引）
 * 字段对应前端 Vue 的 UserProfile 类型
 */

import mongoose from 'mongoose'

const questionnaireSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,        // 一个用户只有一份问卷
  },

  // 基础信息
  name:   { type: String, default: '' },
  gender: { type: String, enum: ['男', '女', ''], default: '' },
  age:    { type: Number, min: 1, max: 120, default: 0 },

  // 地域信息
  country:  { type: String, default: '中国' },
  province: { type: String, default: '' },
  city:     { type: String, default: '' },
  hometown: { type: String, default: '' },       // 家乡（用于语言推荐）

  // 语言信息
  nativeLanguage: { type: String, default: '普通话' },

  // 兴趣偏好（多选，存字符串数组）
  interests: [{
    type: String,
    enum: ['历史文化', '古建筑', '美食', '自然风景', '摄影打卡', '民俗文化', '博物馆', '红色文化'],
  }],

  // 游玩偏好（单选）
  travelStyle: {
    type: String,
    enum: ['深度游', '快速游', '家庭游', '情侣游', '老年游', '亲子游', ''],
    default: '',
  },

  // 时间戳
  updatedAt: { type: Date, default: Date.now },
})

// 保存前自动更新 updatedAt
questionnaireSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

// findOneAndUpdate 也会触发
questionnaireSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

const Questionnaire = mongoose.model('Questionnaire', questionnaireSchema)

export default Questionnaire
