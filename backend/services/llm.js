/**
 * 大模型 API 调用封装
 *
 * 支持四种模式：
 *   mock     — 本地规则匹配（无需 API Key，校赛降级方案）
 *   qwen     — 通义千问（推荐，有免费额度）
 *   deepseek — DeepSeek（OpenAI 兼容，性价比高）
 *   ernie    — 文心一言（备选）
 *
 * 切换方式：修改 .env 中的 LLM_PROVIDER
 */

import dotenv from 'dotenv'
dotenv.config()

const PROVIDER = (process.env.LLM_PROVIDER || 'mock').toLowerCase()

console.log(`[LLM] 当前模型提供商: ${PROVIDER}`)

/**
 * 调用大模型，传入 messages 数组（system + user），返回回复文本
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>}
 */
export async function callLLM(messages) {
  switch (PROVIDER) {
    case 'qwen':
      return callQwen(messages)
    case 'deepseek':
      return callDeepSeek(messages)
    case 'ernie':
      return callErnie(messages)
    case 'mock':
    default:
      return callMock(messages)
  }
}

/** 流式调用大模型，返回异步迭代器 */
export async function* callLLMStream(messages) {
  switch (PROVIDER) {
    case 'deepseek':
      yield* callDeepSeekStream(messages)
      break
    case 'qwen':
      yield* callQwenStream(messages)
      break
    case 'ernie':
      // ernie 暂未实现真正流式，调非流式再分块返回
      const fullText = await callErnie(messages)
      for (let i = 0; i < fullText.length; i += 3) {
        yield fullText.slice(i, i + 3)
        await new Promise(r => setTimeout(r, 30))
      }
      break
    case 'mock':
    default:
      // mock: 把完整响应拆成小块模拟流式
      const mockText = callMock(messages)
      for (let i = 0; i < mockText.length; i += 3) {
        yield mockText.slice(i, i + 3)
        await new Promise(r => setTimeout(r, 30))
      }
      break
  }
}

// ==================== 通义千问 ====================
async function callQwen(messages) {
  const apiKey = process.env.QWEN_API_KEY
  const model = process.env.QWEN_MODEL || 'qwen-turbo'
  console.log(`[LLM] 调用 QWEN，模型: ${model}`)

  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    console.warn('[LLM] QWEN_API_KEY 未配置，降级为 mock 模式')
    return callMock(messages)
  }

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(30000),   // 30 秒超时（含知识库检索后 Prompt 较长）
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`通义千问 API 错误: ${response.status} ${errText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/** Qwen 流式调用，SSE 格式 — 与 DeepSeek 同为 OpenAI 兼容接口 */
async function* callQwenStream(messages) {
  const apiKey = process.env.QWEN_API_KEY
  const model = process.env.QWEN_MODEL || 'qwen-turbo'
  console.log(`[LLM] 流式调用 QWEN，模型: ${model}`)

  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    console.warn('[LLM] QWEN_API_KEY 未配置，降级 mock 模拟流式')
    const fullText = callMock(messages)
    for (let i = 0; i < fullText.length; i += 3) {
      yield fullText.slice(i, i + 3)
      await new Promise(r => setTimeout(r, 30))
    }
    return
  }

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`通义千问 流式错误: ${response.status} ${errText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content
        if (content) {
          yield content
          // setTimeout（timers 阶段）让出 poll 阶段给 I/O，确保 chunk 被立即推送
          await new Promise(resolve => setTimeout(resolve, 20))
        }
      } catch { /* skip unparseable lines */ }
    }
  }
}

// ==================== DeepSeek（OpenAI 兼容接口） ====================
async function callDeepSeek(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey || apiKey === 'sk-your-deepseek-key-here') {
    console.warn('[LLM] DEEPSEEK_API_KEY 未配置，降级为 mock 模式')
    return callMock(messages)
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek API 错误: ${response.status} ${errText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/** DeepSeek 流式调用，返回 SSE 格式的 body */
async function* callDeepSeekStream(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey || apiKey === 'sk-your-deepseek-key-here') {
    // mock 模式：模拟流式输出
    const fullText = callMock(messages)
    for (let i = 0; i < fullText.length; i += 3) {
      yield fullText.slice(i, i + 3)
      await new Promise(r => setTimeout(r, 30))
    }
    return
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek 流式错误: ${response.status} ${errText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content
        if (content) {
          yield content
          // setTimeout（timers 阶段）让出 poll 阶段给 I/O，确保 chunk 被立即推送
          await new Promise(resolve => setTimeout(resolve, 20))
        }
      } catch { /* skip unparseable lines */ }
    }
  }
}
async function callErnie(messages) {
  const apiKey = process.env.ERNIE_API_KEY
  const secretKey = process.env.ERNIE_SECRET_KEY

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.warn('[LLM] ERNIE_API_KEY 未配置，降级为 mock 模式')
    return callMock(messages)
  }

  // 先获取 access_token
  const tokenRes = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  )
  const tokenData = await tokenRes.json()

  const response = await fetch(
    `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${tokenData.access_token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_output_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30000),
    },
  )

  if (!response.ok) throw new Error(`文心一言 API 错误: ${response.status}`)
  const data = await response.json()
  return data.result
}

// ==================== Mock 模式（本地规则匹配 + 预设回复） ====================
function callMock(messages) {
  // 提取最后一条用户消息
  const userMsg = messages.filter(m => m.role === 'user').pop()
  const text = userMsg?.content || ''

  // 从 system prompt 中提取语言偏好
  const systemMsg = messages.find(m => m.role === 'system')
  const isEnglish = systemMsg?.content?.includes('当前选择语言：英语')
  const lang = isEnglish ? 'en' : 'zh'

  // ===== 英文回复模板 ====
  if (isEnglish) {
    if (text.toLowerCase().includes('history') || text.includes('历史') || text.includes('由来')) {
      return `🏛️ **The History of Lingshan** ...`
    }
    if (text.toLowerCase().includes('budda') || text.includes('大佛') || text.includes('灵山')) {
      return `🗿 **Lingshan Grand Buddha** ...`
    }
    if (text.toLowerCase().includes('dragon') || text.includes('九龙灌浴') || text.includes('灌浴')) {
      return `💦 **Nine Dragons Bathing the Prince** ...`
    }
    if (text.toLowerCase().includes('palace') || text.includes('梵宫') || text.includes('brahma')) {
      return `🏰 **Lingshan Brahma Palace** ...`
    }
    // 英文兜底：优先用知识库
    const enKb = systemMsg?.content?.match(/参考以下资料回答问题：\n([\s\S]+?)(?:\n\n|$)/)
    if (enKb) {
      return `📚 **From Knowledge Base:**\n\n${enKb[1].trim()}\n\n---\n💡 *The above info is from the scenic area knowledge base.*`
    }
    return `Thank you for your question! I'm Xiao Ling, your AI tour guide at Lingshan Scenic Area...`
  }

  // ===== 中文默认回复 =====
  // 关键词匹配
  if (text.includes('历史') || text.includes('由来') || text.includes('灵山') && !text.includes('大佛')) {
    return `🏛️ **灵山胜境的历史渊源**

灵山胜境的历史可追溯至1300多年前的唐代贞观年间。玄奘法师西行取经归来，途经无锡马山，见此地"层峦丛翠，曲水净秀，山形酷似印度灵鹫山"，遂命名为"小灵山"。

1994年，中国佛教协会会长赵朴初提出"五方五佛"理念，由此开启了灵山大佛的建设。1997年11月15日，灵山大佛落成开光，成为景区的标志性建筑。

此后九龙灌浴、灵山梵宫、五印坛城等相继建成，形成了集信仰、艺术、文化、旅游于一体的综合性佛教文化景区，并成为世界佛教论坛永久会址。`
  }

  if (text.includes('大佛') || text.includes('灵山大佛')) {
    return `🗿 **灵山大佛 — 世界最高露天青铜释迦牟尼立像**

- **通高88米**（佛体79米，莲花瓣9米），总高101.5米
- 总用铜量**725吨**，佛体由1560块铜壁板构成
- 右手施**无畏印**（除却众生痛苦），左手施**与愿印**（赐予众生欢乐）
- **216级登云道**：前108级寓意"烦恼尽除"，后108级寓意"愿望圆满"

✨ **最佳体验**：登顶抱佛脚，俯瞰太湖全景；夕阳西下时，金色阳光洒在大佛身上，佛光普照，美不胜收！

开放时间：夏季 7:00-17:30，冬季 7:00-17:00`
  }

  if (text.includes('九龙灌浴') || text.includes('灌浴')) {
    return `💦 **九龙灌浴 — 佛陀诞生的神圣再现**

- 总高27.5米，青铜重量260吨
- 中央为7.2米高鎏金太子佛像，立于莲花座上
- 每日4-5场表演，莲花瓣缓缓开启，太子佛像在九龙喷泉中旋转升起
- 九龙吐水为太子沐浴，水幕与阳光交织出七彩佛光

🎬 表演时间：10:00、11:30、14:00、16:00（具体以景区当天公告为准）
💧 表演结束后可接取祈福圣水，寓意吉祥安康！`
  }

  if (text.includes('梵宫') || text.includes('灵山梵宫')) {
    return `🏰 **灵山梵宫 — 佛教艺术的卢浮宫**

- 建筑面积**7.2万平方米**，造价18亿
- 顶部五座莲花圣塔象征"五方五佛"
- 穹顶天象图：28米高星空穹顶，用100公斤纯金绘制，148尊飞天姿态各异
- 华藏世界琉璃壁画：160块琉璃构件，2000吨琉璃熔铸，堪称当代佛教艺术巅峰之作

🎭 可观看《吉祥颂》演出（每日10:35、11:30、14:00、16:00，时长20分钟），运用全息投影、水雾等技术演绎佛陀修行成佛的故事。`
  }

  if (text.includes('五印坛城') || text.includes('坛城') || text.includes('藏传')) {
    return `🕌 **五印坛城 — 藏传佛教文化的瑰宝**

- 占地面积约5000平方米，藏传佛教风格建筑
- 金顶红墙，经幡飘扬，四周围绕宁静清澄的香水海
- 坛城内供奉五方五佛，壁画面积达1500平方米
- 转经廊内设有转经筒，可亲手转动经筒，感受"转经一圈，福慧双增"

📿 **最佳体验**：顺时针绕坛城一或三圈，感受"绕坛城"的自在与净心，同时一览灵山胜境的全貌。`
  }

  if (text.includes('祥符禅寺') || text.includes('禅寺') || text.includes('古寺')) {
    return `🏯 **祥符禅寺 — 千年古刹的历史遗存**

祥符禅寺的历史可追溯至唐代，北宋大中祥符年间宋真宗赐额"祥符禅寺"，成为江南名刹。

📜 **三大历史遗存**：
- 🌳 **千年银杏**：树龄逾千年，枝繁叶茂，秋季金黄一片
- 🕳️ **六角井与八角井**：传说是"八功德水"，有治病健身之效
- 🔔 **江南第一钟**：重达12.8吨，钟声悠扬

寺院背靠灵山主峰，面朝太湖三万顷碧波，风水格局绝佳。`
  }

  if (text.includes('路线') || text.includes('推荐') || text.includes('游览')) {
    return `🗺️ **灵山胜境经典一日游路线**

> 大照壁 → 五明桥 → 佛足坛 → 五智门 → 菩提大道 → 九龙灌浴 → 灵山大佛 → 灵山梵宫 → 五印坛城 → 祥符禅寺

⏱️ 全程约5-6小时，覆盖灵山胜境核心景点。

💡 **游览建议**：
- 上午先看九龙灌浴表演（10:00场次）
- 中午登灵山大佛，抱佛脚祈福
- 下午参观灵山梵宫，观看《吉祥颂》演出
- 傍晚绕五印坛城，感受藏传佛教文化

如果您对佛教文化特别感兴趣，我还可以推荐深度文化路线哦~`
  }

  if (text.includes('美食') || text.includes('吃') || text.includes('素斋')) {
    return `🍽️ **灵山胜境美食推荐**

灵山胜境以**素食文化**著称，推荐几样：

🥬 **灵山素斋** — 以"荤形素做"闻名，素鸭、素火腿口感逼真
🍜 **罗汉斋面** — 传统素面，汤清味鲜
🎋 **竹笋素包** — 太湖特色，鲜美可口
🍵 **禅茶一味** — 在祥符禅寺品一杯禅茶，感受"茶禅一味"的意境

此外，景区内的梵宫素食餐厅环境优雅，是品尝素斋的好去处。`
  }

  if (text.includes('拈花湾') || text.includes('禅意小镇')) {
    return `🌸 **拈花湾禅意小镇**

拈花湾与灵山胜境相邻，是以"禅意"为主题的休闲度假小镇。

- 仿唐建筑群，小桥流水，一步一景
- 夜间有《禅行》光影秀，美轮美奂
- 可体验抄经、茶道、花道等禅修活动
- 特色民宿和素食餐厅众多

🎋 如果说灵山胜境是"朝圣之旅"，那拈花湾就是"修心之旅"。`
  }

  if (text.includes('门票') || text.includes('票价') || text.includes('价格') || text.includes('多少钱')) {
    return `🎫 **灵山胜境门票信息**

- **成人票**：210元/人
- **优待票**（老人/学生/儿童）：105元/人
- **免费政策**：70周岁以上老人、1.4米以下儿童、残疾人、军人凭证免票

🕐 **开放时间**：
- 夏季（4月-10月）：7:00 - 17:30
- 冬季（11月-3月）：7:00 - 17:00

📌 **温馨提示**：
- 九龙灌浴表演时间：10:00、11:30、14:00、16:00
- 梵宫《吉祥颂》演出需单独购票（50元/人）
- 建议提前在官网或微信公众号购票，旺季可能有优惠

*以上为参考价格，具体以景区当日公告为准*`
  }

  if (text.includes('交通') || text.includes('怎么去') || text.includes('怎么走') || text.includes('到达')) {
    return `🚗 **前往灵山胜境的交通方式**

🚄 **高铁/火车**：
- 至**无锡站**或**无锡东站**，换乘公交或打车约40-60分钟

🚌 **公交路线**：
- 无锡火车站乘坐**88路**或**89路**直达灵山胜境
- 无锡东站乘坐**乐游2号线**旅游专线

🚗 **自驾导航**：
- 导航搜索"灵山胜境"，景区有大型停车场（停车费10元/次）
- 上海方向：沪宁高速→无锡北出口→太湖大道→灵山
- 南京方向：沪宁高速→无锡北出口→太湖大道→灵山

✈️ **飞机**：
- 无锡硕放机场距景区约40公里，打车约50分钟`
  }

  // 尝试从 system prompt 中提取知识库上下文来回答
  const knowledgeMatch = systemMsg?.content?.match(/参考以下资料回答问题：\n([\s\S]+?)(?:\n\n|$)/)
  if (knowledgeMatch) {
    const knowledge = knowledgeMatch[1].trim()
    return `📚 **根据知识库资料：**\n\n${knowledge}\n\n---\n💡 *以上信息来自景区知识库，如仍有疑问请进一步提问~*`
  }

  // 兜底回复
  return `感谢您的提问！我是您的AI导游小灵 😊

🏛️ 灵山胜境位于无锡太湖之滨，是国家5A级旅游景区、世界佛教论坛永久会址，被誉为"东方佛国"。

核心景点包括：
• 🗿 **灵山大佛** — 88米高青铜释迦牟尼立像
• 💦 **九龙灌浴** — 再现佛陀诞生的动态音乐群雕
• 🏰 **灵山梵宫** — 被誉为"佛教艺术的卢浮宫"
• 🕌 **五印坛城** — 藏传佛教文化瑰宝
• 🏯 **祥符禅寺** — 千年古刹

如果您想了解更具体的内容，可以问我关于：
• 各景点的详细介绍和历史背景
• 游览路线推荐
• 素斋美食推荐
• 演出时间和门票信息`
}
