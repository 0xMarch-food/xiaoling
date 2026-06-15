/**
 * TTS 语音合成服务（百度语音合成 — 每日免费5万次）
 *
 * REST API，支持三种音色，返回 MP3 文件
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIO_DIR = path.join(__dirname, '..', 'uploads', 'audio')

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true })
}

// 音色映射 → 百度发音人 (per 参数)
// 参考: https://ai.baidu.com/ai-doc/SPEECH/Qk4b0gekx
const VOICE_MAP = {
  // ---- 标准女声（普通话）----
  'gentle-female': 0,     // 度小美（温柔女声）
  'bright-female': 4,     // 度丫丫（可爱女声）
  'sweet-female':  5,     // 度小娇（甜美女声）

  // ---- 方言女声（大模型发音人）----
  'sichuan-female':   4139,  // 度小蓉（四川话 女声）  ← 原4257是"四川小哥"男声！
  'cantonese-female': 20100, // 度小粤（粤语 女声）
  'dongbei-female':   4134,  // 度阿锦（东北话 女声）

  // ---- 英语女声（度小美 per=0 支持中英文朗读，英语发音自然）----
  'english-female': 0,       // 度小美（温柔女声，支持英语朗读）

  // ---- 备用（方言无女声时用）----
  'minnan-male': 4132,       // 度阿闽（闽南语 仅男声）
  'taiwan-female': 5977,     // 台媒女声（台湾腔）
}

// 语言偏好 → TTS 音色 ID
const LANGUAGE_VOICE_MAP = {
  '普通话': 'gentle-female',
  '四川话': 'sichuan-female',
  '粤语':   'cantonese-female',
  '英语':   'english-female',
  '东北话': 'dongbei-female',
  '闽南语': 'minnan-male',
}

export function getVoiceForLanguage(language) {
  return LANGUAGE_VOICE_MAP[language] || 'gentle-female'
}

let cachedToken = { access_token: '', expires: 0 }

/**
 * 获取百度 access_token（缓存 20 天）
 */
async function getAccessToken() {
  const now = Date.now()
  if (cachedToken.access_token && cachedToken.expires > now) {
    return cachedToken.access_token
  }

  const apiKey = process.env.BAIDU_TTS_API_KEY
  const secretKey = process.env.BAIDU_TTS_SECRET_KEY

  if (!apiKey || !secretKey || apiKey === 'your-baidu-api-key') {
    throw new Error('百度 TTS API Key 未配置')
  }

  const res = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
    { signal: AbortSignal.timeout(5000) }
  )
  const data = await res.json()

  if (!data.access_token) {
    throw new Error('百度 TTS token 获取失败: ' + JSON.stringify(data))
  }

  cachedToken = {
    access_token: data.access_token,
    expires: now + (data.expires_in - 3600) * 1000,  // 提前1小时刷新
  }

  return data.access_token
}

/**
 * 将文本合成为语音
 * @param {string} text - 待合成文本（自动去除 Markdown 格式）
 * @param {string} voiceId - gentle-female | warm-male | bright-female
 * @returns {Promise<{url: string, filename: string}>}
 */
export async function textToSpeech(text, voiceId = 'gentle-female') {
  console.log('[TTS] 开始合成，音色:', voiceId, '文本长度:', text?.length)
  const cleanText = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/^[#>-]+\s*/gm, '')
    .replace(/\n{2,}/g, '。')
    .replace(/\n/g, '，')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[▶•\u2022\u25CF]/g, '，')
    .replace(/\s{2,}/g, '')
    .trim()

  // 百度 TTS 限制 UTF-8 1024 字节，中文每字约 3 字节 → 安全上限 300 字
  const byteLen = Buffer.byteLength(cleanText, 'utf-8')
  if (!cleanText || byteLen > 1000) {
    const truncated = cleanText.slice(0, 280)
    return textToSpeechShort(truncated, voiceId)
  }

  return textToSpeechShort(cleanText, voiceId)
}

async function textToSpeechShort(text, voiceId) {
  if (!text) return { url: '', filename: '' }

  try {
    const token = await getAccessToken()
    const per = VOICE_MAP[voiceId] || 0

    const params = new URLSearchParams({
      tex: text,
      tok: token,
      cuid: 'ai_guide_lingshan',
      ctp: '1',
      lan: 'zh',
      spd: '5',    // 语速 0-15，5 为正常
      pit: '5',    // 音调
      vol: '5',    // 音量
      per: String(per),
      aue: '3',    // 音频格式：3=mp3
    })

    const response = await fetch(
      `https://tsn.baidu.com/text2audio?${params.toString()}`,
      { signal: AbortSignal.timeout(8000) }
    )

    const contentType = response.headers.get('content-type')

    // 百度错误时返回 JSON，成功时返回 audio/mp3
    if (contentType && contentType.includes('application/json')) {
      const errData = await response.json()
      throw new Error('百度 TTS 错误: ' + JSON.stringify(errData))
    }

    if (!response.ok) {
      throw new Error(`百度 TTS HTTP ${response.status}`)
    }

    const hash = crypto.createHash('md5').update(text).digest('hex').slice(0, 12)
    const filename = `tts_${Date.now()}_${hash}.mp3`
    const filepath = path.join(AUDIO_DIR, filename)

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(filepath, buffer)

    console.log('[TTS] 合成成功，文件:', filename, '大小:', (buffer.length / 1024).toFixed(1), 'KB')
    return { url: `/uploads/audio/${filename}`, filename }
  } catch (err) {
    console.error('[TTS] 合成失败:', err.message)
    return { url: '', filename: '' }
  }
}
