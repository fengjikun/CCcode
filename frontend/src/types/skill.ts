/**
 * L4 Skills Hub类型定义
 *
 * Skill = 可复用的 AI 指令包，标准目录结构：
 *   skill-name/
 *     SKILL.md          ← 必要：名称、触发时机、工具、执行流程
 *     reference.md      ← 可选：格式范本、专有名词、填写范例
 *     template/          ← 可选：输出模板（需要固定格式时）
 *     scripts/           ← 可选：执行过程需要跑的脚本
 */

/** Skill 分类 */
export type SkillCategory =
  | 'enterprise'     // 企业运营
  | 'development'    // 开发工具
  | 'data-analysis'  // 数据分析
  | 'document'       // 文档处理
  | 'communication'  // 沟通协作
  | 'domain-expert'  // 领域专家

export type SkillStatus = 'Active' | 'Draft' | 'Disabled'

export const SKILL_CATEGORIES: SkillCategory[] = [
  'enterprise', 'development', 'data-analysis', 'document', 'communication', 'domain-expert',
]

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  enterprise: '企业运营',
  development: '开发工具',
  'data-analysis': '数据分析',
  document: '文档处理',
  communication: '沟通协作',
  'domain-expert': '领域专家',
}

export const SKILL_CATEGORY_COLORS: Record<SkillCategory, string> = {
  enterprise: 'blue',
  development: 'green',
  'data-analysis': 'purple',
  document: 'orange',
  communication: 'cyan',
  'domain-expert': 'red',
}

export const SKILL_CATEGORY_ICONS: Record<SkillCategory, string> = {
  enterprise: '🏢',
  development: '💻',
  'data-analysis': '📊',
  document: '📄',
  communication: '💬',
  'domain-expert': '🎓',
}

export const SKILL_CATEGORY_DESCRIPTIONS: Record<SkillCategory, string> = {
  enterprise: '审批流程、工单管理、供应链协调等企业运营自动化',
  development: '代码审查、测试自动化、CI/CD 流程、架构设计',
  'data-analysis': '数据清洗、异常检测、预测分析、报告生成',
  document: 'PDF/Word/Excel 处理、报告模板、合同审查',
  communication: '通知推送、邮件起草、会议纪要、内部协作',
  'domain-expert': '设备诊断、工艺优化、质量检测等行业专家知识',
}

export const SKILL_STATUS_COLORS: Record<SkillStatus, string> = {
  Active: 'green',
  Draft: 'orange',
  Disabled: 'default',
}

/** template/ 目录下的模板文件 */
export interface SkillTemplateFile {
  name: string
  description?: string
}

/** scripts/ 目录下的脚本文件 */
export interface SkillScriptFile {
  name: string
  description?: string
}

/** Skill 完整定义 */
export interface Skill {
  id: string
  /** 英文标识，同时也是目录名 */
  name: string
  displayName: string
  category: SkillCategory
  status: SkillStatus
  /** 触发描述 — Agent 根据此描述判断何时加载 */
  description: string
  /** SKILL.md 正文（必要）— 名称、触发时机、工具、执行流程 */
  instructions: string
  /** reference.md 正文（可选）— 格式范本、专有名词、填写范例 */
  reference?: string
  /** template/ 目录文件列表（可选）— 输出模板 */
  templates: SkillTemplateFile[]
  /** scripts/ 目录文件列表（可选）— 执行脚本 */
  scripts: SkillScriptFile[]
  /** 依赖说明 */
  dependencies?: string
  /** 适用 Agent 类型标签 */
  tags: string[]
  /** 安装/使用次数 */
  installs: number
  /** 作者 */
  author: string
  createdAt: string
  updatedAt: string
}

// ── 兼容旧资源格式（内部迁移用）──
export interface SkillResource {
  name: string
  type: 'script' | 'template' | 'data' | 'config'
  description?: string
}
