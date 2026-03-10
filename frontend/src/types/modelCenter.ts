export type ModelFamily = 'LLM' | 'VL'
export type ModelModality = 'text' | 'image-text'
export type TrainStage = 'pretrain' | 'sft' | 'lora' | 'qlora' | 'dpo'
export type DatasetType = 'instruction' | 'conversation' | 'preference' | 'image-caption' | 'vqa'
export type ModelCapability =
  | 'chat'
  | 'reasoning'
  | 'vision-language-understanding'
  | 'document-parsing'
  | 'ocr'

export const MODEL_FAMILY_LABELS: Record<ModelFamily, string> = {
  LLM: '语言模型',
  VL: '视觉语言模型',
}

export const MODEL_MODALITY_LABELS: Record<ModelModality, string> = {
  text: '文本',
  'image-text': '图文',
}

export const TRAIN_STAGE_LABELS: Record<TrainStage, string> = {
  pretrain: '继续预训练',
  sft: '监督微调',
  lora: 'LoRA',
  qlora: 'QLoRA',
  dpo: '偏好对齐',
}

export const DATASET_TYPE_LABELS: Record<DatasetType, string> = {
  instruction: '指令数据',
  conversation: '多轮对话',
  preference: '偏好对',
  'image-caption': '图文描述',
  vqa: '视觉问答',
}

export const MODEL_CAPABILITY_LABELS: Record<ModelCapability, string> = {
  chat: '对话',
  reasoning: '推理',
  'vision-language-understanding': '图文理解',
  'document-parsing': '文档解析',
  ocr: 'OCR',
}
