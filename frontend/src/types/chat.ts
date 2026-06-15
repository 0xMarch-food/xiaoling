// 消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  audioUrl?: string                 // TTS 语音 URL（仅 AI 消息）
  feedback?: 'like' | 'dislike'     // 用户评价（仅 AI 消息）
  type?: 'text' | 'image' | 'card'  // 消息内容类型
  cardData?: ScenicCard               // 景点卡片数据
  typing?: boolean                  // 是否正在打字中
  fullContent?: string              // 完整文本（打字期间兜底用）
}

// 景点卡片
export interface ScenicCard {
  name: string
  image: string
  description: string
  tags: string[]
}

// 用户问卷信息
export interface UserProfile {
  name: string
  gender: string
  age: number
  country: string
  province: string
  city: string
  hometown: string
  nativeLanguage: string
  interests: string[]
  travelStyle: string
}

// 登录信息
export interface LoginForm {
  account: string      // 手机号/邮箱/用户名
  password: string
  loginType: 'phone' | 'email' | 'username'
}

// 注册信息（对齐后端 POST /api/auth/register）
export interface RegisterForm {
  username: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}
