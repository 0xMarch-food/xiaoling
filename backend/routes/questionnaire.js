/**
 * 问卷路由 — POST /api/questionnaire  GET /api/questionnaire
 *
 * 新用户首次登录后必须填写问卷，后续可在个人中心修改。
 * 保存问卷后同步更新 User.hasCompletedQuestionnaire = true
 */

import { Router } from 'express'
import Questionnaire from '../models/Questionnaire.js'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = Router()

// ==================== POST /api/questionnaire ====================
// 保存或更新问卷（upsert — 首次创建，之后更新）
router.post('/', auth, async (req, res) => {
  try {
    const {
      name, gender, age,
      country, province, city, hometown,
      nativeLanguage, interests, travelStyle,
    } = req.body

    // 1. 参数校验：首次创建需要必填字段，更新允许部分修改
    const existing = await Questionnaire.findOne({ userId: req.userId })
    if (!existing && (!name || !gender || !hometown)) {
      return res.status(400).json({ code: 400, message: '首次填写问卷需要提供姓名、性别和家乡' })
    }

    // 2. upsert：有则更新，无则创建（更新时合并已有值）
    const updateData = {
      userId: req.userId,
      name: name || existing?.name || '',
      gender: gender || existing?.gender || '',
      age: age || existing?.age || 0,
      country: country || existing?.country || '中国',
      province: province || existing?.province || '',
      city: city || existing?.city || '',
      hometown: hometown || existing?.hometown || '',
      nativeLanguage: nativeLanguage || existing?.nativeLanguage || '普通话',
      interests: interests || existing?.interests || [],
      travelStyle: travelStyle || existing?.travelStyle || '',
    }

    const questionnaire = await Questionnaire.findOneAndUpdate(
      { userId: req.userId },
      updateData,
      { new: true, upsert: true, runValidators: true },
    )

    // 3. 同步更新用户问卷完成状态
    await User.findByIdAndUpdate(req.userId, { hasCompletedQuestionnaire: true })

    res.json({
      code: 200,
      message: '保存成功',
      data: questionnaire,
    })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('; ')
      return res.status(400).json({ code: 400, message: msg })
    }
    console.error('[Questionnaire] 保存失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== GET /api/questionnaire ====================
// 获取当前用户的问卷
router.get('/', auth, async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findOne({ userId: req.userId })

    res.json({
      code: 200,
      data: questionnaire || null,   // 未填写时返回 null
    })
  } catch (err) {
    console.error('[Questionnaire] 查询失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

export default router
