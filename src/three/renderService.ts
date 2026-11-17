/**
 * Bridge between the React UI and the live WebGL scene. The viewer registers a
 * capture implementation; export code calls it to render the real 3D scene at
 * high resolution.
 */
import type { ViewName } from '../lib/types'

export interface CaptureOptions {
  /** Square output size in pixels (used when width/height are not given) */
  size: number
  /** Optional non-square output, e.g. 1920 × 1080. The product is framed to fit the shorter side. */
  width?: number
  height?: number
  transparent: boolean
  view: ViewName | null
}

interface Impl {
  capture: (o: CaptureOptions) => HTMLCanvasElement
  maxSize: () => number
}

let impl: Impl | null = null
export function registerRenderer(i: Impl | null) {
  impl = i
}
export function rendererAvailable() {
  return !!impl
}
export function maxExportSize() {
  return impl ? impl.maxSize() : 2048
}
export function captureScene(o: CaptureOptions): HTMLCanvasElement {
  if (!impl) throw new Error('The 3D viewer is not ready yet.')
  return impl.capture(o)
}

/* ---------------- stage readiness ---------------- */

let readyKey = ''
const waiters: { key: string; resolve: () => void }[] = []

export function markStageReady(key: string) {
  readyKey = key
  for (let i = waiters.length - 1; i >= 0; i--) {
    if (waiters[i].key === key) {
      waiters[i].resolve()
      waiters.splice(i, 1)
    }
  }
}

export function stageKey(designId: string, updatedAt: number, productId: string) {
  return `${designId}:${updatedAt}:${productId}`
}

export function waitForStage(key: string, timeout = 15000): Promise<void> {
  if (readyKey === key) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const w = { key, resolve: () => (clearTimeout(t), resolve()) }
    const t = setTimeout(() => {
      const i = waiters.indexOf(w)
      if (i >= 0) waiters.splice(i, 1)
      reject(new Error('Timed out waiting for the 3D model to render.'))
    }, timeout)
    waiters.push(w)
  })
}
