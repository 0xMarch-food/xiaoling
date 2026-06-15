const BASE = 'http://localhost:3000/api'

;(async () => {
  // 登录
  const login = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'test@lingshan.com', password: '123456' })
  })
  const t = await login.json()
  const token = t.data.token

  // 测试 1: 大佛话题
  console.log('👉 问: 灵山大佛有多高？有什么特色？\n')
  const r1 = await fetch(BASE + '/chat/send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '灵山大佛有多高？有什么特色？' })
  })
  const d1 = await r1.json()
  console.log('🤖 AI回复:\n' + d1.data.aiReply.content)
  console.log('\n' + '='.repeat(50) + '\n')

  // 测试 2: 路线推荐
  console.log('👉 问: 帮我推荐一条灵山胜境游览路线\n')
  const r2 = await fetch(BASE + '/chat/send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '帮我推荐一条灵山胜境游览路线' })
  })
  const d2 = await r2.json()
  console.log('🤖 AI回复:\n' + d2.data.aiReply.content)
  console.log('\n✅ 测试完成！DeepSeek 大模型接入成功！')
  process.exit(0)
})()
