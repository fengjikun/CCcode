import { useState, useCallback } from 'react'
import { Card, Typography, Spin, message, List, Tag } from 'antd'
import {
  ExperimentOutlined,
  HistoryOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useDevices } from '../hooks/useDevices'
import { usePhenomena, useFaultRecords } from '../hooks/useDiagnosis'
import { analyzeDiagnosis } from '../api/diagnosis'
import DiagnosisForm from '../components/diagnosis/DiagnosisForm'
import DiagnosisResult from '../components/diagnosis/DiagnosisResult'
import FaultRecordList from '../components/diagnosis/FaultRecordList'
import type { DiagnosisPayload, DiagnosisRecord } from '../types/diagnosis'

const { Title, Text } = Typography

export default function DiagnosisPage() {
  const { data: devices } = useDevices()
  const { data: phenomena, loading: phenomenaLoading } = usePhenomena()
  const { data: records, loading: recordsLoading, reload: reloadRecords } = useFaultRecords()

  const [analyzing, setAnalyzing] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<DiagnosisRecord | null>(null)

  const handleSubmit = useCallback(
    async (payload: DiagnosisPayload) => {
      setAnalyzing(true)
      setCurrentRecord(null)
      try {
        const record = await analyzeDiagnosis(payload)
        setCurrentRecord(record)
        reloadRecords()
        message.success('诊断完成')
      } catch (e: any) {
        message.error(e?.message || '诊断失败，请重试')
      } finally {
        setAnalyzing(false)
      }
    },
    [reloadRecords],
  )

  const handleCloseResult = useCallback(() => {
    setCurrentRecord(null)
  }, [])

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <ExperimentOutlined /> 故障诊断
      </Title>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '420px 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="诊断表单" size="small">
            <DiagnosisForm
              devices={devices}
              phenomena={phenomena}
              phenomenaLoading={phenomenaLoading}
              onSubmit={handleSubmit}
              loading={analyzing}
            />
          </Card>

          <Card title="故障现象列表" size="small">
            {phenomenaLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin size="small" />
              </div>
            ) : (
              <List
                size="small"
                dataSource={phenomena}
                locale={{ emptyText: '暂无故障现象' }}
                renderItem={(p) => (
                  <List.Item style={{ padding: '6px 0' }}>
                    <Tag color="blue">{p.label}</Tag>
                    {p.properties &&
                      Object.entries(p.properties).map(([k, v]) => (
                        <Text key={k} type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                          {k}: {v}
                        </Text>
                      ))}
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Analyzing spinner */}
          {analyzing && (
            <Card>
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />}
                />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: 15 }}>
                    正在分析故障，请稍候...
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {/* Diagnosis result */}
          {!analyzing && currentRecord && (
            <DiagnosisResult record={currentRecord} onClose={handleCloseResult} />
          )}

          {/* Records list */}
          <Card
            title={
              <span>
                <HistoryOutlined /> 诊断记录
              </span>
            }
            size="small"
          >
            <FaultRecordList records={records} loading={recordsLoading} />
          </Card>
        </div>
      </div>
    </div>
  )
}
