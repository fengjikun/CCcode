import { useState, useMemo, useCallback } from 'react'
import { List, Tag, Badge, Modal, Typography, Descriptions, Space, Empty } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import type { DiagnosisRecord, DiagnosisResult as DiagnosisResultType } from '../../types/diagnosis'
import DiagnosisResult from './DiagnosisResult'

const { Text } = Typography

interface FaultRecordListProps {
  records: DiagnosisRecord[]
  loading?: boolean
}

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待处理' },
  ANALYZING: { color: 'processing', text: '分析中' },
  COMPLETED: { color: 'success', text: '已完成' },
  FAILED: { color: 'error', text: '失败' },
}

const severityMap: Record<string, { color: string; text: string }> = {
  LOW: { color: 'blue', text: '低' },
  MEDIUM: { color: 'orange', text: '中' },
  HIGH: { color: 'red', text: '高' },
  CRITICAL: { color: 'magenta', text: '紧急' },
}

export default function FaultRecordList({ records, loading }: FaultRecordListProps) {
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null)

  const handleClose = useCallback(() => setSelectedRecord(null), [])

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()),
    [records],
  )

  const parseResult = useCallback((raw: string): DiagnosisResultType | null => {
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [])

  return (
    <>
      <List
        loading={loading}
        dataSource={sortedRecords}
        locale={{ emptyText: <Empty description="暂无诊断记录" /> }}
        renderItem={(record) => {
          const st = statusMap[record.status] ?? { color: 'default', text: record.status }
          const sev = severityMap[record.severity] ?? { color: 'default', text: record.severity }
          const parsed = parseResult(record.diagnosisResult)

          return (
            <List.Item
              style={{ cursor: 'pointer', padding: '12px 16px' }}
              onClick={() => setSelectedRecord(record)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{record.deviceName}</Text>
                    <Badge status={st.color as any} text={st.text} />
                    {record.deviceType && <Tag>{record.deviceType}</Tag>}
                    <Tag color={sev.color}>{sev.text}</Tag>
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {new Date(record.reportedAt).toLocaleString('zh-CN')}
                    </Text>
                    {record.symptoms && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          症状: {record.symptoms}
                        </Text>
                      </div>
                    )}
                    {parsed?.phenomenon && (
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          诊断: {parsed.phenomenon}
                          {parsed.confidence && ` (置信度: ${parsed.confidence})`}
                        </Text>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )
        }}
      />

      <Modal
        open={!!selectedRecord}
        onCancel={handleClose}
        footer={null}
        width={720}
        destroyOnClose
        title="诊断记录详情"
      >
        {selectedRecord && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="设备名称">{selectedRecord.deviceName}</Descriptions.Item>
              <Descriptions.Item label="设备类型">{selectedRecord.deviceType || '-'}</Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag color={severityMap[selectedRecord.severity]?.color}>
                  {severityMap[selectedRecord.severity]?.text ?? selectedRecord.severity}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge
                  status={(statusMap[selectedRecord.status]?.color as any) ?? 'default'}
                  text={statusMap[selectedRecord.status]?.text ?? selectedRecord.status}
                />
              </Descriptions.Item>
              <Descriptions.Item label="上报时间" span={2}>
                {new Date(selectedRecord.reportedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              {selectedRecord.description && (
                <Descriptions.Item label="描述" span={2}>
                  {selectedRecord.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedRecord.diagnosisResult ? (
              <DiagnosisResult record={selectedRecord} onClose={handleClose} />
            ) : (
              <Empty description="暂无诊断结果" />
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
