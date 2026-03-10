export const BASE_MODEL_OPTIONS = [
  'Deepexi2.0-60B-A14B',
  'Deepexi-VL2.0-32B',
  'Deepexi-VL2.0-7B-Doc',
] as const

export type BaseModelOption = typeof BASE_MODEL_OPTIONS[number]

export const SERVICE_MODEL_OPTIONS = [
  'Deepexi 2.0 通用对话',
  'Deepexi 2.0 推理增强',
  'Deepexi VL 2.0 巡检理解',
  'Deepexi VL 2.0 文档解析',
] as const

export type ServiceModelOption = typeof SERVICE_MODEL_OPTIONS[number]

export const BASE_MODEL_SELECT_OPTIONS = BASE_MODEL_OPTIONS.map(value => ({
  value,
  label: value,
}))

export const SERVICE_MODEL_SELECT_OPTIONS = SERVICE_MODEL_OPTIONS.map(value => ({
  value,
  label: value,
}))

export const REFRESHED_MODEL_NAMES = {
  chat: 'deepexi-2.0-60b-a14b-chat',
  reasoning: 'deepexi-2.0-60b-a14b-reasoning',
  vlInspection: 'deepexi-vl-2.0-32b-inspection',
  vlDoc: 'deepexi-vl-2.0-7b-doc',
} as const

export const REFRESHED_MODEL_DISPLAY_NAMES: Record<string, string> = {
  [REFRESHED_MODEL_NAMES.chat]: 'Deepexi 2.0 通用对话',
  [REFRESHED_MODEL_NAMES.reasoning]: 'Deepexi 2.0 推理增强',
  [REFRESHED_MODEL_NAMES.vlInspection]: 'Deepexi VL 2.0 巡检理解',
  [REFRESHED_MODEL_NAMES.vlDoc]: 'Deepexi VL 2.0 文档解析',
}

export const LEGACY_SERVICE_MODEL_NAME_MAP: Record<string, ServiceModelOption> = {
  'Deepexi-Platform-70B': 'Deepexi 2.0 通用对话',
  'Deepexi-R1-Reasoner': 'Deepexi 2.0 推理增强',
  'Deepexi-Industry-60B-Instruct': 'Deepexi 2.0 推理增强',
  'Deepexi-General-Agent': 'Deepexi 2.0 通用对话',
  'DeepSeek-V3': 'Deepexi 2.0 通用对话',
  'DeepSeek-R1': 'Deepexi 2.0 推理增强',
  'Qwen-72B': 'Deepexi 2.0 推理增强',
  'GLM-4': 'Deepexi 2.0 通用对话',
}

export function normalizeServiceModelName(model: string): string {
  return LEGACY_SERVICE_MODEL_NAME_MAP[model] ?? model
}

export function getModelDisplayName(modelName: string): string {
  return REFRESHED_MODEL_DISPLAY_NAMES[modelName] ?? modelName
}
