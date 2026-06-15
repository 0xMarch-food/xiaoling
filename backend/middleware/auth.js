/**
 * JWT 鉴权中间件
 *
 * 从请求头 Authorization: Bearer <token> 中解析 token，
 * 验证通过后将 userId 和 userRole 注入 req 对象，供后续路由使用。
 */

import jwt from 'jsonwebtoken'

export default function auth(req, res, next) {
  // 1. 提取 token
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' })
  }

  const token = authHeader.split(' ')[1]

  // 2. 验证 token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId      // 注入用户 ID
    req.userRole = decoded.role      // 注入用户角色
    next()
  } catch (err) {
    // token 过期或伪造
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' })
  }
}
