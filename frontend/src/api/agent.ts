export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

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

import { delay, rand } from './mockConfig'

/* ---------- Mock Data ---------- */

const MOCK_ALERTS: DeviceAlert[] = [
  {
    id: 'alert-001', deviceId: 'DEV-1001', deviceName: 'CNC-A3 数控铣床',
    productionLine: 'A线-精密加工', status: 'ACTIVE', runningHours: 12580,
    faultType: '机械故障', faultCode: 'M-VIB-003', severity: 'HIGH',
    description: '主轴振动值超标，当前 6.2mm/s（阈值 4.5mm/s）',
    occurredAt: '2025-03-08T14:23:00.000Z', acknowledged: false,
  },
  {
    id: 'alert-002', deviceId: 'DEV-1002', deviceName: 'PUMP-B7 离心泵',
    productionLine: 'B线-流体处理', status: 'ACTIVE', runningHours: 8760,
    faultType: '液压故障', faultCode: 'H-PRS-001', severity: 'MEDIUM',
    description: '出口压力降至额定值的 78%，流量下降 15%',
    occurredAt: '2025-03-08T10:15:00.000Z', acknowledged: true,
  },
  {
    id: 'alert-003', deviceId: 'DEV-1003', deviceName: 'MOTOR-C2 驱动电机',
    productionLine: 'C线-动力传输', status: 'ACTIVE', runningHours: 22340,
    faultType: '电气故障', faultCode: 'E-CUR-007', severity: 'HIGH',
    description: '电流波动幅度 ±18%（正常 ±5%），伴有异常噪音',
    occurredAt: '2025-03-08T16:42:00.000Z', acknowledged: false,
  },
  {
    id: 'alert-004', deviceId: 'DEV-1004', deviceName: 'CONV-D1 皮带输送机',
    productionLine: 'D线-物料输送', status: 'RESOLVED', runningHours: 5430,
    faultType: '机械故障', faultCode: 'M-BLT-002', severity: 'LOW',
    description: '皮带跑偏，偏移量 12mm（阈值 15mm）',
    occurredAt: '2025-03-07T08:30:00.000Z', acknowledged: true,
  },
  {
    id: 'alert-005', deviceId: 'DEV-1005', deviceName: 'COMP-E3 空压机',
    productionLine: 'E线-气源供给', status: 'ACTIVE', runningHours: 15200,
    faultType: '热力故障', faultCode: 'T-TMP-004', severity: 'MEDIUM',
    description: '排气温度 98°C（阈值 90°C），冷却效率下降',
    occurredAt: '2025-03-08T11:55:00.000Z', acknowledged: false,
  },
]

/* ---------- 模拟 AI 回复内容 ---------- */

interface MockReply {
  skills: SkillInfo[]
  steps: { title: string; content: string }[]
  reply: string
}

function generateMockReply(
  messages: ChatMessage[],
  deviceContext: DeviceAlert | null,
): MockReply {
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? ''
  const deviceName = deviceContext?.deviceName ?? '设备'
  const faultType = deviceContext?.faultType ?? '故障'
  const faultCode = deviceContext?.faultCode ?? ''

  // 工单相关
  if (lastMsg.includes('工单') || lastMsg.includes('维修')) {
    return {
      skills: [
        { name: '故障知识图谱', code: 'fault_knowledge', version: '2.1.0' },
        { name: '工单生成引擎', code: 'work_order', version: '1.3.0' },
      ],
      steps: [
        { title: '分析故障上下文', content: `正在分析 ${deviceName} 的故障信息（故障码：${faultCode}）...\n设备运行工况数据加载完成，开始匹配故障模式。` },
        { title: '检索历史维修记录', content: `检索到 ${deviceName} 历史维修记录 12 条。\n最近一次同类故障维修：2024-11-15，更换了主轴轴承。\n平均修复时间（MTTR）：4.2 小时。` },
        { title: '生成维修方案', content: `基于故障知识图谱匹配到 3 种修复方案。\n推荐方案：计划性更换关键部件 + 系统校准。\n预估修复时间：3-5 小时。` },
      ],
      reply: `## ${deviceName} 维修建议\n\n### 故障概述\n- **故障类型**：${faultType}\n- **故障码**：${faultCode}\n- **严重程度**：${deviceContext?.severity ?? '中'}\n\n### 推荐修复方案\n\n1. **停机检查**：关闭设备电源，挂牌上锁\n2. **拆检关键部件**：检查轴承/密封/绕组状态\n3. **更换损坏部件**：按 BOM 清单领取备件\n4. **重新装配**：按扭矩规范装配，检查间隙\n5. **试运行验证**：空载运行 30 分钟，监测各项参数\n\n### 所需备件\n| 备件名称 | 规格 | 数量 |\n|---------|------|------|\n| 主轴轴承 | 7014C/P5 | 2 |\n| 密封圈 | φ70×85×8 | 4 |\n| 润滑脂 | SKF LGMT 2 | 1kg |\n\n> 💡 建议同步检查同产线其他设备的同类部件状态，预防性维护可降低 40% 非计划停机。`,
    }
  }

  // 诊断/分析相关
  if (lastMsg.includes('诊断') || lastMsg.includes('分析') || lastMsg.includes('原因') || lastMsg.includes('为什么')) {
    return {
      skills: [
        { name: '故障知识图谱', code: 'fault_knowledge', version: '2.1.0' },
        { name: '设备状态感知', code: 'device_sensing', version: '1.5.0' },
      ],
      steps: [
        { title: '加载设备运行数据', content: `正在读取 ${deviceName} 实时运行数据...\n振动数据：6.2 mm/s（基线 2.1 mm/s）\n温度数据：68°C（基线 52°C）\n电流数据：正常范围内` },
        { title: '故障模式匹配', content: `在知识图谱中匹配故障模式...\n匹配到 "轴承滚动体疲劳剥落" 模式（置信度 92%）\n关联现象：振动增大 + 温度上升 + 频谱高频分量异常` },
        { title: '根因分析', content: `追溯根因链路...\n\n根因：轴承使用寿命到期（已运行 12,580 小时，额定 10,000 小时）\n促发因素：润滑脂性能衰减、运行负载偏重\n\n确认关联子现象 3 项，排除干扰因素 2 项。` },
      ],
      reply: `## ${deviceName} 故障诊断报告\n\n### 诊断结论\n**故障类型**：${faultType}（${faultCode}）\n**置信度**：92%\n**紧急程度**：🔴 高\n\n### 根因分析\n主轴轴承已运行 12,580 小时，超过额定寿命 10,000 小时。轴承内圈滚道出现疲劳剥落，导致：\n- 振动值从基线 2.1mm/s 升至 6.2mm/s\n- 轴承温度从 52°C 升至 68°C\n- 频谱分析显示轴承特征频率（BPFO）幅值异常\n\n### 风险评估\n若继续运行，预计 48-72 小时内可能发生：\n- 轴承抱死导致主轴损坏\n- 加工精度持续恶化\n- 可能引发二次损坏（齿轮、联轴器）\n\n### 建议措施\n1. ⚠️ 建议 24 小时内安排停机检修\n2. 准备备件：主轴轴承 7014C/P5 × 2\n3. 同步检查润滑系统，更换润滑脂`,
    }
  }

  // 默认回复
  return {
    skills: [
      { name: '设备状态感知', code: 'device_sensing', version: '1.5.0' },
    ],
    steps: [
      { title: '理解问题', content: `正在分析您的问题...\n已关联设备上下文：${deviceName}\n当前设备状态：${deviceContext?.status ?? '未知'}` },
    ],
    reply: `您好！我是设备运维诊断专员。\n\n当前 ${deviceName} 的状态：\n- **故障类型**：${faultType}\n- **描述**：${deviceContext?.description ?? '暂无详细描述'}\n- **运行时长**：${deviceContext?.runningHours?.toLocaleString() ?? '—'} 小时\n\n我可以帮您：\n1. 🔍 **故障诊断分析** — 分析根因与影响范围\n2. 🔧 **生成维修工单** — 制定修复方案与备件清单\n3. 📊 **查看历史记录** — 检索同类故障与维修历史\n\n请问您需要哪方面的帮助？`,
  }
}

/* ---------- API Functions ---------- */

export async function getAlerts(): Promise<DeviceAlert[]> {
  await delay(rand(300, 500))
  return MOCK_ALERTS
}

/**
 * 模拟 SSE 流式聊天，逐步推送 skill-load → step → reply
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  _projectId: string | null,
  deviceContext: DeviceAlert | null,
  _digitalHumanType: string | null,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const mock = generateMockReply(messages, deviceContext)

  // 1. Skill 加载阶段（每个 skill 间隔 300-600ms）
  for (const skill of mock.skills) {
    await delay(rand(300, 600))
    callbacks.onSkillLoad?.(skill)
  }

  // 2. 推理步骤阶段（每步 1-2s，逐字输出）
  for (const step of mock.steps) {
    await delay(rand(400, 700))
    callbacks.onStepStart?.(step.title)

    // 逐片段输出 step content，模拟思考过程
    const chunks = step.content.split('\n')
    for (const chunk of chunks) {
      await delay(rand(300, 800))
      callbacks.onStepDelta?.(step.title, chunk + '\n')
    }

    await delay(rand(200, 400))
    callbacks.onStepEnd?.(step.title)
  }

  // 3. 最终回复阶段（逐字符流式输出，模拟模型生成）
  await delay(rand(300, 500))
  callbacks.onReplyStart?.()

  // 按字符或小段输出，每 20-50ms 输出一小段
  const replyText = mock.reply
  let pos = 0
  while (pos < replyText.length) {
    const chunkSize = Math.floor(rand(2, 8))
    const chunk = replyText.slice(pos, pos + chunkSize)
    callbacks.onReplyDelta?.(chunk)
    pos += chunkSize
    await delay(rand(15, 45))
  }

  await delay(rand(100, 200))
  callbacks.onDone?.()
}

export async function generateWorkOrder(
  _messages: ChatMessage[],
  _projectId: string | null,
  deviceContext: DeviceAlert | null,
): Promise<WorkOrder> {
  // 模拟 AI 生成工单延迟 (2-3 秒)
  await delay(rand(2000, 3000))

  const device = deviceContext ?? MOCK_ALERTS[0]
  return {
    workOrderId: `WO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    productionLine: device.productionLine,
    faultType: device.faultType,
    faultDescription: device.description,
    severity: device.severity,
    suggestedRepairSteps: [
      '停机并切断电源，挂牌上锁',
      '拆卸防护罩，检查故障部件外观',
      '使用专业工具拆卸损坏部件',
      '按规范安装新部件，检查装配间隙',
      '恢复防护装置，通电试运行',
      '空载运行 30 分钟，记录各项参数',
      '确认参数正常后，恢复生产',
    ],
    estimatedDuration: '3-5 小时',
    requiredTools: ['轴承拉拔器', '扭矩扳手', '振动检测仪', '红外测温仪', '千分尺'],
    safetyNotes: '作业前确认设备完全断电，佩戴个人防护装备（安全帽、护目镜、绝缘手套）。高处作业需系安全带。',
    createdAt: new Date().toISOString(),
    note: '建议维修完成后安排预防性维护检查，更新设备维保计划。',
  }
}
