/**
 * Document 模型 — 知识库文档
 *
 * 管理员上传景区资料（PDF/Word/TXT），
 * 系统提取文本存到 content 字段，用于 AI 检索增强生成（RAG）
 */

import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  // 原始文件名
  name: {
    type: String,
    required: [true, '文档名称不能为空'],
    trim: true,
  },

  // 文件类型
  type: {
    type: String,
    enum: ['pdf', 'word', 'txt', 'excel'],
    required: true,
  },

  // 文件大小（展示用字符串，如 "2.3MB"）
  size: {
    type: String,
    default: '',
  },

  // 提取的文本内容 — 用于全文检索（RAG 知识库）
  content: {
    type: String,
    default: '',
  },

  // 服务器存储路径
  filePath: {
    type: String,
    default: '',
  },

  // 入库状态
  status: {
    type: String,
    enum: ['已入库', '处理中', '解析失败'],
    default: '已入库',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// 全文索引：支持 MongoDB 的 $text 搜索
// 用法: Document.find({ $text: { $search: '灵山大佛 梵宫' } })
documentSchema.index({ content: 'text', name: 'text' })

const Document = mongoose.model('Document', documentSchema)

export default Document
