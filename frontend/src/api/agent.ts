import { getAuthToken } from '../auth/session'

export interface DeviceAlert {
  id: string
  deviceId: string
  deviceName: string
  productionLine: string
  status: string
  runningHours: number
  faultType: string
  faultCode: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  occurredAt: string
  acknowledged: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface SkillInfo {
  name: string
  code: string
  version: string
}

export interface ReasoningStep {
  title: string
  content: string
}

export interface WorkOrder {
  workOrderId: string
  deviceId: string
  deviceName: string
  productionLine: string
  faultType: string
  faultDescription: string
  severity: string
  suggestedRepairSteps: string[]
  estimatedDuration: string
  requiredTools: string[]
  safetyNotes: string
  createdAt: string
  note?: string
}

// SSE 事件回调
export interface ChatStreamCallbacks {
  onSkillLoad?: (skill: SkillInfo) => void
  onStepStart?: (title: string) => void
  onStepDelta?: (title: string, text: string) => void
  onStepEnd?: (title: string) => void
  onReplyStart?: () => void
  onReplyDelta?: (text: string) => void
  onDone?: () => void
  onError?: (msg: string) => void
}

import { fetchJSON } from './client'

export function getAlerts(): Promise<DeviceAlert[]> {
  return fetchJSON<DeviceAlert[]>('/api/agent/alerts')
}

export async function sendChatMessage(
  messages: ChatMessage[],
  projectId: string | null,
  deviceContext: DeviceAlert | null,
  digitalHumanType: string | null,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const token = getAuthToken()
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, projectId, deviceContext, digitalHumanType }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    callbacks.onError?.(err.detail || `请求失败：${res.status}`)
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    // 按 SSE 格式解析，每个事件以 \n\n 分隔
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''

    for (const part of parts) {
      let eventType = 'message'
      let dataStr = ''
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim()
        if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
      }
      if (!dataStr) continue
      try {
        const data = JSON.parse(dataStr)
        switch (eventType) {
          case 'skill-load': callbacks.onSkillLoad?.(data); break
          case 'step-start': callbacks.onStepStart?.(data.title); break
          case 'step-delta': callbacks.onStepDelta?.(data.title, data.text); break
          case 'step-end':   callbacks.onStepEnd?.(data.title); break
          case 'reply-start': callbacks.onReplyStart?.(); break
          case 'reply-delta': callbacks.onReplyDelta?.(data.text); break
          case 'done':       callbacks.onDone?.(); break
          case 'error':      callbacks.onError?.(data.message); break
        }
      } catch {
        // 忽略解析错误
      }
    }
  }
  callbacks.onDone?.()
}

export function generateWorkOrder(
  messages: ChatMessage[],
  projectId: string | null,
  deviceContext: DeviceAlert | null,
): Promise<WorkOrder> {
  return fetchJSON<WorkOrder>('/api/agent/work-order', 'POST', {
    messages,
    projectId,
    deviceContext,
  })
}
