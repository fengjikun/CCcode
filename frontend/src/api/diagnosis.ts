import type {
  Phenomenon,
  PhenomenonDetail,
  DiagnosisPayload,
  DiagnosisRecord,
} from '../types/diagnosis'
import type { GraphData } from '../types/graph'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const rand = (min: number, max: number) => min + Math.random() * (max - min)

/* ---------- Mock Data ---------- */

const MOCK_PHENOMENA: Phenomenon[] = [
  { id: 'phen-001', label: '电机异常振动', properties: { category: '机械故障', frequency: 'HIGH' } },
  { id: 'phen-002', label: '温度过高报警', properties: { category: '热力故障', frequency: 'MEDIUM' } },
  { id: 'phen-003', label: '压力波动异常', properties: { category: '液压故障', frequency: 'HIGH' } },
  { id: 'phen-004', label: '噪音异常增大', properties: { category: '机械故障', frequency: 'LOW' } },
  { id: 'phen-005', label: '电流不稳定', properties: { category: '电气故障', frequency: 'MEDIUM' } },
  { id: 'phen-006', label: '润滑油压不足', properties: { category: '润滑故障', frequency: 'LOW' } },
  { id: 'phen-007', label: '轴承磨损严重', properties: { category: '机械故障', frequency: 'HIGH' } },
  { id: 'phen-008', label: '密封泄漏', properties: { category: '密封故障', frequency: 'MEDIUM' } },
]

const SUB_PHENOMENA: Record<string, { id: string; label: string }[]> = {
  'phen-001': [
    { id: 'sub-001-1', label: '不平衡振动' },
    { id: 'sub-001-2', label: '轴不对中' },
    { id: 'sub-001-3', label: '共振' },
  ],
  'phen-002': [
    { id: 'sub-002-1', label: '冷却系统故障' },
    { id: 'sub-002-2', label: '过载运行' },
    { id: 'sub-002-3', label: '环境温度异常' },
  ],
  'phen-003': [
    { id: 'sub-003-1', label: '泵体磨损' },
    { id: 'sub-003-2', label: '阀门泄漏' },
    { id: 'sub-003-3', label: '管路堵塞' },
  ],
  'phen-004': [
    { id: 'sub-004-1', label: '齿轮磨损' },
    { id: 'sub-004-2', label: '轴承损坏' },
  ],
  'phen-005': [
    { id: 'sub-005-1', label: '接线松动' },
    { id: 'sub-005-2', label: '绝缘老化' },
    { id: 'sub-005-3', label: '变频器故障' },
  ],
  'phen-006': [
    { id: 'sub-006-1', label: '油泵故障' },
    { id: 'sub-006-2', label: '油路堵塞' },
  ],
  'phen-007': [
    { id: 'sub-007-1', label: '滚动体疲劳剥落' },
    { id: 'sub-007-2', label: '保持架断裂' },
    { id: 'sub-007-3', label: '润滑不良' },
  ],
  'phen-008': [
    { id: 'sub-008-1', label: '密封圈老化' },
    { id: 'sub-008-2', label: '安装不当' },
  ],
}

let recordIdSeq = 100

const MOCK_RECORDS: DiagnosisRecord[] = [
  {
    id: 1, deviceId: 1001, deviceName: 'CNC-A3 数控铣床', deviceType: '数控机床',
    symptoms: '主轴异常振动,加工精度下降', description: '加工过程中发现主轴振动幅度增大，工件表面粗糙度不达标',
    severity: 'HIGH', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '电机异常振动', fault_type: '机械故障', confidence: '92%', urgency: '高',
      summary: '主轴轴承滚动体出现疲劳剥落，导致振动增大。建议立即停机更换轴承。',
      root_causes: ['轴承使用寿命到期', '润滑脂劣化'],
      checkpoints: [
        { step: 1, checkpoint: '检查主轴温度', method: '红外测温', expected: '< 60°C' },
        { step: 2, checkpoint: '测量振动值', method: '振动传感器', expected: '< 4.5 mm/s' },
      ],
      solutions: [
        { title: '更换主轴轴承', steps: '停机→拆卸主轴→更换轴承→装配→试运行', estimated_time: '4小时' },
      ],
    }),
    reportedAt: '2025-03-08T14:30:00.000Z',
  },
  {
    id: 2, deviceId: 1002, deviceName: 'PUMP-B7 离心泵', deviceType: '泵类设备',
    symptoms: '出口压力下降,流量不足', description: '离心泵运行时出口压力比额定值低 20%',
    severity: 'MEDIUM', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '压力波动异常', fault_type: '液压故障', confidence: '88%', urgency: '中',
      summary: '叶轮磨损导致泵效下降，建议安排计划性检修。',
      root_causes: ['叶轮汽蚀磨损', '密封间隙增大'],
      checkpoints: [
        { step: 1, checkpoint: '检查入口过滤器', method: '目视检查', expected: '无堵塞' },
        { step: 2, checkpoint: '检查叶轮间隙', method: '塞尺测量', expected: '< 0.3mm' },
      ],
      solutions: [
        { title: '更换叶轮', steps: '停泵→拆壳体→更换叶轮→调整间隙→试运行', estimated_time: '6小时' },
      ],
    }),
    reportedAt: '2025-03-07T09:15:00.000Z',
  },
  {
    id: 3, deviceId: 1003, deviceName: 'MOTOR-C2 驱动电机', deviceType: '电机',
    symptoms: '电流波动,运行噪音大', description: '电机启动后电流不稳定，伴有异常噪音',
    severity: 'HIGH', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '电流不稳定', fault_type: '电气故障', confidence: '85%', urgency: '高',
      summary: '电机绕组绝缘老化导致匝间短路，需要重新绕制或更换电机。',
      root_causes: ['绝缘材料老化', '运行环境湿度过高'],
      solutions: [
        { title: '电机返厂维修', steps: '停机→拆卸电机→送厂维修→安装→试运行', estimated_time: '3天' },
      ],
    }),
    reportedAt: '2025-03-06T16:45:00.000Z',
  },
]

const MOCK_GRAPH: GraphData = {
  nodes: [
    { id: 'device-1001', type: 'Device', label: 'CNC-A3 数控铣床' },
    { id: 'device-1002', type: 'Device', label: 'PUMP-B7 离心泵' },
    { id: 'device-1003', type: 'Device', label: 'MOTOR-C2 驱动电机' },
    { id: 'fault-001', type: 'Fault', label: '轴承磨损' },
    { id: 'fault-002', type: 'Fault', label: '叶轮汽蚀' },
    { id: 'fault-003', type: 'Fault', label: '绝缘老化' },
    { id: 'phen-001', type: 'Phenomenon', label: '异常振动' },
    { id: 'phen-002', type: 'Phenomenon', label: '压力波动' },
    { id: 'phen-003', type: 'Phenomenon', label: '电流不稳' },
    { id: 'part-001', type: 'Part', label: '主轴轴承 7014C' },
    { id: 'part-002', type: 'Part', label: '叶轮 IMP-200' },
    { id: 'part-003', type: 'Part', label: '定子绕组' },
    { id: 'solution-001', type: 'Solution', label: '更换轴承' },
    { id: 'solution-002', type: 'Solution', label: '更换叶轮' },
    { id: 'solution-003', type: 'Solution', label: '电机返厂维修' },
  ],
  links: [
    { source: 'device-1001', target: 'fault-001', rel: '发生故障' },
    { source: 'device-1002', target: 'fault-002', rel: '发生故障' },
    { source: 'device-1003', target: 'fault-003', rel: '发生故障' },
    { source: 'fault-001', target: 'phen-001', rel: '表现为' },
    { source: 'fault-002', target: 'phen-002', rel: '表现为' },
    { source: 'fault-003', target: 'phen-003', rel: '表现为' },
    { source: 'fault-001', target: 'part-001', rel: '涉及部件' },
    { source: 'fault-002', target: 'part-002', rel: '涉及部件' },
    { source: 'fault-003', target: 'part-003', rel: '涉及部件' },
    { source: 'fault-001', target: 'solution-001', rel: '推荐方案' },
    { source: 'fault-002', target: 'solution-002', rel: '推荐方案' },
    { source: 'fault-003', target: 'solution-003', rel: '推荐方案' },
  ],
}

/* ---------- API Functions ---------- */

export async function getPhenomena(): Promise<Phenomenon[]> {
  await delay(rand(300, 500))
  return MOCK_PHENOMENA
}

export async function getPhenomenonDetail(id: string): Promise<PhenomenonDetail> {
  await delay(rand(200, 400))
  const phen = MOCK_PHENOMENA.find(p => p.id === id)
  return {
    id,
    label: phen?.label ?? '未知现象',
    subPhenomena: SUB_PHENOMENA[id] ?? [],
  }
}

export async function analyzeDiagnosis(payload: DiagnosisPayload): Promise<DiagnosisRecord> {
  // 模拟 AI 模型分析延迟 (3-5 秒)
  await delay(rand(3000, 5000))

  const phen = MOCK_PHENOMENA.find(p => p.id === payload.phenomenonId)
  const record: DiagnosisRecord = {
    id: ++recordIdSeq,
    deviceId: payload.deviceId,
    deviceName: payload.deviceName,
    deviceType: payload.deviceType,
    symptoms: payload.symptoms.join(','),
    description: payload.description,
    severity: payload.severity,
    status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: phen?.label ?? '未知现象',
      fault_type: phen?.properties?.category ?? '未分类',
      confidence: `${85 + Math.floor(Math.random() * 12)}%`,
      urgency: payload.severity === 'CRITICAL' || payload.severity === 'HIGH' ? '高' : '中',
      summary: `基于故障知识图谱分析，${payload.deviceName} 出现的 ${phen?.label ?? '异常'} 现象与 ${phen?.properties?.category ?? '设备'} 相关。建议按照检查清单逐步排查。`,
      root_causes: ['部件磨损超限', '维护周期未到期提前失效', '运行工况偏离设计参数'],
      checkpoints: [
        { step: 1, checkpoint: '检查运行参数', method: '监控系统读取', expected: '在额定范围内' },
        { step: 2, checkpoint: '检查关键部件状态', method: '现场巡检', expected: '无异常磨损/变色' },
        { step: 3, checkpoint: '检查润滑状态', method: '油样分析', expected: '金属颗粒 < 50ppm' },
      ],
      solutions: [
        {
          title: '计划性检修',
          steps: '停机→故障部件拆检→更换或修复→重新装配→试运行验证',
          estimated_time: '4-8小时',
          risk_level: '低',
        },
      ],
    }),
    reportedAt: new Date().toISOString(),
  }
  MOCK_RECORDS.unshift(record)
  return record
}

export async function getDiagnosisRecords(): Promise<DiagnosisRecord[]> {
  await delay(rand(300, 600))
  return MOCK_RECORDS
}

export async function getDiagnosisRecord(id: number): Promise<DiagnosisRecord> {
  await delay(rand(200, 400))
  return MOCK_RECORDS.find(r => r.id === id) ?? MOCK_RECORDS[0]
}

export async function getGraphData(): Promise<GraphData> {
  await delay(rand(400, 700))
  return MOCK_GRAPH
}
