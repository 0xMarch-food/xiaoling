/**
 * User 模型 — 用户账号
 *
 * 字段说明:
 *   username - 用户名（必填）
 *   email    - 邮箱（必填、唯一、小写存储）
 *   phone    - 手机号（可选）
 *   password - bcrypt 加密密码（必填）
 *   role     - 角色：user | admin
 *   hasCompletedQuestionnaire - 是否已完成问卷
 */

import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    trim: true,
    maxlength: [50, '用户名不能超过50个字符'],
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '邮箱格式不正确'],
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  avatar: {
    type: String,
    default: '',     // 头像 URL，空字符串表示未设置
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6位'],
    select: false,      // 查询时默认不返回 password 字段
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  hasCompletedQuestionnaire: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// 索引：邮箱唯一已在字段定义中，此处补充 phone 索引（可选）
userSchema.index({ phone: 1 }, { sparse: true })

const User = mongoose.model('User', userSchema)

export default User
