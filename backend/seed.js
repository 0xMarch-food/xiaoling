/**
 * 数据库种子脚本 — 一键初始化演示数据
 *
 * 运行: npm run seed
 * 包含: 管理员账号 + 灵山胜境知识库文档 + 示例统计数据
 */

import dotenv from 'dotenv'
dotenv.config()

import './db.js'
import bcrypt from 'bcryptjs'
import User from './models/User.js'
import Document from './models/Document.js'
import DailyStat from './models/DailyStat.js'
import Feedback from './models/Feedback.js'

async function seed() {
  console.log('🌱 开始初始化种子数据...\n')

  // ==================== 1. 清空旧数据（可选） ====================
  const shouldClear = process.argv.includes('--clear')
  if (shouldClear) {
    console.log('🧹 清空旧数据...')
    await Promise.all([
      User.deleteMany({}),
      Document.deleteMany({}),
      DailyStat.deleteMany({}),
      Feedback.deleteMany({}),
    ])
  }

  // ==================== 2. 创建管理员 ====================
  const adminPassword = await bcrypt.hash('admin123', 10)
  const existingAdmin = await User.findOne({ email: 'admin@lingshan.com' })

  if (!existingAdmin) {
    await User.create({
      username: '管理员',
      email: 'admin@lingshan.com',
      phone: '13900000000',
      avatar: '',
      password: adminPassword,
      role: 'admin',
      hasCompletedQuestionnaire: true,
    })
    console.log('✅ 管理员账号已创建: admin@lingshan.com / admin123')
  } else {
    console.log('⏭️  管理员账号已存在，跳过')
  }

  // ==================== 3. 创建测试用户 ====================
  const testPassword = await bcrypt.hash('123456', 10)
  const existingTest = await User.findOne({ email: 'test@lingshan.com' })

  if (!existingTest) {
    await User.create({
      username: '测试游客',
      email: 'test@lingshan.com',
      phone: '13800138000',
      password: testPassword,
      role: 'user',
      hasCompletedQuestionnaire: false,
    })
    console.log('✅ 测试账号已创建: test@lingshan.com / 123456')
  } else {
    console.log('⏭️  测试账号已存在，跳过')
  }

  // ==================== 4. 知识库文档（灵山胜境核心资料） ====================
  const docCount = await Document.countDocuments()
  if (docCount === 0) {
    await Document.insertMany([
      {
        name: '灵山胜境·景区概况.txt',
        type: 'txt',
        size: '15KB',
        content: `灵山胜境坐落于江苏省无锡市太湖西北部的马山镇，地处秦履峰、青龙山、白虎山三山环抱之间，占地面积约30万平方米，是国家5A级旅游景区、世界佛教论坛永久会址，被誉为"东方佛国"和"太湖佛国"。

景区的历史可追溯至1300多年前的唐代贞观年间。玄奘法师西行取经归来，途经马山，见此地"层峦丛翠，曲水净秀，山形酷似印度灵鹫山"，遂命名为"小灵山"。北宋大中祥符年间，宋真宗赐额"祥符禅寺"，成为江南名刹。

1994年，中国佛教协会会长赵朴初提出"五方五佛"之论，开启灵山大佛建设。1997年11月15日，灵山大佛落成开光。此后九龙灌浴、灵山梵宫、五印坛城等相继建成，形成了集信仰、艺术、文化、旅游于一体的综合性佛教文化景区。

核心景点: 灵山大照壁、五明桥、佛足坛、五智门、菩提大道、九龙灌浴、灵山大佛、灵山梵宫、五印坛城、祥符禅寺、天下第一掌、拈花湾禅意小镇。`,
        status: '已入库',
      },
      {
        name: '灵山大佛·景点详解.txt',
        type: 'txt',
        size: '8KB',
        content: `灵山大佛是世界最高露天青铜释迦牟尼立像。

基本数据: 通高88米（佛体79米，莲花瓣9米），总高101.5米。总用铜量725吨，佛体由1560块6-8毫米厚的铜壁板构成，焊缝总长度逾35公里。

建造工艺: 采用现代高科技与传统工艺相结合的方式，历经3年工期（1994-1997年），经过钢筋混凝土结构浇制、钢支架安装、铜片拼装焊接、整体抛光着色等阶段。

佛教意义: 右手施无畏印（除却众生痛苦），左手施与愿印（赐予众生欢乐）。216级登云道暗合佛教108烦恼与108愿望，分为两段——前段108级为"烦恼尽除"，后段108级为"愿望圆满"。

最佳体验: 登顶抱佛脚，俯瞰太湖全景，感受大佛宏伟气势。夕阳西下时，金色阳光洒在大佛身上，佛光普照，美不胜收。

开放时间: 夏季7:00-17:30，冬季7:00-17:00。门票包含在大景区通票内。`,
        status: '已入库',
      },
      {
        name: '灵山梵宫·佛教艺术殿堂.txt',
        type: 'txt',
        size: '10KB',
        content: `灵山梵宫被誉为"佛教艺术的卢浮宫"，是灵山胜境的核心建筑之一。

建筑规模: 建筑面积7.2万平方米，造价18亿。外观以华藏塔风格为主，融合了石窟与传统佛教建筑元素，顶部五座莲花圣塔象征"五方五佛"。

核心艺术珍品:
- 穹顶天象图: 28米高星空穹顶，用100公斤纯金绘制，148尊飞天姿态各异，依据唐代不空法师所译经典创作。
- 华藏世界琉璃壁画: 160块琉璃构件，2000吨琉璃熔铸，翡翠镶嵌的菩提叶脉络在特定角度会显现般若经文，堪称当代佛教艺术巅峰之作。
- 东阳木雕群: 以贵重金丝楠木为主材，通过精湛东阳木雕手法，展现花卉、云纹、四灵、回型等元素。

《吉祥颂》演出: 每日10:35、11:30、14:00、16:00，时长20分钟。圣坛内设全球唯一大型旋转舞台，运用全息投影、水雾等技术，演绎佛陀修行成佛的故事。

灵山梵宫是世界佛教论坛主会场，成为全球佛教文化交流的重要场所。`,
        status: '已入库',
      },
      {
        name: '九龙灌浴·表演与游览指南.txt',
        type: 'txt',
        size: '6KB',
        content: `九龙灌浴是灵山胜境最具观赏性的动态音乐群雕。

基本数据: 总高27.5米，青铜重量260吨。中央为7.2米高鎏金太子佛像，立于莲花座上。

表演内容: 每日4-5场表演（通常10:00、11:30、14:00、16:00，具体以景区当天公告为准）。莲花瓣缓缓开启，太子佛像在九龙喷泉与《佛诞颂》音乐中旋转升起，九龙吐水为太子沐浴，水幕与阳光交织出七彩佛光，展现"花开见佛"的神圣瞬间。

佛教意义: 再现释迦牟尼诞生时"九龙吐水"的经典场景——佛陀诞生时一手指天，一手指地，说："天上天下，唯我独尊"。

特色体验: 表演结束后可接取祈福圣水，寓意吉祥安康。在阳光明媚时观看效果最佳，彩虹与佛光交织，美不胜收。`,
        status: '已入库',
      },
      {
        name: '五印坛城·藏传佛教瑰宝.txt',
        type: 'txt',
        size: '5KB',
        content: `五印坛城是灵山胜境中展现藏传佛教文化精髓的重要景点。

建筑风格: 占地面积约5000平方米，藏传佛教风格建筑，金顶红墙，经幡飘扬，四周围绕一片宁静清澄的香水海。

内部艺术: 坛城内供奉五方五佛，中央为毗卢遮那佛。四楼供奉五佛之首——中央佛大日如来。壁画采用纯手工绘制，面积达1500平方米，由中央曼茶罗、金刚界曼茶罗、胎藏界曼茶罗三部分组成。

佛教意义: 转经廊内设有转经筒，游客可亲手转动经筒，感受"转经一圈，福慧双增"的寓意。

最佳体验: 在外面的平台上，顺时针右绕一或三圈，体验"绕坛城"的自在、净心，同时一览灵山胜境的全貌。`,
        status: '已入库',
      },
      {
        name: '祥符禅寺·千年古刹与美食推荐.txt',
        type: 'txt',
        size: '4KB',
        content: `祥符禅寺是灵山胜境的千年古刹。

历史遗存:
- 千年银杏: 树龄逾千年，枝繁叶茂，秋季金黄一片。
- 六角井与八角井: 传说为"八功德水"，有治病健身之效。
- 江南第一钟: 重达12.8吨，钟声悠扬。

寺院背靠灵山主峰，面朝太湖三万顷碧波，风水格局绝佳。

素斋美食推荐:
- 灵山素斋: 以"荤形素做"闻名，素鸭、素火腿口感逼真。
- 罗汉斋面: 传统素面，汤清味鲜。
- 竹笋素包: 太湖特色，鲜美可口。
- 禅茶一味: 在祥符禅寺品一杯禅茶，感受"茶禅一味"的意境。

梵宫素食餐厅和拈花湾小镇也有丰富的素食选择。`,
        status: '已入库',
      },
    ])
    console.log('✅ 已导入 6 篇灵山胜境知识库文档')
  } else {
    console.log('⏭️  知识库已有数据，跳过')
  }

  // ==================== 5. 近 7 天示例统计数据 ====================
  const statCount = await DailyStat.countDocuments()
  if (statCount === 0) {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      days.push({
        date: dateStr,
        visitorCount: 100 + Math.floor(Math.random() * 200),
        questionCount: 200 + Math.floor(Math.random() * 400),
        avgSatisfaction: Number((4.0 + Math.random()).toFixed(1)),
        positiveCount: 50 + Math.floor(Math.random() * 50),
        neutralCount: 15 + Math.floor(Math.random() * 20),
        negativeCount: Math.floor(Math.random() * 15),
      })
    }
    await DailyStat.insertMany(days)
    console.log('✅ 已生成近 7 天示例统计数据')
  } else {
    console.log('⏭️  统计数据已存在，跳过')
  }

  // ==================== 6. 示例反馈 ====================
  const feedbackCount = await Feedback.countDocuments()
  if (feedbackCount === 0) {
    await Feedback.insertMany([
      { content: '灵山大佛太震撼了！AI导游介绍得很详细，推荐路线也很合理。', rating: 5 },
      { content: '九龙灌浴表演非常精彩，建议增加表演场次。', rating: 4 },
      { content: '梵宫的艺术品太精美了，《吉祥颂》演出值得一看。', rating: 5 },
      { content: '希望能增加语音导游功能，方便老年人使用。', rating: 3 },
    ])
    console.log('✅ 已添加 4 条示例反馈')
  } else {
    console.log('⏭️  反馈数据已存在，跳过')
  }

  console.log('\n🎉 种子数据初始化完成！')
  console.log('   管理员: admin@lingshan.com / admin123')
  console.log('   测试用户: test@lingshan.com / 123456')
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ 种子数据初始化失败:', err)
  process.exit(1)
})
