# 灵山胜境 AI 导游 — 后端 API 文档

> **Base URL**: `http://localhost:3000/api`
> **认证方式**: JWT Bearer Token（Header: `Authorization: Bearer <token>`）
> **Content-Type**: `application/json`

---

## 通用规范

### 响应格式

所有接口统一返回：

```json
{
  "code": 200,         // HTTP 状态码
  "message": "提示信息", // 部分接口省略
  "data": {}           // 响应数据
}
```

### 角色权限

| 角色 | 说明 | 权限范围 |
|------|------|----------|
| `user` | 普通游客 | 登录、问卷、聊天、反馈 |
| `admin` | 管理员 | 全部权限 + 知识库管理 + 数据大屏 |

> 管理员接口标注 🔒，需 JWT Token 且 role=admin

---

## 1. 用户认证 `/api/auth`

### 1.1 注册

```
POST /api/auth/register
```

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名 |
| email | string | ✅ | 邮箱（唯一） |
| phone | string | ❌ | 手机号 |
| password | string | ✅ | 密码（明文，后端 bcrypt 加密） |

**响应** (`201`):

```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "userId": "684a1b2c...",
    "username": "张三"
  }
}
```

---

### 1.2 登录

```
POST /api/auth/login
```

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | ✅ | 手机号/邮箱/用户名（三选一） |
| password | string | ✅ | 密码 |

**响应** (`200`):

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "684a1b2c...",
      "username": "测试游客",
      "email": "test@lingshan.com",
      "phone": "13800138000",
      "role": "user",
      "hasCompletedQuestionnaire": false,
      "createdAt": "2026-06-13T08:00:00.000Z"
    }
  }
}
```

> `token` 有效期 7 天，后续所有需登录的接口都要带上

---

### 1.3 获取当前用户信息

```
GET /api/auth/me
Authorization: Bearer <token>
```

**响应** (`200`):

```json
{
  "code": 200,
  "data": {
    "_id": "684a1b2c...",
    "username": "测试游客",
    "email": "test@lingshan.com",
    "phone": "13800138000",
    "role": "user",
    "hasCompletedQuestionnaire": true,
    "createdAt": "2026-06-13T08:00:00.000Z"
  }
}
```

---

## 2. 用户问卷 `/api/questionnaire`

> 需登录，用于收集用户偏好以个性化 AI 回复

### 2.1 保存/更新问卷

```
POST /api/questionnaire
Authorization: Bearer <token>
```

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 姓名 |
| gender | string | ✅ | 性别（"男"/"女"/"其他"） |
| age | number | ❌ | 年龄 |
| country | string | ❌ | 国家，默认"中国" |
| province | string | ❌ | 省份，如"江苏" |
| city | string | ❌ | 城市，如"无锡" |
| hometown | string | ✅ | 家乡 |
| nativeLanguage | string | ❌ | 母语，默认"普通话" |
| interests | string[] | ❌ | 兴趣标签，如 ["历史文化", "古建筑", "佛教"] |
| travelStyle | string | ❌ | 旅行风格，如"深度游"/"休闲游"/"亲子游" |

**响应** (`200`):

```json
{
  "code": 200,
  "message": "保存成功",
  "data": {
    "_id": "684b2c3d...",
    "userId": "684a1b2c...",
    "name": "张三",
    "gender": "男",
    "age": 25,
    "hometown": "江苏无锡",
    "interests": ["历史文化", "古建筑"],
    "travelStyle": "深度游"
  }
}
```

> 首次保存后 `User.hasCompletedQuestionnaire` 自动变为 `true`

---

### 2.2 获取当前用户问卷

```
GET /api/questionnaire
Authorization: Bearer <token>
```

**响应** (`200`):

```json
{
  "code": 200,
  "data": { "_id": "684b2c3d...", "name": "张三", ... }
}
```

> 未填写时 `data` 为 `null`

---

## 3. AI 聊天 `/api/chat`

> 需登录，核心功能：DeepSeek 大模型 + 知识库 RAG + 百度 TTS 语音

### 3.1 发送消息

```
POST /api/chat/send
Authorization: Bearer <token>
```

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | ✅ | 用户问题 |

**响应** (`200`):

```json
{
  "code": 200,
  "data": {
    "userMessage": {
      "_id": "684c3d4e...",
      "role": "user",
      "content": "灵山大佛有多高？",
      "createdAt": "2026-06-13T10:30:00.000Z"
    },
    "aiReply": {
      "_id": "684c3d4f...",
      "role": "assistant",
      "content": "🎉 灵山大佛高88米...",
      "audioUrl": "",
      "createdAt": "2026-06-13T10:30:03.000Z"
    }
  }
}
```

> ⚠️ `audioUrl` 在首次响应中为空字符串，TTS 异步合成（约 1-2 秒）后通过 `GET /chat/history` 可获取

### AI 工作流程

```
用户消息 → 提取画像(问卷) → RAG检索(知识库) → 拼接上下文
    → DeepSeek 生成回复 → 回复返回前端
                        → 百度TTS异步合成语音 → 更新消息 audioUrl
```

---

### 3.2 获取聊天历史

```
GET /api/chat/history
Authorization: Bearer <token>
```

**响应** (`200`):

```json
{
  "code": 200,
  "data": [
    {
      "_id": "684c3d4e...",
      "role": "user",
      "content": "灵山大佛有多高？",
      "audioUrl": "",
      "feedback": "",
      "createdAt": "2026-06-13T10:30:00.000Z"
    },
    {
      "_id": "684c3d4f...",
      "role": "assistant",
      "content": "🎉 灵山大佛高88米...",
      "audioUrl": "/uploads/audio/tts_1781286156846_acc4f1433e43.mp3",
      "feedback": "",
      "createdAt": "2026-06-13T10:30:03.000Z"
    }
  ]
}
```

> 返回最近 100 条，按时间正序排列
> `audioUrl` 非空时即为 TTS 语音文件路径，前端可通过 `<audio>` 播放

---

### 3.3 清空聊天记录

```
DELETE /api/chat/history
Authorization: Bearer <token>
```

**响应** (`200`):

```json
{
  "code": 200,
  "message": "聊天记录已清空"
}
```

---

### 3.4 AI 回复反馈（点赞/踩）

```
POST /api/chat/feedback/:messageId
Authorization: Bearer <token>
```

**路径参数**: `messageId` — AI 回复消息的 `_id`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| feedback | string | ✅ | `"like"` 或 `"dislike"` |

**响应** (`200`):

```json
{
  "code": 200,
  "message": "反馈成功",
  "data": { "_id": "684c3d4f...", "feedback": "like", ... }
}
```

---

## 4. 知识库管理 `/api/documents` 🔒

> 需管理员权限，用于管理 RAG 知识库文档

### 4.1 文档列表

```
GET /api/documents
Authorization: Bearer <token>  (admin)
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | ❌ | 按文档名模糊搜索 |

**响应** (`200`):

```json
{
  "code": 200,
  "data": [
    {
      "_id": "684d4e5f...",
      "name": "灵山大佛·景点详解.txt",
      "type": "txt",
      "size": "0.01MB",
      "status": "已入库",
      "createdAt": "2026-06-13T08:00:00.000Z"
    }
  ]
}
```

---

### 4.2 上传文档

```
POST /api/documents
Content-Type: multipart/form-data
Authorization: Bearer <token>  (admin)
```

**表单字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | ✅ | 文件（支持 .pdf / .doc / .docx / .txt，最大 10MB） |

**响应** (`201`):

```json
{
  "code": 201,
  "message": "上传成功",
  "data": {
    "_id": "684d4e5f...",
    "name": "灵山大佛·景点详解.txt",
    "type": "txt",
    "size": "0.01MB",
    "content": "灵山大佛是世界最高露天青铜释迦牟尼立像...",
    "status": "已入库"
  }
}
```

> 上传后自动提取文本内容存入 `content` 字段，用于 RAG 全文检索

---

### 4.3 文档详情

```
GET /api/documents/:id
Authorization: Bearer <token>  (admin)
```

---

### 4.4 编辑文档

```
PUT /api/documents/:id
Authorization: Bearer <token>  (admin)
```

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ❌ | 文档名称 |
| content | string | ❌ | 文档内容 |

---

### 4.5 删除文档

```
DELETE /api/documents/:id
Authorization: Bearer <token>  (admin)
```

---

## 5. 数据统计 `/api/stats` 🔒

> 需管理员权限

### 5.1 数据大屏

```
GET /api/stats/dashboard
Authorization: Bearer <token>  (admin)
```

**响应** (`200`):

```json
{
  "code": 200,
  "data": {
    "todayVisitors": 128,              // 今日服务人次
    "weekVisitors": 1863,              // 本周服务人次
    "todayQuestions": 456,             // 今日提问数
    "popularQuestions": [              // 热门问题 TOP5
      { "question": "灵山大佛有多高？", "count": 42 },
      { "question": "九龙灌浴几点开始？", "count": 38 }
    ],
    "satisfactionTrend": [4.5, 4.6, 4.4, 4.7, 4.5, 4.8, 4.6],
    "visitorTrend": [1200, 1900, 1600, 2200, 1800, 2500, 2847],
    "emotionDistribution": {           // 情绪分布
      "positive": 72,
      "neutral": 20,
      "negative": 8
    }
  }
}
```

---

### 5.2 游客分析

```
GET /api/stats/analytics
Authorization: Bearer <token>  (admin)
```

**响应** (`200`):

```json
{
  "code": 200,
  "data": {
    "feedbacks": [
      {
        "_id": "684e5f6a...",
        "userId": { "_id": "684a1b2c...", "username": "测试游客", "email": "test@lingshan.com" },
        "content": "系统很好用！",
        "rating": 5,
        "createdAt": "2026-06-13T11:00:00.000Z"
      }
    ],
    "totalFeedbacks": 5,
    "avgRating": 4.6
  }
}
```

---

## 6. 用户反馈 `/api/feedback`

### 6.1 提交反馈

```
POST /api/feedback
Authorization: Bearer <token>
```

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | ✅ | 反馈内容 |
| rating | number | ❌ | 评分 1-5，默认 5 |

**响应** (`201`):

```json
{
  "code": 201,
  "message": "感谢您的反馈！",
  "data": { "_id": "684e5f6a...", "content": "系统很好用！", "rating": 5 }
}
```

---

### 6.2 查看反馈列表 🔒

```
GET /api/feedback
Authorization: Bearer <token>  (admin)
```

**响应** (`200`):

```json
{
  "code": 200,
  "data": [
    {
      "_id": "684e5f6a...",
      "userId": { "_id": "684a1b2c...", "username": "测试游客", "email": "test@lingshan.com" },
      "content": "系统很好用！",
      "rating": 5,
      "createdAt": "2026-06-13T11:00:00.000Z"
    }
  ]
}
```

---

## 7. 健康检查

```
GET /api/health
```

**响应** (`200`):

```json
{
  "code": 200,
  "message": "Server is running",
  "timestamp": "2026-06-13T12:00:00.000Z"
}
```

---

## 8. 静态资源

| 路径 | 说明 |
|------|------|
| `/uploads/audio/<filename>.mp3` | TTS 生成的语音文件 |
| `/uploads/<filename>.<ext>` | 知识库上传的原始文件 |

---

## 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | `admin@lingshan.com` | `admin123` |
| 游客 | `test@lingshan.com` | `123456` |

---

## 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Express 4 |
| 数据库 | MongoDB + Mongoose |
| 认证 | JWT (jsonwebtoken) |
| 大模型 | DeepSeek `deepseek-chat` |
| 语音合成 | 百度 TTS（度小美/度逍遥/度丫丫） |
| 知识库 | MongoDB 全文索引 + RAG 检索 |
| 文件上传 | Multer |
| 文件解析 | pdf-parse / mammoth |
