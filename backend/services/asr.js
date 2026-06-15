/**
 * ASR 语音识别服务（百度短语音识别 — 每日免费5万次）
 *
 * REST API，支持 PCM/WAV 格式，返回识别文本
 */

import fs from 'fs'
import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

let cachedToken = { access_token: '', expires: 0 }

/**
 * 获取百度 access_token（复用 TTS 的 API Key，同一账号）
 */
async function getAccessToken() {
  const now = Date.now()
  if (cachedToken.access_token && cachedToken.expires > now) {
    return cachedToken.access_token
  }

  const apiKey = process.env.BAIDU_ASR_API_KEY || process.env.BAIDU_TTS_API_KEY
  const secretKey = process.env.BAIDU_ASR_SECRET_KEY || process.env.BAIDU_TTS_SECRET_KEY

  if (!apiKey || !secretKey || apiKey === 'your-baidu-api-key') {
    throw new Error('百度 API Key 未配置（ASR 复用 TTS 同账号）')
  }

  const res = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
    { signal: AbortSignal.timeout(5000) }
  )
  const data = await res.json()

  if (!data.access_token) {
    throw new Error('百度 token 获取失败: ' + JSON.stringify(data))
  }

  cachedToken = {
    access_token: data.access_token,
    expires: now + (data.expires_in - 3600) * 1000,
  }

  return data.access_token
}

/**
 * 将音频文件发送到百度进行语音识别
 * @param {string} filePath - 音频文件路径（WAV 或 PCM 格式）
 * @param {string} format - 音频格式，'wav' 或 'pcm'
 * @param {number} sampleRate - 采样率，默认 16000
 * @returns {Promise<string>} 识别出的文本
 */
export async function speechToText(filePath, format = 'wav', sampleRate = 16000) {
  console.log('[ASR] 开始识别，文件:', filePath, '格式:', format)

  try {
    const token = await getAccessToken()
    const audioBuffer = fs.readFileSync(filePath)
    const speechBase64 = audioBuffer.toString('base64')

    // 百度短语音识别 API，dev_pid 1537 = 普通话(纯中文)
    const body = {
      format,
      rate: sampleRate,
      channel: 1,
      cuid: 'ai_guide_lingshan',
      token,
      dev_pid: 1537,
      speech: speechBase64,
      len: audioBuffer.length,
    }

    const response = await fetch('https://vop.baidu.com/server_api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    const result = await response.json()
    console.log('[ASR] 百度返回:', JSON.stringify(result))

    if (result.err_no === 0 && result.result && result.result.length > 0) {
      const text = result.result[0]
      console.log('[ASR] 识别成功:', text)
      return text
    }

    throw new Error('百度 ASR 错误: err_no=' + result.err_no + ' ' + (result.err_msg || ''))
  } catch (err) {
    console.error('[ASR] 识别失败:', err.message)
    throw err
  }
}
