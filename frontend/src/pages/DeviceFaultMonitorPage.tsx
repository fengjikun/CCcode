import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Collapse,
  Descriptions,
  Divider,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  AlertOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  LoadingOutlined,
  RobotOutlined,
  SendOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { getAlerts, sendChatMessage, generateWorkOrder } from '../api/agent'
import type { DeviceAlert, ChatMessage, WorkOrder, SkillInfo } from '../api/agent'
import { getDigitalHuman, updateDigitalHuman } from '../api/digitalHuman'
import type { DigitalHuman } from '../types/digitalHuman'
import { listProjects } from '../api/projectManagement'
import type { ProjectSummary } from '../types/projectMvp'
import ModalHeader from '../components/shared/ModalHeader'

const { Text } = Typography

const SEVERITY_COLOR: Record<string, string> = { HIGH: 'red', MEDIUM: 'orange', LOW: 'blue' }
const SEVERITY_LABEL: Record<string, string> = { HIGH: '严重', MEDIUM: '警告', LOW: '提示' }
const STATUS_COLOR: Record<string, string> = { 故障: 'error', 警告: 'warning', 提示: 'default' }

// ---- 消息类型 ----
type MsgType = 'user' | 'skill-load' | 'steps' | 'assistant'

interface StepData {
  title: string
  content: string
  done: boolean
}

interface DisplayMessage {
  id: number
  type: MsgType
  // user / assistant
  content?: string
  // skill-load
  skill?: SkillInfo
  // steps
  steps?: StepData[]
  // assistant 是否正在流式输出
  streaming?: boolean
}

let _msgId = 0
const nid = () => ++_msgId

export default function DeviceFaultMonitorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [dh, setDh] = useState<DigitalHuman | null>(null)
  const [alerts, setAlerts] = useState<DeviceAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<DeviceAlert | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [workOrderLoading, setWorkOrderLoading] = useState(false)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [workOrderVisible, setWorkOrderVisible] = useState(false)

  // 用 ref 追踪正在流式写入的消息 id，避免闭包陈旧
  const streamingStepsId = useRef<number | null>(null)
  const streamingReplyId = useRef<number | null>(null)
  const isFollowUpRef = useRef(false)

  useEffect(() => {
    if (!id) return
    getDigitalHuman(id).then(found => {
      if (!found) { message.error('数字人不存在'); navigate('/digital-worker/business'); return }
      setDh(found)
      if (found.projectId) setSelectedProjectId(found.projectId)
    })
  }, [id, navigate])

  useEffect(() => {
    setAlertsLoading(true)
    getAlerts().then(setAlerts).catch(() => message.error('加载告警列表失败')).finally(() => setAlertsLoading(false))
    listProjects().then(setProjects).catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

  const handleProjectChange = (pid: string | null) => {
    setSelectedProjectId(pid)
    if (id) void updateDigitalHuman(id, { projectId: pid ?? undefined })
  }

  const handleSelectAlert = (alert: DeviceAlert) => {
    if (chatLoading) return
    setSelectedAlert(alert)
    const userContent =
      `我需要分析以下设备告警：\n` +
      `- 设备：${alert.deviceName}（${alert.deviceId}）\n` +
      `- 产线：${alert.productionLine}\n` +
      `- 故障类型：${alert.faultType}（代码：${alert.faultCode}）\n` +
      `- 严重程度：${SEVERITY_LABEL[alert.severity]}\n` +
      `- 描述：${alert.description}\n\n` +
      `请帮我分析故障原因并给出维修建议。`
    const userMsg: ChatMessage = { role: 'user', content: userContent }
    const nextApi = [userMsg]
    setApiMessages(nextApi)
    setDisplayMessages([{ id: nid(), type: 'user', content: userContent }])
    isFollowUpRef.current = false
    _doStream(nextApi, alert)
  }

  const handleSend = () => {
    const text = inputText.trim()
    if (!text || chatLoading) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const nextApi = [...apiMessages, userMsg]
    setApiMessages(nextApi)
    setDisplayMessages(prev => [...prev, { id: nid(), type: 'user', content: text }])
    setInputText('')
    isFollowUpRef.current = apiMessages.length > 0
    _doStream(nextApi, selectedAlert)
  }

  const _doStream = (msgs: ChatMessage[], device: DeviceAlert | null) => {
    setChatLoading(true)
    streamingStepsId.current = null
    streamingReplyId.current = null

    let replyAccum = ''

    sendChatMessage(msgs, selectedProjectId, device, dh?.type ?? null, {
      onSkillLoad: (skill) => {
        if (isFollowUpRef.current) return  // 追问时不显示 skill-load 气泡
        setDisplayMessages(prev => [...prev, { id: nid(), type: 'skill-load', skill }])
      },
      onStepStart: (title) => {
        // 如果还没有 steps 消息，新建一个
        if (streamingStepsId.current === null) {
          const sid = nid()
          streamingStepsId.current = sid
          setDisplayMessages(prev => [...prev, {
            id: sid, type: 'steps',
            steps: [{ title, content: '', done: false }],
          }])
        } else {
          // 追加新步骤
          setDisplayMessages(prev => prev.map(m =>
            m.id === streamingStepsId.current
              ? { ...m, steps: [...(m.steps ?? []), { title, content: '', done: false }] }
              : m
          ))
        }
      },
      onStepDelta: (_title, text) => {
        setDisplayMessages(prev => prev.map(m => {
          if (m.id !== streamingStepsId.current) return m
          const steps = [...(m.steps ?? [])]
          if (steps.length === 0) return m
          const last = { ...steps[steps.length - 1], content: steps[steps.length - 1].content + text }
          return { ...m, steps: [...steps.slice(0, -1), last] }
        }))
      },
      onStepEnd: (_title) => {
        setDisplayMessages(prev => prev.map(m => {
          if (m.id !== streamingStepsId.current) return m
          const steps = [...(m.steps ?? [])]
          if (steps.length === 0) return m
          const last = { ...steps[steps.length - 1], done: true }
          return { ...m, steps: [...steps.slice(0, -1), last] }
        }))
      },
      onReplyStart: () => {
        const rid = nid()
        streamingReplyId.current = rid
        setDisplayMessages(prev => [...prev, { id: rid, type: 'assistant', content: '', streaming: true }])
      },
      onReplyDelta: (text) => {
        replyAccum += text
        setDisplayMessages(prev => prev.map(m =>
          m.id === streamingReplyId.current ? { ...m, content: replyAccum } : m
        ))
      },
      onDone: () => {
        // 标记流式结束
        setDisplayMessages(prev => prev.map(m =>
          m.id === streamingReplyId.current ? { ...m, streaming: false } : m
        ))
        setApiMessages(prev => [...prev, { role: 'assistant', content: replyAccum }])
        setChatLoading(false)
      },
      onError: (msg) => {
        message.error(msg || 'AI 响应失败')
        setChatLoading(false)
      },
    }).catch(() => {
      message.error('AI 响应失败，请重试')
      setChatLoading(false)
    })
  }

  const handleGenerateWorkOrder = () => {
    if (!selectedAlert) { message.warning('请先选择一条告警'); return }
    setWorkOrderLoading(true)
    generateWorkOrder(apiMessages, selectedProjectId, selectedAlert)
      .then(wo => { setWorkOrder(wo); setWorkOrderVisible(true) })
      .catch(() => message.error('生成工单失败'))
      .finally(() => setWorkOrderLoading(false))
  }

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 面包屑 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/digital-worker/business')} size="small">
          数字员工列表
        </Button>
        <span style={{ color: '#d9d9d9' }}>/</span>
        <RobotOutlined style={{ color: '#fa8c16' }} />
        <Text strong>{dh?.name || '设备运维诊断'}</Text>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* ===== 左侧 ===== */}
        <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          <Card
            title={<span><AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />设备运行告警</span>}
            bodyStyle={{ padding: '8px 0', overflowY: 'auto', maxHeight: 360 }}
            size="small"
          >
            {alertsLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : alerts.length === 0 ? (
              <Empty description="暂无告警" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : alerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => handleSelectAlert(alert)}
                style={{
                  padding: '10px 16px', cursor: chatLoading ? 'not-allowed' : 'pointer',
                  borderLeft: `4px solid ${alert.severity === 'HIGH' ? '#ff4d4f' : alert.severity === 'MEDIUM' ? '#fa8c16' : '#1677ff'}`,
                  background: selectedAlert?.id === alert.id ? '#fff7e6' : undefined,
                  borderBottom: '1px solid #f0f0f0', opacity: chatLoading ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 14 }}>{alert.faultType}</Text>
                  <Badge status={STATUS_COLOR[alert.status] as any} text={alert.status} />
                </div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag color={SEVERITY_COLOR[alert.severity]} style={{ fontSize: 11, margin: 0 }}>{SEVERITY_LABEL[alert.severity]}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>{alert.deviceName}</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {new Date(alert.occurredAt).toLocaleString('zh-CN')}
                </Text>
              </div>
            ))}
          </Card>

          <Card
            title={<span><ToolOutlined style={{ marginRight: 8 }} />故障详情</span>}
            size="small" style={{ flex: 1 }} bodyStyle={{ overflowY: 'auto' }}
          >
            {selectedAlert ? (
              <Descriptions column={1} size="small" labelStyle={{ color: '#8c8c8c', fontSize: 12 }}>
                <Descriptions.Item label="设备ID">{selectedAlert.deviceId}</Descriptions.Item>
                <Descriptions.Item label="设备名称">{selectedAlert.deviceName}</Descriptions.Item>
                <Descriptions.Item label="产线">{selectedAlert.productionLine}</Descriptions.Item>
                <Descriptions.Item label="运行时长">{selectedAlert.runningHours} 小时</Descriptions.Item>
                <Descriptions.Item label="故障代码">{selectedAlert.faultCode}</Descriptions.Item>
                <Descriptions.Item label="故障类型">{selectedAlert.faultType}</Descriptions.Item>
                <Descriptions.Item label="严重程度">
                  <Tag color={SEVERITY_COLOR[selectedAlert.severity]}>{SEVERITY_LABEL[selectedAlert.severity]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="故障描述">
                  <Text style={{ fontSize: 12 }}>{selectedAlert.description}</Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="点击左侧告警查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </div>

        {/* ===== 右侧对话 ===== */}
        <Card
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
          bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', minHeight: 0 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span><RobotOutlined style={{ color: '#fa8c16', marginRight: 8 }} />AI 诊断助手</span>
              <Select
                placeholder="关联本体（可选）" style={{ width: 200 }} allowClear size="small"
                value={selectedProjectId} onChange={handleProjectChange}
                options={projects.map(p => ({ value: p.id, label: p.name }))}
              />
              <Button
                type="primary" icon={<FileTextOutlined />} size="small"
                loading={workOrderLoading} onClick={handleGenerateWorkOrder}
                disabled={displayMessages.length === 0} style={{ marginLeft: 'auto' }}
              >
                生成维修工单
              </Button>
            </div>
          }
        >
          {/* 消息列表 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayMessages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <Text type="secondary">点击左侧告警开始诊断分析，或直接输入问题</Text>
              </div>
            ) : displayMessages.map(msg => {
              // ---- 用户消息 ----
              if (msg.type === 'user') {
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px',
                      borderRadius: '12px 12px 4px 12px',
                      background: '#1677ff', color: '#fff', fontSize: 14, lineHeight: 1.6,
                    }}>
                      <Text style={{ color: '#fff', whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                    </div>
                  </div>
                )
              }

              // ---- Skill 加载气泡 ----
              if (msg.type === 'skill-load') {
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '6px 16px', borderRadius: 20,
                      background: '#fff7e6', border: '1px solid #ffd591',
                      display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13,
                    }}>
                      <ThunderboltOutlined style={{ color: '#fa8c16' }} />
                      <Text style={{ color: '#d46b08' }}>
                        已加载 Skill：<strong>{msg.skill!.name}</strong>
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>v{msg.skill!.version}</Text>
                    </div>
                  </div>
                )
              }

              // ---- 推理步骤 ----
              if (msg.type === 'steps' && msg.steps && msg.steps.length > 0) {
                const doneCount = msg.steps.filter(s => s.done).length
                const allDone = doneCount === msg.steps.length
                return (
                  <div key={msg.id} style={{ maxWidth: '88%' }}>
                    <Collapse
                      size="small"
                      defaultActiveKey={['1']}
                      style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8 }}
                      items={[{
                        key: '1',
                        label: (
                          <span style={{ fontSize: 13, color: '#595959' }}>
                            {allDone
                              ? <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                              : <LoadingOutlined style={{ color: '#722ed1', marginRight: 6 }} />
                            }
                            推理过程（{doneCount}/{msg.steps.length} 步完成）
                          </span>
                        ),
                        children: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {msg.steps.map((step, i) => (
                              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{
                                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                                  background: step.done ? '#52c41a' : '#722ed1',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontSize: 11,
                                }}>
                                  {step.done ? <CheckCircleOutlined style={{ fontSize: 12 }} /> : i + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Text strong style={{ fontSize: 13 }}>{step.title}</Text>
                                  {!step.done && step.content === '' && (
                                    <span style={{ marginLeft: 8 }}><LoadingOutlined style={{ fontSize: 11, color: '#722ed1' }} /></span>
                                  )}
                                  <div style={{ fontSize: 13, color: '#595959', marginTop: 2, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {step.content}
                                    {!step.done && step.content !== '' && (
                                      <span style={{ display: 'inline-block', width: 2, height: 14, background: '#722ed1', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ),
                      }]}
                    />
                  </div>
                )
              }

              // ---- 最终回答 ----
              if (msg.type === 'assistant') {
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      maxWidth: '88%', padding: '12px 16px',
                      borderRadius: '12px 12px 12px 4px',
                      background: '#f5f5f5', fontSize: 14, lineHeight: 1.7,
                    }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.7 }}>
                        {msg.content}
                        {msg.streaming && (
                          <span style={{ display: 'inline-block', width: 2, height: 16, background: '#1677ff', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
                        )}
                      </pre>
                    </div>
                  </div>
                )
              }

              return null
            })}

            {/* 整体加载中（等待第一个 SSE 事件前） */}
            {chatLoading && displayMessages.length > 0 && (() => {
              const last = displayMessages[displayMessages.length - 1]
              return last.type === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '10px 16px', background: '#f5f5f5', borderRadius: '12px 12px 12px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LoadingOutlined style={{ color: '#722ed1' }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {isFollowUpRef.current ? '正在思考...' : '正在加载 Skill 并推理...'}
                    </Text>
                  </div>
                </div>
              ) : null
            })()}

            <div ref={messagesEndRef} />
          </div>

          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Input.TextArea
              placeholder="输入问题，按 Ctrl+Enter 发送..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSend() } }}
              autoSize={{ minRows: 2, maxRows: 5 }}
              style={{ flex: 1 }}
              disabled={chatLoading}
            />
            <Button
              type="primary" icon={<SendOutlined />}
              onClick={handleSend} loading={chatLoading}
              disabled={!inputText.trim()}
            >
              发送
            </Button>
          </div>
        </Card>
      </div>

      {/* 维修工单 Modal */}
      <Modal
        title={<ModalHeader icon={<FileTextOutlined />} title={`维修工单 — ${workOrder?.workOrderId || ''}`} />}
        open={workOrderVisible}
        onCancel={() => setWorkOrderVisible(false)}
        footer={[<Button key="close" onClick={() => setWorkOrderVisible(false)}>关闭</Button>]}
        width={640}
        destroyOnClose
      >
        {workOrder && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="工单号" span={2}><Text strong>{workOrder.workOrderId}</Text></Descriptions.Item>
            <Descriptions.Item label="设备ID">{workOrder.deviceId}</Descriptions.Item>
            <Descriptions.Item label="设备名称">{workOrder.deviceName}</Descriptions.Item>
            <Descriptions.Item label="产线">{workOrder.productionLine}</Descriptions.Item>
            <Descriptions.Item label="严重程度">
              <Tag color={SEVERITY_COLOR[workOrder.severity] || 'default'}>{SEVERITY_LABEL[workOrder.severity] || workOrder.severity}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="故障类型" span={2}>{workOrder.faultType}</Descriptions.Item>
            <Descriptions.Item label="故障描述" span={2}>{workOrder.faultDescription}</Descriptions.Item>
            <Descriptions.Item label="预计工时" span={2}>{workOrder.estimatedDuration}</Descriptions.Item>
            <Descriptions.Item label="所需工具" span={2}>
              {workOrder.requiredTools?.map((t, i) => <Tag key={i}>{t}</Tag>)}
            </Descriptions.Item>
            <Descriptions.Item label="维修步骤" span={2}>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {workOrder.suggestedRepairSteps?.map((step, i) => (
                  <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>{step}</li>
                ))}
              </ol>
            </Descriptions.Item>
            <Descriptions.Item label="安全注意事项" span={2}>
              <Text type="warning">{workOrder.safetyNotes}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {new Date(workOrder.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {workOrder.note && (
              <Descriptions.Item label="备注" span={2}>
                <Text type="secondary" style={{ fontSize: 12 }}>{workOrder.note}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
