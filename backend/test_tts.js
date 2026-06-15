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

  // 测试聊天
  console.log('👉 发送消息: 灵山大佛有多高？\n')
  const start = Date.now()
  const r = await fetch(BASE + '/chat/send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '灵山大佛有多高？' })
  })
  const d = await r.json()
  const { content, audioUrl } = d.data.aiReply

  console.log('📝 AI文字回复:\n' + content.substring(0, 200) + '...\n')
  console.log('🔊 语音URL: ' + (audioUrl || '（TTS 生成中...）'))
  console.log('⏱️  文字回复耗时: ' + (Date.now() - start) + 'ms\n')

  // 等待 2 秒让 TTS 后台生成
  console.log('⏳ 等待 2 秒让语音后台合成...')
  await new Promise(r => setTimeout(r, 2000))

  // 检查语音文件是否存在
  if (audioUrl) {
    const audioRes = await fetch('http://localhost:3000' + audioUrl)
    if (audioRes.ok) {
      console.log(`✅ 语音文件已生成！大小: ${(parseInt(audioRes.headers.get('content-length')) / 1024).toFixed(1)} KB`)
    } else {
      console.log('❌ 语音文件访问失败: ' + audioRes.status)
    }
  } else {
    console.log('⚠️  语音 URL 为空，可能是 TTS 异步合成还未完成。用历史接口再查一次...')
    // 从聊天历史中查询最新消息看是否有关联的 audioUrl
    const histRes = await fetch(BASE + '/chat/history', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    const histData = await histRes.json()
    const lastMsg = histData.data.filter(m => m.role === 'assistant').pop()
    console.log('   最新AI消息 audioUrl: ' + (lastMsg?.audioUrl || '无'))
    if (lastMsg?.audioUrl) {
      const audioRes2 = await fetch('http://localhost:3000' + lastMsg.audioUrl)
      if (audioRes2.ok) {
        console.log(`✅ 语音文件已生成！大小: ${(parseInt(audioRes2.headers.get('content-length')) / 1024).toFixed(1)} KB`)
      }
    }
  }

  console.log('\n✅ 测试完成！')
  process.exit(0)
})()
