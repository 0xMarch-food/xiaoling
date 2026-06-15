import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import './db.js'

// 路由导入（先注释，等路由文件创建后再取消注释）
import authRoutes from './routes/auth.js'
import questionnaireRoutes from './routes/questionnaire.js'
import chatRoutes from './routes/chat.js'
import documentRoutes from './routes/documents.js'
import statsRoutes from './routes/stats.js'
import feedbackRoutes from './routes/feedback.js'

dotenv.config()
const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static('uploads'))

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ code: 200, message: 'Server is running', timestamp: new Date().toISOString() })
})

// 路由挂载（等路由文件创建后取消注释）
app.use('/api/auth', authRoutes)
app.use('/api/questionnaire', questionnaireRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/feedback', feedbackRoutes)

// 404
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' })
})

// 全局错误处理
app.use((err, _req, res, _next) => {
  console.error('[Error]', err)
  res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message })
})

app.listen(PORT, () => {
  console.log(`[Server] 运行在 http://localhost:${PORT}`)
  console.log(`[Server] 健康检查: http://localhost:${PORT}/api/health`)
})
