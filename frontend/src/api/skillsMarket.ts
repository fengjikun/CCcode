import type { Skill, SkillCategory, SkillStatus, SkillTemplateFile, SkillScriptFile } from '../types/skill'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'skills-market'

interface SkillStore {
  skills: Skill[]
  importableFunctions: OntologyFunctionItem[]
}

const DEFAULT_STORE: SkillStore = {
  skills: [
    {
      id: 'sk-001',
      name: 'equipment-fault-diagnosis',
      displayName: '设备故障诊断专家',
      category: 'domain-expert',
      status: 'Active',
      description: '基于设备本体与故障知识图谱，分析传感器数据并输出维修方案。',
      instructions: '# 设备故障诊断专家\n\n根据设备告警生成结构化诊断结论。',
      reference: '故障代码格式: FC-XXX-001',
      templates: [{ name: 'diagnosis_report.md', description: '诊断报告输出模板' }],
      scripts: [{ name: 'analyze_vibration.py', description: '振动频谱分析脚本' }],
      dependencies: 'ontology-api, sensor-data-api',
      tags: ['设备运维', '故障诊断'],
      installs: 2341,
      author: 'DeepexiOS',
      createdAt: '2024-06-01T08:00:00.000Z',
      updatedAt: '2024-11-20T10:00:00.000Z',
    },
  ],
  importableFunctions: [
    {
      id: 'fn-001',
      name: 'checkMotorHealth',
      projectName: '设备运维本体',
      projectId: 'proj-001',
      description: '检查电机健康状态并返回健康评分。',
      scriptContent: 'def check_motor_health(device_id):\n    return {"score": 0.92}',
      status: 'ACTIVE',
    },
  ],
}

async function loadStore(): Promise<SkillStore> {
  return ensureMockStore<SkillStore>(STORE_KEY, DEFAULT_STORE)
}

async function saveStore(store: SkillStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
}

export async function listSkills(): Promise<Skill[]> {
  return (await loadStore()).skills
}

export async function getSkill(id: string): Promise<Skill | null> {
  return (await loadStore()).skills.find(s => s.id === id) ?? null
}

export async function createSkill(input: {
  name: string
  displayName: string
  category: SkillCategory
  description: string
  instructions: string
  reference?: string
  templates?: SkillTemplateFile[]
  scripts?: SkillScriptFile[]
  dependencies?: string
  tags?: string[]
}): Promise<Skill> {
  const now = new Date().toISOString()
  const skill: Skill = {
    id: `sk-${Date.now()}`,
    name: input.name,
    displayName: input.displayName,
    category: input.category,
    status: 'Draft',
    description: input.description,
    instructions: input.instructions,
    reference: input.reference,
    templates: input.templates || [],
    scripts: input.scripts || [],
    dependencies: input.dependencies,
    tags: input.tags || [],
    installs: 0,
    author: 'Current User',
    createdAt: now,
    updatedAt: now,
  }
  const store = await loadStore()
  store.skills.push(skill)
  await saveStore(store)
  return skill
}

export async function updateSkill(
  id: string,
  patch: Partial<Pick<Skill, 'displayName' | 'description' | 'instructions' | 'reference' | 'status' | 'category' | 'dependencies' | 'templates' | 'scripts' | 'tags'>>,
): Promise<Skill | null> {
  const store = await loadStore()
  const idx = store.skills.findIndex(s => s.id === id)
  if (idx < 0) return null
  store.skills[idx] = { ...store.skills[idx], ...patch, updatedAt: new Date().toISOString() }
  await saveStore(store)
  return store.skills[idx]
}

export async function deleteSkill(id: string): Promise<void> {
  const store = await loadStore()
  store.skills = store.skills.filter(s => s.id !== id)
  await saveStore(store)
}

export async function toggleSkillStatus(id: string): Promise<Skill | null> {
  const store = await loadStore()
  const idx = store.skills.findIndex(s => s.id === id)
  if (idx < 0) return null
  const current = store.skills[idx].status
  const next: SkillStatus = current === 'Active' ? 'Disabled' : 'Active'
  store.skills[idx] = { ...store.skills[idx], status: next, updatedAt: new Date().toISOString() }
  await saveStore(store)
  return store.skills[idx]
}

export async function resetSkills(): Promise<void> {
  await setMockStore(STORE_KEY, DEFAULT_STORE)
}

export interface OntologyFunctionItem {
  id: string
  name: string
  projectName: string
  projectId: string
  description: string
  scriptContent: string
  status: string
}

export async function listImportableFunctions(): Promise<OntologyFunctionItem[]> {
  return (await loadStore()).importableFunctions
}

export async function importFunctionAsSkill(fn: OntologyFunctionItem): Promise<Skill> {
  return createSkill({
    name: fn.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
    displayName: fn.description.split('，')[0] || fn.name,
    category: 'domain-expert',
    description: `从本体项目「${fn.projectName}」导入的 Function。${fn.description}`,
    instructions: `# ${fn.name}\n\n\`\`\`python\n${fn.scriptContent}\n\`\`\``,
    scripts: [{ name: `${fn.name}.py`, description: '从本体 Function 导入' }],
    tags: ['本体导入', fn.projectName],
  })
}
