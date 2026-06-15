/**
 * 知识库文档路由 — 管理后台 CRUD + 文件上传
 *
 * 上传文件时自动提取文本内容（txt/pdf/word），存入 content 字段用于 RAG 检索
 * 需要 auth + admin 两层中间件
 */

import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import Document from '../models/Document.js'
import auth from '../middleware/auth.js'
import admin from '../middleware/admin.js'

const router = Router()

// ===== Multer 配置 =====
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },   // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.xlsx']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error(`不支持的文件类型: ${ext}`))
  },
})

// ==================== GET /api/documents ====================
// 获取文档列表（支持 ?keyword=xxx 搜索）
router.get('/', auth, admin, async (req, res) => {
  try {
    const { keyword } = req.query
    const filter = keyword
      ? { name: { $regex: keyword, $options: 'i' } }
      : {}

    const docs = await Document.find(filter).sort({ createdAt: -1 })
    res.json({ code: 200, data: docs })
  } catch (err) {
    console.error('[Documents] 查询失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== POST /api/documents ====================
// 上传新文档
router.post('/', auth, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择文件' })
    }

    // 修复中文文件名乱码：浏览器使用 latin1 编码，转为 utf8
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')

    const ext = path.extname(originalName).toLowerCase()
    const typeMap = { '.pdf': 'pdf', '.doc': 'word', '.docx': 'word', '.txt': 'txt', '.xlsx': 'excel' }
    const fileType = typeMap[ext] || 'txt'

    // 提取文本内容
    let content = ''
    if (fileType === 'txt') {
      content = fs.readFileSync(req.file.path, 'utf-8')
    } else if (fileType === 'pdf') {
      // pdf-parse 在 import 时可能失败，try-catch 兜底
      try {
        const pdfParse = (await import('pdf-parse')).default
        const dataBuffer = fs.readFileSync(req.file.path)
        const pdfData = await pdfParse(dataBuffer)
        content = pdfData.text
      } catch {
        content = '[PDF 解析失败，文件已保存]'
      }
    } else if (fileType === 'word') {
      try {
        const mammoth = (await import('mammoth')).default
        const result = await mammoth.extractRawText({ path: req.file.path })
        content = result.value
      } catch {
        content = '[Word 解析失败，文件已保存]'
      }
    } else if (fileType === 'excel') {
      try {
        const XLSX = (await import('xlsx')).default
        const workbook = XLSX.readFile(req.file.path)
        const sheets = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name]
          const csvText = XLSX.utils.sheet_to_csv(sheet)
          return `【${name}】
${csvText}`
        })
        content = sheets.join('\n\n')
      } catch {
        content = '[Excel 解析失败，文件已保存]'
      }
    }

    // 截断过长内容，避免超过 MongoDB 16MB 文档上限
    const MAX_CONTENT = 500_000  // 50万字符，约 1MB
    if (content.length > MAX_CONTENT) {
      content = content.slice(0, MAX_CONTENT) + '\n\n[内容过长已截断，原始文件已完整保存]'
    }

    const doc = await Document.create({
      name: originalName,
      type: fileType,
      size: (req.file.size / 1024 / 1024).toFixed(2) + 'MB',
      content,
      filePath: req.file.path,
      status: content.startsWith('[') ? '解析失败' : '已入库',
    })

    res.status(201).json({ code: 201, message: '上传成功', data: doc })
  } catch (err) {
    console.error('[Documents] 上传失败:', err)
    res.status(500).json({ code: 500, message: '上传失败: ' + err.message })
  }
})

// ==================== GET /api/documents/:id ====================
// 查看文档详情
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
    if (!doc) return res.status(404).json({ code: 404, message: '文档不存在' })
    res.json({ code: 200, data: doc })
  } catch (err) {
    console.error('[Documents] 查看失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== PUT /api/documents/:id ====================
// 编辑文档（名称和内容）
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { name, content } = req.body
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { name, content },
      { new: true, runValidators: true },
    )
    if (!doc) return res.status(404).json({ code: 404, message: '文档不存在' })
    res.json({ code: 200, message: '更新成功', data: doc })
  } catch (err) {
    console.error('[Documents] 更新失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

// ==================== DELETE /api/documents/:id ====================
// 删除文档（同时删除服务器文件）
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
    if (!doc) return res.status(404).json({ code: 404, message: '文档不存在' })

    // 删除服务器上的文件
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath)
    }

    await Document.findByIdAndDelete(req.params.id)
    res.json({ code: 200, message: '删除成功' })
  } catch (err) {
    console.error('[Documents] 删除失败:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
})

export default router
