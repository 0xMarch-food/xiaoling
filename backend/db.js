import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_guide'

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,  // 5秒超时
  connectTimeoutMS: 5000,
})
  .then(() => console.log('[DB] MongoDB 连接成功'))
  .catch(err => {
    console.error('[DB] MongoDB 连接失败:', err.message)
    console.error('[DB] 请确保 MongoDB 服务已启动（默认端口 27017）')
    console.error('[DB] 可在 MongoDB Compass 中检查连接状态')
  })

export default mongoose
