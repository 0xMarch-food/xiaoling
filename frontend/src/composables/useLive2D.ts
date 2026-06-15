/**
 * Live2D 数字人组合式函数
 *
 * 管理 PixiJS + Live2D 模型的生命周期（全部懒加载，不影响其他页面）
 */

import { reactive } from 'vue'

// 模型路径
const MODEL_PATH = '/live2d/models/Haru/Haru.model3.json'

// 情绪 → Haru 模型内置表情名（F01~F08，大小写敏感）
// F01=微张嘴  F02=惊讶张嘴  F03=难过  F04=皱眉严肃
// F05=闭眼笑  F06=瞪大眼   F07=含泪  F08=倔强
const EXPRESSION_MAP: Record<string, string> = {
  smile: 'F05',      // 闭眼微笑 — 最自然的笑脸
  happy: 'F05',
  surprised: 'F06',  // 瞪大眼 眉毛上抬 — 夸张惊讶
  thinking: 'F04',   // 半眯眼 眉毛下压 — 认真思考
  speaking: 'F01',   // 微张嘴 — 说话时自然
}

export interface Live2DState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  error: string
}

// 懒加载的运行时引用
let PIXI: any = null
let Live2DModel: any = null
let depsLoaded = false

async function ensureDeps(): Promise<void> {
  if (depsLoaded) return

  PIXI = await import('pixi.js')
  console.log('[Live2D] PIXI 加载完成')

  const mod = await import('pixi-live2d-display/cubism4')
  Live2DModel = mod.Live2DModel

  depsLoaded = true
  console.log('[Live2D] 依赖加载完成')
}

export function useLive2D() {
  const state = reactive<Live2DState>({ status: 'idle', error: '' })

  let app: any = null
  let model: any = null
  let analyser: AnalyserNode | null = null
  let audioCtx: AudioContext | null = null
  let resizeObserver: ResizeObserver | null = null
  let lipMouthValue = 0

  /** 彻底清理当前实例 */
  function cleanupInstance() {
    lipMouthValue = 0

    resizeObserver?.disconnect()
    resizeObserver = null

    if (model) {
      try { model.destroy() } catch { /* ignore */ }
      model = null
    }

    if (app) {
      try {
        // forceCanvas: true 意味着强制释放 WebGL 上下文
        app.destroy(true, { children: true, texture: true })
      } catch { /* ignore */ }
      app = null
    }

    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {})
    }
    analyser = null
    audioCtx = null
  }

  /** 初始化 Live2D 到指定 canvas */
  async function initCanvas(canvas: HTMLCanvasElement): Promise<void> {
    // 销毁旧实例（路由切换回来时 canvas 是新的 DOM 元素，旧上下文已无效）
    cleanupInstance()

    state.status = 'loading'
    state.error = ''

    const container = canvas.parentElement
    if (!container) {
      state.status = 'error'
      state.error = '未找到父容器'
      return
    }

    const width = container.clientWidth || 300
    const height = container.clientHeight || 420

    try {
      const hasCubismCore = typeof (window as any).Live2DCubismCore !== 'undefined'
      if (!hasCubismCore) {
        throw new Error('请先将 live2dcubismcore.min.js 放入 public/live2d/')
      }

      await ensureDeps()

      Live2DModel.registerTicker(PIXI.Ticker)

      app = new PIXI.Application({
        view: canvas,
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      model = await Live2DModel.from(MODEL_PATH, { autoInteract: false })

      // 缩放居中
      const scaleX = (app.screen.width * 0.85) / model.width
      const scaleY = (app.screen.height * 0.85) / model.height
      const scale = Math.min(scaleX, scaleY, 0.11)
      model.scale.set(scale)
      model.x = app.screen.width / 2
      model.y = app.screen.height * 0.55
      model.anchor.set(0.5, 0.5)

      app.stage.addChild(model)

      // 监听容器尺寸变化
      resizeObserver = new ResizeObserver(() => {
        if (!app || !model || !container) return
        const w = container.clientWidth
        const h = container.clientHeight
        app.renderer.resize(w, h)
        const s = Math.min((w * 0.85) / model.width, (h * 0.85) / model.height, 0.10)
        model.scale.set(s)
        model.x = w / 2
        model.y = h * 0.55
      })
      resizeObserver.observe(container)

      state.status = 'loaded'
      console.log('[Live2D] 模型加载成功')
    } catch (err: any) {
      state.status = 'error'
      state.error = err.message || '模型加载失败'
      console.error('[Live2D] 初始化失败:', err)
    }
  }

  /** 切换表情 */
  function setExpression(emotion: string): void {
    if (!model) return
    const expName = EXPRESSION_MAP[emotion]
    if (!expName) return
    try { model.expression?.(expName) } catch { /* ignore */ }
  }

  /** 开始口型同步 */
  function startLipSync(audio: HTMLAudioElement): void {
    if (!model || !app) {
      console.warn('[Live2D] 口型同步跳过：model/app 未就绪')
      return
    }
    if (analyser) {
      stopLipSync()
    }

    try {
      audioCtx = new AudioContext()
      const source = audioCtx.createMediaElementSource(audio)
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)
      analyser.connect(audioCtx.destination)

      // 钩子：在 motionManager.update() 之后覆盖嘴型
      const motionMgr = (model.internalModel as any).motionManager
      if (motionMgr && !(motionMgr as any).__lipHookInstalled) {
        const origUpdate = motionMgr.update.bind(motionMgr)
        motionMgr.update = function (coreModel: any, now: number) {
          const result = origUpdate(coreModel, now)
          try { coreModel.setParameterValueById('ParamMouthOpenY', lipMouthValue) } catch { /* ignore */ }
          return result
        }
        ;(motionMgr as any).__lipHookInstalled = true
      }

      const lipFn = () => {
        if (!model || !analyser) return
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteTimeDomainData(data)
        const avg = data.reduce((s, v) => s + Math.abs(v - 128), 0) / data.length
        lipMouthValue = Math.min(1, (avg / 64) * 1.2)
      }
      app.ticker.add(lipFn)
      ;(audio as any).__lipFn = lipFn

      console.log('[Live2D] 口型同步已启动')
    } catch (err) {
      console.warn('[Live2D] 口型同步启动失败:', err)
    }
  }

  /** 停止口型同步 */
  function stopLipSync(audio?: HTMLAudioElement): void {
    lipMouthValue = 0

    const fn = audio ? (audio as any).__lipFn : null
    if (fn && app) {
      app.ticker.remove(fn)
      delete (audio as any).__lipFn
    }

    if (model) {
      try {
        model.internalModel?.coreModel?.setParameterValueById('ParamMouthOpenY', 0)
      } catch { /* ignore */ }
    }

    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {})
    }
    analyser = null
    audioCtx = null
  }

  /** 销毁 */
  function destroy(): void {
    cleanupInstance()
    state.status = 'idle'
  }

  return {
    state,
    initCanvas,
    setExpression,
    startLipSync,
    stopLipSync,
    destroy,
  }
}
