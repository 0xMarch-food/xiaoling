/**
 * 用户认证路由 — POST /register  POST /login  GET /me
 */

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = Router()

// ==================== POST /api/auth/register ====================
// 注册新用户
router.post('/register', async (req, res) => {
  try {
    const { username, email, phone, password } = req.body

    // 1. 参数校验
    if (!username || !email || !password) {
      return res.status(400).json({ code: 400, message: '用户名、邮箱和密码不能为空' })
    }

    // 2. 检查邮箱是否已注册
    const existUser = await User.findOne({ email })
    if (existUser) {
      return res.status(400).json({ code: 400, message: '该邮箱已被注册' })
    }

    // 3. 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. 创建用户
    const user = await User.create({
      username,
      email,
      phone: phone || '',
      password: hashedPassword,
    })

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        userId: user._id,
        username: user.username,
      },
    })
  } catch (err) {
    // Mongoose 校验错误（如邮箱格式不对）
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('; ')
      return res.status(400).json({ code: 400, message: msg })
    }
    console.error('[Auth] 注册失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== POST /api/auth/login ====================
// 登录 — 支持手机号/邮箱/用户名三种方式
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body

    if (!account || !password) {
      return res.status(400).json({ code: 400, message: '账号和密码不能为空' })
    }

    // 1. 查找用户（手机号/邮箱/用户名任一匹配）
    const user = await User.findOne({
      $or: [
        { phone: account },
        { email: account },
        { username: account },
      ],
    }).select('+password')   // 显式包含 password 字段

    if (!user) {
      return res.status(400).json({ code: 400, message: '账号不存在' })
    }

    // 2. 验证密码
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ code: 400, message: '密码错误' })
    }

    // 3. 生成 JWT（有效期 7 天）
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    // 4. 返回
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar || '',
          role: user.role,
          hasCompletedQuestionnaire: user.hasCompletedQuestionnaire,
          createdAt: user.createdAt,
        },
      },
    })
  } catch (err) {
    console.error('[Auth] 登录失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== GET /api/auth/me ====================
// 获取当前登录用户信息（需 token）
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }

    res.json({
      code: 200,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || '',
        role: user.role,
        hasCompletedQuestionnaire: user.hasCompletedQuestionnaire,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error('[Auth] 获取用户信息失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== PUT /api/auth/profile ====================
// 更新用户基本信息（用户名/手机号/邮箱）
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, phone } = req.body
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }

    // 校验必填
    if (!username || !email) {
      return res.status(400).json({ code: 400, message: '用户名和邮箱不能为空' })
    }

    // 检查邮箱是否被其他用户占用
    if (email !== user.email) {
      const existUser = await User.findOne({ email, _id: { $ne: req.userId } })
      if (existUser) {
        return res.status(400).json({ code: 400, message: '该邮箱已被其他用户使用' })
      }
    }

    user.username = username
    user.email = email
    user.phone = phone || ''
    await user.save()

    res.json({
      code: 200,
      message: '个人信息更新成功',
      data: {
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || '',
      },
    })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('; ')
      return res.status(400).json({ code: 400, message: msg })
    }
    console.error('[Auth] 更新个人信息失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== PUT /api/auth/password ====================
// 修改密码
router.put('/password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ code: 400, message: '旧密码和新密码不能为空' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ code: 400, message: '新密码至少6位' })
    }

    const user = await User.findById(req.userId).select('+password')
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }

    // 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ code: 400, message: '旧密码不正确' })
    }

    // 加密并保存新密码
    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.json({ code: 200, message: '密码修改成功' })
  } catch (err) {
    console.error('[Auth] 修改密码失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== PUT /api/auth/avatar ====================
// 上传/更新头像（接受 base64）
router.put('/avatar', auth, async (req, res) => {
  try {
    const { avatar: avatarData } = req.body

    if (!avatarData) {
      return res.status(400).json({ code: 400, message: '头像数据不能为空' })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }

    user.avatar = avatarData
    await user.save()

    res.json({
      code: 200,
      message: '头像更新成功',
      data: { avatar: user.avatar },
    })
  } catch (err) {
    console.error('[Auth] 更新头像失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

export default router
