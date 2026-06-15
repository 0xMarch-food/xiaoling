const BASE = 'http://localhost:3000/api'
let adminToken = '', userToken = '', msgId = ''

async function test(name, fn) {
  try { await fn(); console.log('  ✅ ' + name) }
  catch(e) { console.log('  ❌ ' + name + ' — ' + (e.response?.data?.message || e.message)) }
}

async function post(path, body, token) {
  const h = token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
  const r = await fetch(BASE + path, { method: 'POST', headers: h, body: JSON.stringify(body) })
  return r.json()
}

async function get(path, token) {
  const h = token ? { 'Authorization': 'Bearer ' + token } : {}
  const r = await fetch(BASE + path, { headers: h })
  return r.json()
}

;(async () => {
  console.log('=== 全接口测试 ===\n')

  // 1. 注册
  await test('注册新用户', async () => {
    const r = await post('/auth/register', { username:'接口测试', email:'api@test.com', phone:'13600000000', password:'123456' })
    if (r.code !== 201) throw new Error(r.message)
  })

  // 2. 登录测试用户
  await test('登录测试用户', async () => {
    const r = await post('/auth/login', { account:'test@lingshan.com', password:'123456' })
    if (r.code !== 200) throw new Error(r.message)
    userToken = r.data.token
  })

  // 3. 登录管理员
  await test('登录管理员', async () => {
    const r = await post('/auth/login', { account:'admin@lingshan.com', password:'admin123' })
    if (r.code !== 200) throw new Error(r.message)
    adminToken = r.data.token
  })

  // 4. 获取用户信息
  await test('获取用户信息 /me', async () => {
    const r = await get('/auth/me', userToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 5. 保存问卷
  await test('保存问卷', async () => {
    const r = await post('/questionnaire', { name:'测试', gender:'男', age:25, hometown:'江苏无锡', interests:['历史文化','古建筑'], travelStyle:'深度游' }, userToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 6. 获取问卷
  await test('获取问卷', async () => {
    const r = await get('/questionnaire', userToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 7. 发送聊天消息
  await test('发送聊天消息', async () => {
    const r = await post('/chat/send', { message:'灵山大佛有多高？' }, userToken)
    if (r.code !== 200) throw new Error(r.message)
    msgId = r.data.aiReply._id
  })

  // 8. 获取聊天历史
  await test('获取聊天历史', async () => {
    const r = await get('/chat/history', userToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 9. 消息反馈
  await test('消息点赞反馈', async () => {
    const r = await post('/chat/feedback/' + msgId, { feedback:'like' }, userToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 10. 知识库列表（管理员）
  await test('知识库列表', async () => {
    const r = await get('/documents', adminToken)
    if (r.code !== 200 || !r.data.length) throw new Error('文档为空')
  })

  // 11. 数据大屏（管理员）
  await test('数据大屏统计', async () => {
    const r = await get('/stats/dashboard', adminToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 12. 游客分析（管理员）
  await test('游客分析数据', async () => {
    const r = await get('/stats/analytics', adminToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 13. 提交反馈
  await test('提交反馈', async () => {
    const r = await post('/feedback', { content:'系统很好用！', rating:5 }, userToken)
    if (r.code !== 201) throw new Error(r.message)
  })

  // 14. 查看反馈（管理员）
  await test('查看反馈列表', async () => {
    const r = await get('/feedback', adminToken)
    if (r.code !== 200) throw new Error(r.message)
  })

  // 15. 权限测试：普通用户访问管理接口应403
  await test('权限拦截(普通用户访问管理后台)', async () => {
    const r = await get('/documents', userToken)
    if (r.code !== 403) throw new Error('应返回403，实际' + r.code)
  })

  // 16. 清空聊天
  await test('清空聊天记录', async () => {
    const r = await fetch(BASE + '/chat/history', { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + userToken } })
    const d = await r.json()
    if (d.code !== 200) throw new Error(d.message)
  })

  console.log('\n=== 测试完成 ===')
  process.exit(0)
})()
