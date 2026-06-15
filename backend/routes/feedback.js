/**
 * 用户反馈路由 — POST /api/feedback  GET /api/feedback
 *
 * 普通用户提交反馈，管理员查看所有反馈
 */

import { Router } from 'express'
import Feedback from '../models/Feedback.js'
import auth from '../middleware/auth.js'
import admin from '../middleware/admin.js'

const router = Router()

// ==================== POST /api/feedback ====================
// 提交反馈（需登录）
router.post('/', auth, async (req, res) => {
  try {
    const { content, rating } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ code: 400, message: '反馈内容不能为空' })
    }

    const feedback = await Feedback.create({
      userId: req.userId,
      content: content.trim(),
      rating: rating || 5,
    })

    res.status(201).json({ code: 201, message: '感谢您的反馈！', data: feedback })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('; ')
      return res.status(400).json({ code: 400, message: msg })
    }
    console.error('[Feedback] 提交失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== GET /api/feedback ====================
// 管理员查看所有反馈
router.get('/', auth, admin, async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username email')
      .limit(100)

    res.json({ code: 200, data: feedbacks })
  } catch (err) {
    console.error('[Feedback] 查询失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

export default router
