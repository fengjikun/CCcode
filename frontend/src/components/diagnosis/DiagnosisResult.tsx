import { useMemo } from 'react'
import {
  Card,
  Tag,
  Typography,
  Divider,
  Steps,
  List,
  Badge,
  Button,
  Space,
  Empty,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  WarningOutlined,
  BulbOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import type { DiagnosisRecord, DiagnosisResult as DiagnosisResultType } from '../../types/diagnosis'

const { Title, Text, Paragraph } = Typography

interface DiagnosisResultProps {
  record: DiagnosisRecord
  onClose: () => void
}

const confidenceColor: Record<string, string> = {
  high: 'green',
  medium: 'orange',
  low: 'red',
  高: 'green',
  中: 'orange',
  低: 'red',
}

const urgencyColor: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
  critical: 'magenta',
  高: 'red',
  中: 'orange',
  低: 'blue',
  紧急: 'magenta',
}

export default function DiagnosisResult({ record, onClose }: DiagnosisResultProps) {
  const result = useMemo<DiagnosisResultType | null>(() => {
    if (!record.diagnosisResult) return null
    try {
      return JSON.parse(record.diagnosisResult)
    } catch {
      return null
    }
  }, [record.diagnosisResult])

  if (!result) {
    return (
      <Card>
        <Empty description="暂无诊断结果" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={onClose}>关闭</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      styles={{ body: { padding: '20px 24px' } }}
      style={{ borderRadius: 8 }}
    >
      {/* Header: phenomenon + badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {result.phenomenon || result.fault_type || '诊断结果'}
          </Title>
          <Space style={{ marginTop: 8 }}>
            {result.confidence && (
              <Tag color={confidenceColor[result.confidence.toLowerCase()] ?? 'default'}>
                置信度: {result.confidence}
              </Tag>
            )}
            {result.urgency && (
              <Tag color={urgencyColor[result.urgency.toLowerCase()] ?? 'default'}>
                紧急程度: {result.urgency}
              </Tag>
            )}
          </Space>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      {/* Summary */}
      {result.summary && (
        <>
          <Divider style={{ margin: '16px 0 12px' }} />
          <Paragraph style={{ margin: 0, color: '#555' }}>{result.summary}</Paragraph>
        </>
      )}

      {result.note && (
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
          {result.note}
        </Paragraph>
      )}

      {/* Matched sub-phenomena */}
      {result.matched_sub_phenomena && result.matched_sub_phenomena.length > 0 && (
        <>
          <Divider style={{ fontSize: 14 }}>
            <WarningOutlined /> 匹配的子现象
          </Divider>
          <Space wrap>
            {result.matched_sub_phenomena.map((sp, i) => (
              <Tag key={i} color="volcano">
                {sp}
              </Tag>
            ))}
          </Space>
        </>
      )}

      {/* Causes */}
      {((result.causes && result.causes.length > 0) ||
        (result.root_causes && result.root_causes.length > 0)) && (
        <>
          <Divider style={{ fontSize: 14 }}>
            <BulbOutlined /> 可能原因
          </Divider>
          <List
            size="small"
            dataSource={result.causes ?? result.root_causes ?? []}
            renderItem={(cause: string) => (
              <List.Item style={{ padding: '6px 0' }}>
                <Badge status="warning" text={cause} />
              </List.Item>
            )}
          />
        </>
      )}

      {/* Checkpoints / troubleshooting steps */}
      {result.checkpoints && result.checkpoints.length > 0 && (
        <>
          <Divider style={{ fontSize: 14 }}>
            <CheckCircleOutlined /> 排查步骤
          </Divider>
          <Steps
            direction="vertical"
            size="small"
            current={result.checkpoints.length}
            items={result.checkpoints.map((cp, idx) => ({
              title: cp.checkpoint || cp.action || `步骤 ${cp.step ?? cp.priority ?? idx + 1}`,
              description: (
                <div>
                  {cp.method && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                      方法: {cp.method}
                    </Text>
                  )}
                  {cp.detail && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                      {cp.detail}
                    </Text>
                  )}
                  {cp.expected && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                      预期: {cp.expected}
                    </Text>
                  )}
                </div>
              ),
            }))}
          />
        </>
      )}

      {/* Solutions */}
      {result.solutions && result.solutions.length > 0 && (
        <>
          <Divider style={{ fontSize: 14 }}>
            <ToolOutlined /> 解决方案
          </Divider>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {result.solutions.map((sol, idx) => (
              <Card
                key={idx}
                size="small"
                type="inner"
                title={sol.title || `方案 ${idx + 1}`}
                extra={
                  sol.risk_level ? (
                    <Tag color={sol.risk_level === '高' || sol.risk_level === 'high' ? 'red' : 'blue'}>
                      风险: {sol.risk_level}
                    </Tag>
                  ) : null
                }
              >
                {sol.action && <Paragraph style={{ margin: '0 0 4px' }}>{sol.action}</Paragraph>}
                {sol.detail && (
                  <Paragraph type="secondary" style={{ margin: '0 0 4px', fontSize: 13 }}>
                    {sol.detail}
                  </Paragraph>
                )}
                {sol.steps && (
                  <Paragraph
                    type="secondary"
                    style={{ margin: '0 0 4px', fontSize: 13, whiteSpace: 'pre-line' }}
                  >
                    {sol.steps}
                  </Paragraph>
                )}
                {sol.estimated_time && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined /> 预计耗时: {sol.estimated_time}
                  </Text>
                )}
              </Card>
            ))}
          </Space>
        </>
      )}

      {/* Estimated time */}
      {result.estimated_time && (
        <>
          <Divider />
          <Text>
            <ClockCircleOutlined /> 总预计修复时间: <strong>{result.estimated_time}</strong>
          </Text>
        </>
      )}

      {/* Close button */}
      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Button onClick={onClose}>关闭诊断结果</Button>
      </div>
    </Card>
  )
}
