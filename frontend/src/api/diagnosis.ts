import type {
  Phenomenon,
  PhenomenonDetail,
  DiagnosisPayload,
  DiagnosisRecord,
} from '../types/diagnosis'
import type { GraphData } from '../types/graph'

import { delay, rand } from './mockConfig'

/* ---------- Mock Data（基于 VM-850 立式加工中心故障知识图谱） ---------- */

const MOCK_PHENOMENA: Phenomenon[] = [
  { id: 'phen_spindle_hot', label: '主轴温升异常', properties: { category: '旋转部件故障', frequency: 'COMMON', code: 'ALM-SP-021' } },
  { id: 'phen_axis_deviation', label: '进给轴定位偏差', properties: { category: '运动精度故障', frequency: 'COMMON', code: 'ALM-AX-014' } },
  { id: 'phen_hyd_pressure_low', label: '液压夹紧压力不足', properties: { category: '液压系统故障', frequency: 'OCCASIONAL', code: 'ALM-HY-009' } },
  { id: 'phen_atc_fail', label: '自动换刀失败', properties: { category: '辅助系统故障', frequency: 'OCCASIONAL', code: 'ALM-ATC-006' } },
]

const SUB_PHENOMENA: Record<string, { id: string; label: string }[]> = {
  phen_spindle_hot: [
    { id: 'sp_temp_above_65', label: '空载温度持续高于65°C' },
    { id: 'sp_bpfo_peak', label: '振动频谱出现BPFO峰值' },
    { id: 'sp_return_oil_dark', label: '润滑回油颜色变深' },
  ],
  phen_axis_deviation: [
    { id: 'sp_repeatability_over', label: '重复定位误差超差' },
    { id: 'sp_following_error', label: '伺服跟随误差持续放大' },
  ],
  phen_hyd_pressure_low: [
    { id: 'sp_pressure_below', label: '夹紧压力低于5.5MPa' },
    { id: 'sp_filter_dp_high', label: '液压过滤器压差偏高' },
  ],
  phen_atc_fail: [
    { id: 'sp_magazine_home_fail', label: '刀库回零失败' },
    { id: 'sp_arm_clamp_unstable', label: '机械手抓刀气压不稳' },
  ],
}

let recordIdSeq = 100

const MOCK_RECORDS: DiagnosisRecord[] = [
  {
    id: 1, deviceId: 3001, deviceName: 'VM-850 立式加工中心', deviceType: '数控加工中心',
    symptoms: '主轴温升异常,振动频谱出现BPFO峰值', description: '设备空载运行 15 分钟后主轴温度升至 68°C，振动频谱出现明显 BPFO 峰值',
    severity: 'HIGH', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '主轴温升异常', fault_type: '旋转部件故障', confidence: '96%', urgency: '高',
      summary: '主轴轴承存在早期剥落风险，同时润滑状态偏离基准。建议优先核查温升趋势、振动频谱和润滑回油状态。',
      root_causes: ['主轴轴承早期剥落', '主轴轴承润滑不足'],
      checkpoints: [
        { step: 1, checkpoint: '检查主轴温度趋势', method: '查看 SCADA 趋势曲线与现场测温', expected: '空载温度 < 60°C' },
        { step: 2, checkpoint: '检查振动频谱特征', method: '读取在线振动监测频谱', expected: '无明显轴承故障峰值' },
        { step: 3, checkpoint: '检查润滑回油状态', method: '目检回油窗并核对润滑记录', expected: '颜色正常、无明显金属颗粒' },
      ],
      solutions: [
        { title: '补充并更换主轴润滑脂', steps: '1.执行停机挂牌;2.清理旧润滑脂;3.按标准补充新脂;4.恢复后空载跑合;5.复测温升', estimated_time: '45分钟', risk_level: '低' },
        { title: '更换主轴轴承并跑合验证', steps: '1.拆卸主轴组件;2.更换轴承;3.测量预紧与跳动;4.执行跑合程序;5.验证振动温升', estimated_time: '6小时', risk_level: '高' },
      ],
    }),
    reportedAt: '2025-03-08T14:30:00.000Z',
  },
  {
    id: 2, deviceId: 3001, deviceName: 'VM-850 立式加工中心', deviceType: '数控加工中心',
    symptoms: '进给轴定位偏差,重复定位误差超差', description: 'X 轴重复定位误差持续大于 0.02mm，工件尺寸波动超出工艺控制线',
    severity: 'HIGH', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '进给轴定位偏差', fault_type: '运动精度故障', confidence: '93%', urgency: '高',
      summary: '当前表现更符合滚珠丝杠副磨损或编码器反馈漂移。建议先做反向间隙检测，再核对反馈一致性。',
      root_causes: ['丝杠螺母副磨损', '编码器反馈漂移'],
      checkpoints: [
        { step: 1, checkpoint: '检查丝杠反向间隙', method: '执行精度检测程序', expected: '反向间隙 < 0.01mm' },
        { step: 2, checkpoint: '检查编码器反馈一致性', method: '读取伺服诊断界面', expected: '反馈误差在允许范围内' },
      ],
      solutions: [
        { title: '调整或更换丝杠螺母副', steps: '1.检测丝杠磨损;2.调整预紧或更换螺母副;3.重建补偿参数;4.复测定位精度', estimated_time: '4小时', risk_level: '中' },
        { title: '校准编码器零点并复核接线', steps: '1.断电检查接线;2.校准零点;3.执行伺服自学习;4.复测跟随误差', estimated_time: '90分钟', risk_level: '中' },
      ],
    }),
    reportedAt: '2025-03-07T09:15:00.000Z',
  },
  {
    id: 3, deviceId: 3001, deviceName: 'VM-850 立式加工中心', deviceType: '数控加工中心',
    symptoms: '液压夹紧压力不足,夹紧压力低于5.5MPa', description: '夹具液压压力从 6.2MPa 下降到 5.1MPa，液压站保压波动明显',
    severity: 'MEDIUM', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '液压夹紧压力不足', fault_type: '液压系统故障', confidence: '91%', urgency: '中',
      summary: '液压泵内泄或过滤器堵塞的概率较高，建议结合压力曲线和过滤器压差联合判断。',
      root_causes: ['液压泵内泄', '液压过滤器堵塞'],
      checkpoints: [
        { step: 1, checkpoint: '检查液压压力曲线', method: '查看液压站历史趋势', expected: '稳定维持在 6.0-6.5MPa' },
        { step: 2, checkpoint: '检查过滤器压差', method: '读取压差表并检查保养记录', expected: '压差低于设定报警值' },
      ],
      solutions: [
        { title: '检修液压泵与密封组件', steps: '1.停机泄压;2.拆检液压泵;3.更换密封件;4.恢复油液并排气;5.验证保压', estimated_time: '3小时', risk_level: '中' },
        { title: '更换液压过滤器并清洗油路', steps: '1.停机泄压;2.更换滤芯;3.清洗油路;4.补充液压油;5.复测压差', estimated_time: '60分钟', risk_level: '低' },
      ],
    }),
    reportedAt: '2025-03-06T16:45:00.000Z',
  },
  {
    id: 4, deviceId: 3001, deviceName: 'VM-850 立式加工中心', deviceType: '数控加工中心',
    symptoms: '自动换刀失败,刀库回零失败', description: '换刀循环中刀库无法回零，机械手抓刀动作迟滞且气压波动明显',
    severity: 'MEDIUM', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '自动换刀失败', fault_type: '辅助系统故障', confidence: '89%', urgency: '中',
      summary: '当前故障链路集中在刀库原点开关和机械手气路。建议优先核验原点信号稳定性与抓刀气压。',
      root_causes: ['刀库原点开关失准', '气压不足或机械手卡滞'],
      checkpoints: [
        { step: 1, checkpoint: '检查刀库原点开关', method: '执行回零动作并监控 I/O 反馈', expected: '原点信号稳定切换' },
        { step: 2, checkpoint: '检查机械手抓刀气压', method: '查看气源压力表并执行空循环', expected: '气压稳定在 0.55-0.65MPa' },
      ],
      solutions: [
        { title: '重新校准刀库原点开关', steps: '1.调整原点开关位置;2.紧固触发片;3.执行多次回零测试;4.记录校准结果', estimated_time: '40分钟', risk_level: '低' },
        { title: '调整机械手夹爪并恢复气源压力', steps: '1.检查气源和过滤减压阀;2.处理漏气点;3.润滑机械手关节;4.执行空循环验证', estimated_time: '50分钟', risk_level: '低' },
      ],
    }),
    reportedAt: '2025-03-05T11:20:00.000Z',
  },
]

/* ---------- 故障知识图谱（VM-850 立式加工中心完整图谱） ---------- */

const MOCK_GRAPH: GraphData = {
  nodes: [
    { id: 'equip_vm850', type: 'Equipment', label: 'VM-850 立式加工中心' },
    { id: 'phen_spindle_hot', type: 'Phenomenon', label: '主轴温升异常' },
    { id: 'phen_axis_deviation', type: 'Phenomenon', label: '进给轴定位偏差' },
    { id: 'phen_hyd_pressure_low', type: 'Phenomenon', label: '液压夹紧压力不足' },
    { id: 'phen_atc_fail', type: 'Phenomenon', label: '自动换刀失败' },
    { id: 'sp_temp_above_65', type: 'SubPhenomenon', label: '空载温度持续高于65°C' },
    { id: 'sp_bpfo_peak', type: 'SubPhenomenon', label: '振动频谱出现BPFO峰值' },
    { id: 'sp_return_oil_dark', type: 'SubPhenomenon', label: '润滑回油颜色变深' },
    { id: 'sp_repeatability_over', type: 'SubPhenomenon', label: '重复定位误差超差' },
    { id: 'sp_following_error', type: 'SubPhenomenon', label: '伺服跟随误差持续放大' },
    { id: 'sp_pressure_below', type: 'SubPhenomenon', label: '夹紧压力低于5.5MPa' },
    { id: 'sp_filter_dp_high', type: 'SubPhenomenon', label: '液压过滤器压差偏高' },
    { id: 'sp_magazine_home_fail', type: 'SubPhenomenon', label: '刀库回零失败' },
    { id: 'sp_arm_clamp_unstable', type: 'SubPhenomenon', label: '机械手抓刀气压不稳' },
    { id: 'cp_spindle_temp_trend', type: 'Checkpoint', label: '检查主轴温度趋势' },
    { id: 'cp_vibration_spectrum', type: 'Checkpoint', label: '检查振动频谱特征' },
    { id: 'cp_lube_return', type: 'Checkpoint', label: '检查润滑回油状态' },
    { id: 'cp_backlash', type: 'Checkpoint', label: '检查丝杠反向间隙' },
    { id: 'cp_encoder_feedback', type: 'Checkpoint', label: '检查编码器反馈一致性' },
    { id: 'cp_hyd_pressure_curve', type: 'Checkpoint', label: '检查液压压力曲线' },
    { id: 'cp_filter_dp', type: 'Checkpoint', label: '检查过滤器压差' },
    { id: 'cp_magazine_home_sensor', type: 'Checkpoint', label: '检查刀库原点开关' },
    { id: 'cp_arm_air_pressure', type: 'Checkpoint', label: '检查机械手抓刀气压' },
    { id: 'cause_lube_shortage', type: 'Cause', label: '主轴轴承润滑不足' },
    { id: 'cause_bearing_spall', type: 'Cause', label: '主轴轴承早期剥落' },
    { id: 'cause_screw_wear', type: 'Cause', label: '丝杠螺母副磨损' },
    { id: 'cause_encoder_drift', type: 'Cause', label: '编码器反馈漂移' },
    { id: 'cause_hyd_pump_leak', type: 'Cause', label: '液压泵内泄' },
    { id: 'cause_filter_blocked', type: 'Cause', label: '液压过滤器堵塞' },
    { id: 'cause_home_switch_shift', type: 'Cause', label: '刀库原点开关失准' },
    { id: 'cause_air_pressure_drop', type: 'Cause', label: '气压不足或机械手卡滞' },
    { id: 'sol_regrease_spindle', type: 'Solution', label: '补充并更换主轴润滑脂' },
    { id: 'sol_replace_bearing', type: 'Solution', label: '更换主轴轴承并跑合验证' },
    { id: 'sol_adjust_screw', type: 'Solution', label: '调整或更换丝杠螺母副' },
    { id: 'sol_calibrate_encoder', type: 'Solution', label: '校准编码器零点并复核接线' },
    { id: 'sol_overhaul_pump', type: 'Solution', label: '检修液压泵与密封组件' },
    { id: 'sol_replace_filter', type: 'Solution', label: '更换液压过滤器并清洗油路' },
    { id: 'sol_reset_home_switch', type: 'Solution', label: '重新校准刀库原点开关' },
    { id: 'sol_restore_air_pressure', type: 'Solution', label: '调整机械手夹爪并恢复气源压力' },
    { id: 'comp_spindle_unit', type: 'Component', label: '主轴组件' },
    { id: 'comp_ball_screw', type: 'Component', label: '滚珠丝杠副' },
    { id: 'comp_servo_drive', type: 'Component', label: '伺服驱动系统' },
    { id: 'comp_hyd_station', type: 'Component', label: '液压站' },
    { id: 'comp_tool_magazine', type: 'Component', label: '刀库组件' },
    { id: 'comp_robot_arm', type: 'Component', label: '换刀机械手' },
    { id: 'param_spindle_temp', type: 'Parameter', label: '主轴温度' },
    { id: 'param_spindle_vibration', type: 'Parameter', label: '主轴振动' },
    { id: 'param_return_oil_cleanliness', type: 'Parameter', label: '润滑回油颗粒度' },
    { id: 'param_axis_repeatability', type: 'Parameter', label: '轴重复定位误差' },
    { id: 'param_hyd_pressure', type: 'Parameter', label: '液压压力' },
    { id: 'param_home_signal', type: 'Parameter', label: '刀库原点信号' },
    { id: 'param_arm_air_pressure', type: 'Parameter', label: '机械手气压' },
  ],
  links: [
    { source: 'equip_vm850', target: 'phen_spindle_hot', rel: '易发故障' },
    { source: 'equip_vm850', target: 'phen_axis_deviation', rel: '易发故障' },
    { source: 'equip_vm850', target: 'phen_hyd_pressure_low', rel: '易发故障' },
    { source: 'equip_vm850', target: 'phen_atc_fail', rel: '易发故障' },
    { source: 'phen_spindle_hot', target: 'sp_temp_above_65', rel: '包含' },
    { source: 'phen_spindle_hot', target: 'sp_bpfo_peak', rel: '包含' },
    { source: 'phen_spindle_hot', target: 'sp_return_oil_dark', rel: '包含' },
    { source: 'phen_axis_deviation', target: 'sp_repeatability_over', rel: '包含' },
    { source: 'phen_axis_deviation', target: 'sp_following_error', rel: '包含' },
    { source: 'phen_hyd_pressure_low', target: 'sp_pressure_below', rel: '包含' },
    { source: 'phen_hyd_pressure_low', target: 'sp_filter_dp_high', rel: '包含' },
    { source: 'phen_atc_fail', target: 'sp_magazine_home_fail', rel: '包含' },
    { source: 'phen_atc_fail', target: 'sp_arm_clamp_unstable', rel: '包含' },
    { source: 'phen_spindle_hot', target: 'cp_spindle_temp_trend', rel: '需要检查' },
    { source: 'phen_spindle_hot', target: 'cp_vibration_spectrum', rel: '需要检查' },
    { source: 'phen_spindle_hot', target: 'cp_lube_return', rel: '需要检查' },
    { source: 'phen_axis_deviation', target: 'cp_backlash', rel: '需要检查' },
    { source: 'phen_axis_deviation', target: 'cp_encoder_feedback', rel: '需要检查' },
    { source: 'phen_hyd_pressure_low', target: 'cp_hyd_pressure_curve', rel: '需要检查' },
    { source: 'phen_hyd_pressure_low', target: 'cp_filter_dp', rel: '需要检查' },
    { source: 'phen_atc_fail', target: 'cp_magazine_home_sensor', rel: '需要检查' },
    { source: 'phen_atc_fail', target: 'cp_arm_air_pressure', rel: '需要检查' },
    { source: 'cp_spindle_temp_trend', target: 'sp_temp_above_65', rel: '发现异常' },
    { source: 'cp_vibration_spectrum', target: 'sp_bpfo_peak', rel: '发现异常' },
    { source: 'cp_lube_return', target: 'sp_return_oil_dark', rel: '发现异常' },
    { source: 'cp_backlash', target: 'sp_repeatability_over', rel: '发现异常' },
    { source: 'cp_encoder_feedback', target: 'sp_following_error', rel: '发现异常' },
    { source: 'cp_hyd_pressure_curve', target: 'sp_pressure_below', rel: '发现异常' },
    { source: 'cp_filter_dp', target: 'sp_filter_dp_high', rel: '发现异常' },
    { source: 'cp_magazine_home_sensor', target: 'sp_magazine_home_fail', rel: '发现异常' },
    { source: 'cp_arm_air_pressure', target: 'sp_arm_clamp_unstable', rel: '发现异常' },
    { source: 'sp_temp_above_65', target: 'comp_spindle_unit', rel: '定位部件' },
    { source: 'sp_bpfo_peak', target: 'comp_spindle_unit', rel: '定位部件' },
    { source: 'sp_return_oil_dark', target: 'comp_spindle_unit', rel: '定位部件' },
    { source: 'sp_repeatability_over', target: 'comp_ball_screw', rel: '定位部件' },
    { source: 'sp_following_error', target: 'comp_servo_drive', rel: '定位部件' },
    { source: 'sp_pressure_below', target: 'comp_hyd_station', rel: '定位部件' },
    { source: 'sp_filter_dp_high', target: 'comp_hyd_station', rel: '定位部件' },
    { source: 'sp_magazine_home_fail', target: 'comp_tool_magazine', rel: '定位部件' },
    { source: 'sp_arm_clamp_unstable', target: 'comp_robot_arm', rel: '定位部件' },
    { source: 'sp_temp_above_65', target: 'cause_lube_shortage', rel: '原因归因' },
    { source: 'sp_bpfo_peak', target: 'cause_bearing_spall', rel: '原因归因' },
    { source: 'sp_return_oil_dark', target: 'cause_lube_shortage', rel: '原因归因' },
    { source: 'sp_repeatability_over', target: 'cause_screw_wear', rel: '原因归因' },
    { source: 'sp_following_error', target: 'cause_encoder_drift', rel: '原因归因' },
    { source: 'sp_pressure_below', target: 'cause_hyd_pump_leak', rel: '原因归因' },
    { source: 'sp_filter_dp_high', target: 'cause_filter_blocked', rel: '原因归因' },
    { source: 'sp_magazine_home_fail', target: 'cause_home_switch_shift', rel: '原因归因' },
    { source: 'sp_arm_clamp_unstable', target: 'cause_air_pressure_drop', rel: '原因归因' },
    { source: 'cause_lube_shortage', target: 'sol_regrease_spindle', rel: '推荐方案' },
    { source: 'cause_bearing_spall', target: 'sol_replace_bearing', rel: '推荐方案' },
    { source: 'cause_screw_wear', target: 'sol_adjust_screw', rel: '推荐方案' },
    { source: 'cause_encoder_drift', target: 'sol_calibrate_encoder', rel: '推荐方案' },
    { source: 'cause_hyd_pump_leak', target: 'sol_overhaul_pump', rel: '推荐方案' },
    { source: 'cause_filter_blocked', target: 'sol_replace_filter', rel: '推荐方案' },
    { source: 'cause_home_switch_shift', target: 'sol_reset_home_switch', rel: '推荐方案' },
    { source: 'cause_air_pressure_drop', target: 'sol_restore_air_pressure', rel: '推荐方案' },
    { source: 'param_spindle_temp', target: 'cp_spindle_temp_trend', rel: '参数支撑' },
    { source: 'param_spindle_vibration', target: 'cp_vibration_spectrum', rel: '参数支撑' },
    { source: 'param_return_oil_cleanliness', target: 'cp_lube_return', rel: '参数支撑' },
    { source: 'param_axis_repeatability', target: 'cp_backlash', rel: '参数支撑' },
    { source: 'param_hyd_pressure', target: 'cp_hyd_pressure_curve', rel: '参数支撑' },
    { source: 'param_home_signal', target: 'cp_magazine_home_sensor', rel: '参数支撑' },
    { source: 'param_arm_air_pressure', target: 'cp_arm_air_pressure', rel: '参数支撑' },
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
      summary: `基于设备故障知识图谱分析，${payload.deviceName} 当前出现的 ${phen?.label ?? '异常'} 与关键部件失效链路高度相关，建议按标准排查顺序执行检查。`,
      root_causes: ['部件磨损超限', '润滑或压力基准失效', '反馈链路漂移'],
      checkpoints: [
        { step: 1, checkpoint: '检查关键参数趋势', method: '监控系统读取', expected: '处于额定范围内' },
        { step: 2, checkpoint: '检查关键部件状态', method: '现场巡检/拆检', expected: '无异常磨损、变色或松动' },
        { step: 3, checkpoint: '检查作业与维保记录', method: '查看台账', expected: '维保周期闭环执行' },
      ],
      solutions: [
        {
          title: '标准化检修处置',
          steps: '停机挂牌→参数复核→部件拆检→修复或更换→重新装配→空载与负载验证',
          estimated_time: '4-8小时',
          risk_level: '中',
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
