import type {
  Phenomenon,
  PhenomenonDetail,
  DiagnosisPayload,
  DiagnosisRecord,
} from '../types/diagnosis'
import type { GraphData } from '../types/graph'

import { delay, rand } from './mockConfig'

/* ---------- Mock Data（基于 A型激光切割机 故障知识图谱） ---------- */

const MOCK_PHENOMENA: Phenomenon[] = [
  { id: 'phen_w_limit', label: 'W轴限位报警', properties: { category: '运动控制故障', frequency: 'COMMON', code: 'ALM-W-001' } },
  { id: 'phen_no_laser', label: '激光无输出', properties: { category: '激光系统故障', frequency: 'COMMON', code: 'ALM-L-001' } },
  { id: 'phen_poor_cut', label: '切割质量差', properties: { category: '工艺质量故障', frequency: 'COMMON', code: 'ALM-Q-001' } },
  { id: 'phen_no_start', label: '设备无法启动', properties: { category: '系统启动故障', frequency: 'OCCASIONAL', code: 'ALM-S-001' } },
]

const SUB_PHENOMENA: Record<string, { id: string; label: string }[]> = {
  'phen_w_limit': [
    { id: 'sp_w_boot_alarm', label: '开机就报W轴限位' },
    { id: 'sp_w_run_alarm', label: '运行中W轴限位' },
    { id: 'sp_io_no_purple', label: 'IO点位无紫色背景色' },
    { id: 'sp_w_over_range', label: 'W轴超出调焦范围' },
    { id: 'sp_focus_over', label: '焦点参数超出范围' },
  ],
  'phen_no_laser': [
    { id: 'sp_laser_sw_off', label: '激光器开关未开启' },
    { id: 'sp_laser_weak', label: '激光功率不足' },
    { id: 'sp_optical_fault', label: '光路故障' },
  ],
  'phen_poor_cut': [
    { id: 'sp_cut_rough', label: '切割面粗糙' },
    { id: 'sp_cut_through_fail', label: '切不透材料' },
  ],
  'phen_no_start': [
    { id: 'sp_machine_no_resp', label: '设备无响应' },
    { id: 'sp_init_fail', label: '系统初始化失败' },
  ],
}

let recordIdSeq = 100

const MOCK_RECORDS: DiagnosisRecord[] = [
  {
    id: 1, deviceId: 2001, deviceName: 'A型激光切割机', deviceType: '激光切割设备',
    symptoms: 'W轴限位报警,开机就报W轴限位', description: '设备开机后立即触发W轴限位报警，检查IO界面发现W正限位/W负限位点位背景色不为紫色',
    severity: 'HIGH', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: 'W轴限位报警', fault_type: '运动控制故障', confidence: '95%', urgency: '高',
      summary: 'W轴限位IO点位的常闭/常开状态配置与实际接线不符，导致开机即报警。需修改IO点位常闭常开状态后保存。',
      root_causes: ['IO点位常闭常开状态错误', '焦点参数超出调焦范围'],
      checkpoints: [
        { step: 1, checkpoint: '检查IO点位背景色', method: '查看控制软件IO监控界面', expected: '紫色背景色' },
        { step: 2, checkpoint: '检查W轴当前位置', method: '查看轴状态界面', expected: '在调焦范围内' },
        { step: 3, checkpoint: '检查焦点参数设置', method: '查看工艺参数配置', expected: '焦点值在合理范围内' },
      ],
      solutions: [
        { title: '修改IO点位常闭常开状态', steps: '1.打开控制软件IO配置界面;2.找到W正限位和W负限位对应的IO点位;3.将点位状态从常开改为常闭;4.保存配置并重启', estimated_time: '5分钟', risk_level: '低' },
        { title: '调整焦点参数', steps: '1.打开工艺参数配置;2.找到焦点参数;3.将焦点值调整到调焦范围内;4.保存并测试', estimated_time: '10分钟', risk_level: '低' },
      ],
    }),
    reportedAt: '2025-03-08T14:30:00.000Z',
  },
  {
    id: 2, deviceId: 2001, deviceName: 'A型激光切割机', deviceType: '激光切割设备',
    symptoms: '激光无输出,激光器开关未开启', description: '操作员反馈按下切割启动后无激光输出，检查发现激光器控制面板电源指示灯未亮',
    severity: 'MEDIUM', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '激光无输出', fault_type: '激光系统故障', confidence: '98%', urgency: '中',
      summary: '激光器电源开关或使能开关处于关闭状态，需确认并开启相关开关。',
      root_causes: ['激光器开关处于关闭状态'],
      checkpoints: [
        { step: 1, checkpoint: '检查激光器开关状态', method: '查看激光器控制面板或软件开关状态', expected: '开关处于ON状态' },
        { step: 2, checkpoint: '检查激光控制信号', method: '查看信号配置和通信状态', expected: '信号正常连通' },
        { step: 3, checkpoint: '检查激光功率参数', method: '查看工艺参数中的功率设置', expected: '功率大于等于材料所需最低切割功率' },
        { step: 4, checkpoint: '检查光路准直状态', method: '目视检查或使用光路检测工具', expected: '光路清洁无偏移' },
      ],
      solutions: [
        { title: '开启激光器开关', steps: '1.检查激光器控制面板上的电源开关;2.确认钥匙开关处于ON位置;3.开启软件中的激光使能;4.等待激光器初始化完成', estimated_time: '3分钟', risk_level: '低' },
      ],
    }),
    reportedAt: '2025-03-07T09:15:00.000Z',
  },
  {
    id: 3, deviceId: 2001, deviceName: 'A型激光切割机', deviceType: '激光切割设备',
    symptoms: '切割面粗糙,切不透材料', description: '切割10mm碳钢板时发现切割面粗糙度超标，部分区域未完全切透',
    severity: 'HIGH', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '切割质量差', fault_type: '工艺质量故障', confidence: '88%', urgency: '高',
      summary: '切割速度过快且焦点位置偏离最优切割位置，导致切割质量不达标。需降低切割速度并重新校准焦点位置。',
      root_causes: ['切割速度过快', '焦点位置设置不当', '光路污染或偏移'],
      checkpoints: [
        { step: 1, checkpoint: '检查切割速度参数', method: '查看工艺参数', expected: '速度在材料工艺手册推荐范围内' },
        { step: 2, checkpoint: '检查焦点位置设置', method: '查看切割头焦点位置参数', expected: '焦点位置符合材料工艺要求' },
        { step: 3, checkpoint: '检查激光功率参数', method: '查看工艺参数中的功率设置', expected: '功率大于等于材料所需最低切割功率' },
        { step: 4, checkpoint: '检查光路准直状态', method: '目视检查或使用光路检测工具', expected: '光路清洁无偏移' },
      ],
      solutions: [
        { title: '降低切割速度', steps: '1.参考材料工艺手册的速度建议;2.打开工艺参数配置;3.降低切割速度20-30%;4.进行试切验证', estimated_time: '10分钟', risk_level: '低' },
        { title: '重新设置焦点位置', steps: '1.使用焦点测量工具;2.测量当前材料的最优焦点位置;3.在参数中更新焦点位置值;4.验证切割效果', estimated_time: '20分钟', risk_level: '低' },
        { title: '清洁并校准光路', steps: '1.关闭激光器电源;2.按规范拆下切割头;3.用专用清洁工具清洁镜片;4.重新安装并校准准直;5.测试切割效果', estimated_time: '60分钟', risk_level: '中' },
      ],
    }),
    reportedAt: '2025-03-06T16:45:00.000Z',
  },
  {
    id: 4, deviceId: 2001, deviceName: 'A型激光切割机', deviceType: '激光切割设备',
    symptoms: '设备无响应,系统初始化失败', description: '设备上电后按启动按钮无反应，控制系统无法完成初始化',
    severity: 'HIGH', status: 'COMPLETED',
    diagnosisResult: JSON.stringify({
      phenomenon: '设备无法启动', fault_type: '系统启动故障', confidence: '90%', urgency: '高',
      summary: '急停按钮被激活导致设备无响应，同时电源模块需要检查。复位急停按钮后设备可恢复启动。',
      root_causes: ['急停按钮被激活', '电源模块故障'],
      checkpoints: [
        { step: 1, checkpoint: '检查急停按钮状态', method: '目视检查急停按钮，确认均已弹起复位', expected: '急停按钮已复位' },
        { step: 2, checkpoint: '检查电源供应状态', method: '查看电源指示灯和电压表', expected: '电源电压在额定范围内' },
        { step: 3, checkpoint: '检查系统日志', method: '查看控制系统日志界面', expected: '日志中无致命错误' },
      ],
      solutions: [
        { title: '复位急停按钮', steps: '1.检查设备上所有急停按钮位置;2.顺时针旋转解锁急停按钮;3.在控制软件中清除急停报警;4.重新启动设备', estimated_time: '3分钟', risk_level: '低' },
        { title: '检修电源模块', steps: '1.断开设备总电源;2.检查电源模块指示灯和熔断器;3.更换故障熔断器或电源模块;4.上电测试', estimated_time: '120分钟', risk_level: '高' },
      ],
    }),
    reportedAt: '2025-03-05T11:20:00.000Z',
  },
]

/* ---------- 故障知识图谱（A型激光切割机完整图谱） ---------- */

const MOCK_GRAPH: GraphData = {
  nodes: [
    // Equipment
    { id: 'equip_laser_a', type: 'Equipment', label: 'A型激光切割机' },
    // Phenomenon
    { id: 'phen_w_limit', type: 'Phenomenon', label: 'W轴限位报警' },
    { id: 'phen_no_laser', type: 'Phenomenon', label: '激光无输出' },
    { id: 'phen_poor_cut', type: 'Phenomenon', label: '切割质量差' },
    { id: 'phen_no_start', type: 'Phenomenon', label: '设备无法启动' },
    // SubPhenomenon
    { id: 'sp_w_boot_alarm', type: 'SubPhenomenon', label: '开机就报W轴限位' },
    { id: 'sp_w_run_alarm', type: 'SubPhenomenon', label: '运行中W轴限位' },
    { id: 'sp_io_no_purple', type: 'SubPhenomenon', label: 'IO点位无紫色背景色' },
    { id: 'sp_w_over_range', type: 'SubPhenomenon', label: 'W轴超出调焦范围' },
    { id: 'sp_focus_over', type: 'SubPhenomenon', label: '焦点参数超出范围' },
    { id: 'sp_laser_sw_off', type: 'SubPhenomenon', label: '激光器开关未开启' },
    { id: 'sp_laser_weak', type: 'SubPhenomenon', label: '激光功率不足' },
    { id: 'sp_optical_fault', type: 'SubPhenomenon', label: '光路故障' },
    { id: 'sp_cut_rough', type: 'SubPhenomenon', label: '切割面粗糙' },
    { id: 'sp_cut_through_fail', type: 'SubPhenomenon', label: '切不透材料' },
    { id: 'sp_machine_no_resp', type: 'SubPhenomenon', label: '设备无响应' },
    { id: 'sp_init_fail', type: 'SubPhenomenon', label: '系统初始化失败' },
    // Checkpoint
    { id: 'cp_io_bg_color', type: 'Checkpoint', label: '检查IO点位背景色' },
    { id: 'cp_w_position', type: 'Checkpoint', label: '检查W轴当前位置' },
    { id: 'cp_focus_value', type: 'Checkpoint', label: '检查焦点参数设置' },
    { id: 'cp_laser_power_sw', type: 'Checkpoint', label: '检查激光器开关状态' },
    { id: 'cp_laser_ctrl_signal', type: 'Checkpoint', label: '检查激光控制信号' },
    { id: 'cp_laser_power_val', type: 'Checkpoint', label: '检查激光功率参数' },
    { id: 'cp_optical_align', type: 'Checkpoint', label: '检查光路准直状态' },
    { id: 'cp_cut_speed', type: 'Checkpoint', label: '检查切割速度参数' },
    { id: 'cp_focus_position', type: 'Checkpoint', label: '检查焦点位置设置' },
    { id: 'cp_estop_btn', type: 'Checkpoint', label: '检查急停按钮状态' },
    { id: 'cp_power_supply', type: 'Checkpoint', label: '检查电源供应状态' },
    { id: 'cp_system_log', type: 'Checkpoint', label: '检查系统日志' },
    // Cause
    { id: 'cause_io_state_error', type: 'Cause', label: 'IO点位常闭常开状态错误' },
    { id: 'cause_focus_out_range', type: 'Cause', label: '焦点参数超出调焦范围' },
    { id: 'cause_w_mech_limit', type: 'Cause', label: 'W轴到达机械限位' },
    { id: 'cause_laser_sw_off', type: 'Cause', label: '激光器开关处于关闭状态' },
    { id: 'cause_laser_signal_cfg', type: 'Cause', label: '激光控制信号配置错误' },
    { id: 'cause_laser_power_low', type: 'Cause', label: '激光功率设置过低' },
    { id: 'cause_optical_dirty', type: 'Cause', label: '光路污染或偏移' },
    { id: 'cause_speed_too_fast', type: 'Cause', label: '切割速度过快' },
    { id: 'cause_focus_misset', type: 'Cause', label: '焦点位置设置不当' },
    { id: 'cause_estop_active', type: 'Cause', label: '急停按钮被激活' },
    { id: 'cause_power_module_fault', type: 'Cause', label: '电源模块故障' },
    // Solution
    { id: 'sol_fix_io_state', type: 'Solution', label: '修改IO点位常闭常开状态' },
    { id: 'sol_adjust_focus', type: 'Solution', label: '调整焦点参数' },
    { id: 'sol_move_w_manual', type: 'Solution', label: '手动回零W轴' },
    { id: 'sol_turn_on_laser', type: 'Solution', label: '开启激光器开关' },
    { id: 'sol_recfg_laser_signal', type: 'Solution', label: '重新配置激光控制信号' },
    { id: 'sol_increase_power', type: 'Solution', label: '提高激光功率参数' },
    { id: 'sol_clean_optical', type: 'Solution', label: '清洁并校准光路' },
    { id: 'sol_reduce_speed', type: 'Solution', label: '降低切割速度' },
    { id: 'sol_reset_focus_pos', type: 'Solution', label: '重新设置焦点位置' },
    { id: 'sol_release_estop', type: 'Solution', label: '复位急停按钮' },
    { id: 'sol_fix_power_module', type: 'Solution', label: '检修电源模块' },
    // Component
    { id: 'comp_io_ctrl', type: 'Component', label: 'IO控制模块' },
    { id: 'comp_w_limit_sw', type: 'Component', label: 'W轴限位开关' },
    { id: 'comp_laser_source', type: 'Component', label: '激光器' },
    { id: 'comp_optical_path', type: 'Component', label: '光路系统' },
    { id: 'comp_cutting_head', type: 'Component', label: '切割头' },
    { id: 'comp_main_ctrl', type: 'Component', label: '主控系统' },
    { id: 'comp_power_module', type: 'Component', label: '电源模块' },
    { id: 'comp_w_axis_mech', type: 'Component', label: 'W轴机械结构' },
    // Parameter
    { id: 'param_io_bg_color', type: 'Parameter', label: 'IO点位背景色' },
    { id: 'param_w_axis_pos', type: 'Parameter', label: 'W轴当前位置' },
    { id: 'param_focus_val', type: 'Parameter', label: '焦点参数值' },
    { id: 'param_laser_power', type: 'Parameter', label: '激光功率' },
    { id: 'param_cut_speed', type: 'Parameter', label: '切割速度' },
    { id: 'param_estop_state', type: 'Parameter', label: '急停状态' },
  ],
  links: [
    // prone_to: 设备 → 故障现象
    { source: 'equip_laser_a', target: 'phen_w_limit', rel: '易发故障' },
    { source: 'equip_laser_a', target: 'phen_no_laser', rel: '易发故障' },
    { source: 'equip_laser_a', target: 'phen_poor_cut', rel: '易发故障' },
    { source: 'equip_laser_a', target: 'phen_no_start', rel: '易发故障' },
    // contains: 现象 → 子现象
    { source: 'phen_w_limit', target: 'sp_w_boot_alarm', rel: '包含' },
    { source: 'phen_w_limit', target: 'sp_w_run_alarm', rel: '包含' },
    { source: 'sp_w_boot_alarm', target: 'sp_io_no_purple', rel: '包含' },
    { source: 'sp_w_boot_alarm', target: 'sp_focus_over', rel: '包含' },
    { source: 'sp_w_run_alarm', target: 'sp_w_over_range', rel: '包含' },
    { source: 'phen_no_laser', target: 'sp_laser_sw_off', rel: '包含' },
    { source: 'phen_no_laser', target: 'sp_laser_weak', rel: '包含' },
    { source: 'phen_no_laser', target: 'sp_optical_fault', rel: '包含' },
    { source: 'phen_poor_cut', target: 'sp_cut_rough', rel: '包含' },
    { source: 'phen_poor_cut', target: 'sp_cut_through_fail', rel: '包含' },
    { source: 'phen_no_start', target: 'sp_machine_no_resp', rel: '包含' },
    { source: 'phen_no_start', target: 'sp_init_fail', rel: '包含' },
    // needs_check: 现象/子现象 → 检查点
    { source: 'phen_w_limit', target: 'cp_io_bg_color', rel: '需要检查' },
    { source: 'phen_w_limit', target: 'cp_w_position', rel: '需要检查' },
    { source: 'phen_w_limit', target: 'cp_focus_value', rel: '需要检查' },
    { source: 'sp_w_boot_alarm', target: 'cp_io_bg_color', rel: '需要检查' },
    { source: 'sp_w_boot_alarm', target: 'cp_focus_value', rel: '需要检查' },
    { source: 'sp_w_run_alarm', target: 'cp_w_position', rel: '需要检查' },
    { source: 'sp_io_no_purple', target: 'cp_io_bg_color', rel: '需要检查' },
    { source: 'sp_focus_over', target: 'cp_focus_value', rel: '需要检查' },
    { source: 'phen_no_laser', target: 'cp_laser_power_sw', rel: '需要检查' },
    { source: 'phen_no_laser', target: 'cp_laser_ctrl_signal', rel: '需要检查' },
    { source: 'phen_no_laser', target: 'cp_laser_power_val', rel: '需要检查' },
    { source: 'phen_no_laser', target: 'cp_optical_align', rel: '需要检查' },
    { source: 'phen_poor_cut', target: 'cp_cut_speed', rel: '需要检查' },
    { source: 'phen_poor_cut', target: 'cp_focus_position', rel: '需要检查' },
    { source: 'phen_poor_cut', target: 'cp_laser_power_val', rel: '需要检查' },
    { source: 'phen_poor_cut', target: 'cp_optical_align', rel: '需要检查' },
    { source: 'phen_no_start', target: 'cp_estop_btn', rel: '需要检查' },
    { source: 'phen_no_start', target: 'cp_power_supply', rel: '需要检查' },
    { source: 'phen_no_start', target: 'cp_system_log', rel: '需要检查' },
    // discovers: 检查点 → 子现象
    { source: 'cp_io_bg_color', target: 'sp_io_no_purple', rel: '发现异常' },
    { source: 'cp_w_position', target: 'sp_w_over_range', rel: '发现异常' },
    { source: 'cp_focus_value', target: 'sp_focus_over', rel: '发现异常' },
    { source: 'cp_laser_power_sw', target: 'sp_laser_sw_off', rel: '发现异常' },
    { source: 'cp_laser_power_val', target: 'sp_laser_weak', rel: '发现异常' },
    { source: 'cp_optical_align', target: 'sp_optical_fault', rel: '发现异常' },
    { source: 'cp_cut_speed', target: 'sp_cut_rough', rel: '发现异常' },
    { source: 'cp_cut_speed', target: 'sp_cut_through_fail', rel: '发现异常' },
    { source: 'cp_focus_position', target: 'sp_cut_rough', rel: '发现异常' },
    { source: 'cp_estop_btn', target: 'sp_machine_no_resp', rel: '发现异常' },
    { source: 'cp_power_supply', target: 'sp_init_fail', rel: '发现异常' },
    // located_at: 子现象/检查点 → 部件
    { source: 'sp_io_no_purple', target: 'comp_io_ctrl', rel: '定位部件' },
    { source: 'sp_w_over_range', target: 'comp_w_axis_mech', rel: '定位部件' },
    { source: 'sp_focus_over', target: 'comp_w_axis_mech', rel: '定位部件' },
    { source: 'sp_laser_sw_off', target: 'comp_laser_source', rel: '定位部件' },
    { source: 'sp_laser_weak', target: 'comp_laser_source', rel: '定位部件' },
    { source: 'sp_optical_fault', target: 'comp_optical_path', rel: '定位部件' },
    { source: 'sp_cut_rough', target: 'comp_cutting_head', rel: '定位部件' },
    { source: 'sp_cut_through_fail', target: 'comp_cutting_head', rel: '定位部件' },
    { source: 'sp_machine_no_resp', target: 'comp_main_ctrl', rel: '定位部件' },
    { source: 'sp_init_fail', target: 'comp_power_module', rel: '定位部件' },
    { source: 'cp_io_bg_color', target: 'comp_io_ctrl', rel: '定位部件' },
    { source: 'cp_w_position', target: 'comp_w_axis_mech', rel: '定位部件' },
    { source: 'cp_laser_power_sw', target: 'comp_laser_source', rel: '定位部件' },
    { source: 'cp_optical_align', target: 'comp_optical_path', rel: '定位部件' },
    { source: 'cp_cut_speed', target: 'comp_cutting_head', rel: '定位部件' },
    { source: 'cp_focus_position', target: 'comp_cutting_head', rel: '定位部件' },
    { source: 'cp_estop_btn', target: 'comp_main_ctrl', rel: '定位部件' },
    { source: 'cp_power_supply', target: 'comp_power_module', rel: '定位部件' },
    // caused_by: 子现象 → 原因
    { source: 'sp_io_no_purple', target: 'cause_io_state_error', rel: '原因归因' },
    { source: 'sp_focus_over', target: 'cause_focus_out_range', rel: '原因归因' },
    { source: 'sp_w_over_range', target: 'cause_w_mech_limit', rel: '原因归因' },
    { source: 'sp_laser_sw_off', target: 'cause_laser_sw_off', rel: '原因归因' },
    { source: 'sp_laser_weak', target: 'cause_laser_power_low', rel: '原因归因' },
    { source: 'sp_optical_fault', target: 'cause_optical_dirty', rel: '原因归因' },
    { source: 'sp_cut_rough', target: 'cause_speed_too_fast', rel: '原因归因' },
    { source: 'sp_cut_rough', target: 'cause_focus_misset', rel: '原因归因' },
    { source: 'sp_cut_through_fail', target: 'cause_speed_too_fast', rel: '原因归因' },
    { source: 'sp_cut_through_fail', target: 'cause_laser_power_low', rel: '原因归因' },
    { source: 'sp_machine_no_resp', target: 'cause_estop_active', rel: '原因归因' },
    { source: 'sp_init_fail', target: 'cause_power_module_fault', rel: '原因归因' },
    // solved_by: 原因/子现象 → 方案
    { source: 'cause_io_state_error', target: 'sol_fix_io_state', rel: '推荐方案' },
    { source: 'cause_focus_out_range', target: 'sol_adjust_focus', rel: '推荐方案' },
    { source: 'cause_w_mech_limit', target: 'sol_move_w_manual', rel: '推荐方案' },
    { source: 'cause_laser_sw_off', target: 'sol_turn_on_laser', rel: '推荐方案' },
    { source: 'cause_laser_signal_cfg', target: 'sol_recfg_laser_signal', rel: '推荐方案' },
    { source: 'cause_laser_power_low', target: 'sol_increase_power', rel: '推荐方案' },
    { source: 'cause_optical_dirty', target: 'sol_clean_optical', rel: '推荐方案' },
    { source: 'cause_speed_too_fast', target: 'sol_reduce_speed', rel: '推荐方案' },
    { source: 'cause_focus_misset', target: 'sol_reset_focus_pos', rel: '推荐方案' },
    { source: 'cause_estop_active', target: 'sol_release_estop', rel: '推荐方案' },
    { source: 'cause_power_module_fault', target: 'sol_fix_power_module', rel: '推荐方案' },
    { source: 'sp_io_no_purple', target: 'sol_fix_io_state', rel: '推荐方案' },
    { source: 'sp_focus_over', target: 'sol_adjust_focus', rel: '推荐方案' },
    { source: 'sp_laser_sw_off', target: 'sol_turn_on_laser', rel: '推荐方案' },
    { source: 'sp_cut_rough', target: 'sol_reduce_speed', rel: '推荐方案' },
    { source: 'sp_cut_rough', target: 'sol_reset_focus_pos', rel: '推荐方案' },
    { source: 'sp_machine_no_resp', target: 'sol_release_estop', rel: '推荐方案' },
    // supports: 参数 → 检查点
    { source: 'param_io_bg_color', target: 'cp_io_bg_color', rel: '参数支撑' },
    { source: 'param_w_axis_pos', target: 'cp_w_position', rel: '参数支撑' },
    { source: 'param_focus_val', target: 'cp_focus_value', rel: '参数支撑' },
    { source: 'param_laser_power', target: 'cp_laser_power_val', rel: '参数支撑' },
    { source: 'param_cut_speed', target: 'cp_cut_speed', rel: '参数支撑' },
    { source: 'param_estop_state', target: 'cp_estop_btn', rel: '参数支撑' },
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
