/**
 * 管理员权限中间件
 *
 * 必须在 auth 中间件之后使用（依赖 req.userRole）
 * 仅 role === 'admin' 的用户可以访问受保护的管理后台接口
 */

export default function admin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ code: 403, message: '权限不足，仅管理员可访问' })
  }
  next()
}
