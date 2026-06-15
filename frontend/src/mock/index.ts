// ====== Mock 假数据 ======
// 等后端 API 出来后，删掉这个文件，换成真实接口调用即可

// ====== 管理后台 Mock ======

// 知识库文档列表
export const mockDocuments = [
  { id: 1, name: '灵山胜境景区介绍.pdf', type: 'PDF', size: '2.3MB', uploadTime: '2026-05-20', status: '已入库' },
  { id: 2, name: '灵山大佛历史资料.docx', type: 'Word', size: '1.1MB', uploadTime: '2026-05-18', status: '已入库' },
  { id: 3, name: '灵山梵宫建筑艺术.pdf', type: 'PDF', size: '5.6MB', uploadTime: '2026-05-15', status: '已入库' },
  { id: 4, name: '九龙灌浴解说词.txt', type: 'TXT', size: '56KB', uploadTime: '2026-05-12', status: '已入库' },
]

// 数据大屏数据
export const mockDashboardData = {
  todayVisitors: 2847,
  weekVisitors: 18632,
  popularQuestions: [
    { question: '灵山大佛怎么去？', count: 342 },
    { question: '九龙灌浴几点开始？', count: 298 },
    { question: '灵山胜境门票多少钱？', count: 265 },
    { question: '梵宫有什么值得看的？', count: 203 },
    { question: '灵山胜境历史介绍', count: 187 },
  ],
  popularScenics: [
    { name: '灵山大佛', count: 823 },
    { name: '灵山梵宫', count: 654 },
    { name: '九龙灌浴', count: 512 },
    { name: '五印坛城', count: 478 },
    { name: '祥符禅寺', count: 345 },
  ],
  satisfactionTrend: [4.5, 4.6, 4.4, 4.7, 4.5, 4.8, 4.6],
  visitorTrend: [1200, 1900, 1600, 2200, 1800, 2500, 2847],
  emotionDistribution: { positive: 72, neutral: 20, negative: 8 },
}
