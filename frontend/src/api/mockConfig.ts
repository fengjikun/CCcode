/**
 * Mock 延迟全局配置
 *
 * 通过 MOCK_SPEED 控制所有 mock API 的延迟倍率：
 *   0   — 无延迟（瞬间返回）
 *   0.5 — 快速（默认延迟 × 0.5）
 *   1   — 默认
 *   2   — 慢速（默认延迟 × 2，更接近真实网络）
 *   3+  — 超慢（用于观察加载态）
 *
 * 也可以在浏览器控制台动态修改：
 *   window.__MOCK_SPEED__ = 3
 */

declare global {
  interface Window {
    __MOCK_SPEED__?: number
  }
}

/** 延迟倍率，默认 2（更接近真实网络延迟） */
export const MOCK_SPEED = 2

function getSpeed(): number {
  if (typeof window !== 'undefined' && typeof window.__MOCK_SPEED__ === 'number') {
    return window.__MOCK_SPEED__
  }
  return MOCK_SPEED
}

/** 延迟指定毫秒（受 MOCK_SPEED 倍率影响） */
export const delay = (ms: number) =>
  new Promise<void>(r => {
    const actual = Math.round(ms * getSpeed())
    if (actual <= 0) {
      r()
    } else {
      setTimeout(r, actual)
    }
  })

/** 生成 [min, max) 区间随机数 */
export const rand = (min: number, max: number) =>
  min + Math.random() * (max - min)
