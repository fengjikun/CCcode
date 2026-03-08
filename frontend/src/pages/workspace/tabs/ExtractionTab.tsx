import { useState } from 'react'
import { Alert, Button, Empty, Space, Card, Table, Tag, Typography, message } from 'antd'
import { PlayCircleOutlined, RocketOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { runProjectExtraction } from '../../../api/projectManagement'
import type { ExtractionRun, ProjectDetail, ProjectDocument, StructuredDataSource } from '../../../types/projectMvp'
import { runStatusTag, getErrorMessage } from '../helpers'
import PublishVersionModal from '../modals/PublishVersionModal'

const { Title, Text } = Typography

interface ExtractionTabProps {
  projectId: string
  project: ProjectDetail
  loadProject: () => void
  selectedRun: ExtractionRun | null
  enabledDocuments: ProjectDocument[]
  enabledDataSources: StructuredDataSource[]
  projectVersions: ProjectDetail['versions']
  extractionBusy: boolean
  setActiveRunId: (id: string) => void
}

export default function ExtractionTab({
  projectId,
  project,
  loadProject,
  selectedRun,
  enabledDocuments,
  enabledDataSources,
  projectVersions,
  extractionBusy,
  setActiveRunId,
}: ExtractionTabProps) {
  const navigate = useNavigate()
  const [runningExtraction, setRunningExtraction] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const handleRunExtraction = async () => {
    if (extractionBusy) return
    setRunningExtraction(true)
    try {
      const run = await runProjectExtraction(projectId)
      setActiveRunId(run.id)
      message.success('抽取任务已启动')
      loadProject()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '启动抽取失败'))
    } finally {
      setRunningExtraction(false)
    }
  }

  const versionColumns: ColumnsType<ProjectDetail['versions'][number]> = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 100,
      render: (value: string, record) => (
        <Space>
          <Tag color={project.currentVersionId === record.id ? 'green' : 'default'}>{value}</Tag>
          {project.currentVersionId === record.id && <Tag color="success">当前</Tag>}
        </Space>
      ),
    },
    { title: '标签', dataIndex: 'label' },
    { title: '来源任务', dataIndex: 'sourceRunId', width: 160 },
    {
      title: '实体/关系',
      width: 140,
      render: (_value, record) => `E${record.entityCount} / R${record.relationCount}`,
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      width: 100,
      render: (_value, record) => (
        <Button size="small" onClick={() => navigate(`/ontology/projects/${project.id}/graph?versionId=${record.id}`)}>
          图谱
        </Button>
      ),
    },
  ]

  const schemaWarnings = (selectedRun?.warnings || []).filter((line) => (
    line.includes('schema')
    || line.includes('不在 schema 中')
    || line.includes('domain/range 与 schema 不一致')
    || line.includes('超出 schema 范围')
  ))
  const otherWarnings = (selectedRun?.warnings || []).filter((line) => !schemaWarnings.includes(line))

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card>
        <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
          <div>
            <Title level={5} style={{ marginBottom: 6 }}>抽取任务</Title>
            <Text type="secondary">基于当前启用文档 + 启用数据源 + 当前配置执行抽取。审核与筛选已迁移到图谱页。</Text>
          </div>
          <Space>
            {selectedRun && (
              <Button onClick={() => navigate(`/ontology/projects/${project.id}/graph?runId=${selectedRun.id}`)}>
                进入图谱审核
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={runningExtraction || extractionBusy}
              disabled={enabledDocuments.length + enabledDataSources.length === 0 || extractionBusy}
              onClick={() => void handleRunExtraction()}
            >
              发起全量抽取
            </Button>
          </Space>
        </Space>

        {selectedRun ? (
          <div style={{ marginTop: 16 }}>
            <Space style={{ marginBottom: 8 }}>
              {runStatusTag(selectedRun.status)}
              <Text>创建时间：{new Date(selectedRun.createdAt).toLocaleString()}</Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              <div style={{ background: '#f5f5f5', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${selectedRun.progress}%`,
                    height: '100%',
                    background: selectedRun.status === 'FAILED' ? '#ff4d4f' : '#1677ff',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
            <Space wrap style={{ marginTop: 12 }}>
              <Tag color="blue">候选实体 {selectedRun.candidateEntityCount}</Tag>
              <Tag color="purple">候选关系 {selectedRun.candidateRelationCount}</Tag>
              <Tag color="orange">待审核 {selectedRun.pendingReviewCount}</Tag>
              {selectedRun.stage && <Tag color="geekblue">阶段 {selectedRun.stage}</Tag>}
              {selectedRun.currentDocument && <Tag color="cyan">当前文档 {selectedRun.currentDocument}</Tag>}
            </Space>
            {selectedRun.errorMessage && (
              <Alert style={{ marginTop: 12 }} type="error" showIcon message="抽取任务失败" description={selectedRun.errorMessage} />
            )}
            {schemaWarnings.length > 0 && (
              <Alert
                style={{ marginTop: 12 }}
                type="warning"
                showIcon
                message={`检测到 ${schemaWarnings.length} 条 Schema 约束告警（已自动忽略）`}
                description={(
                  <div style={{ maxHeight: 120, overflow: 'auto' }}>
                    {schemaWarnings.map((line, index) => (
                      <Text key={`${index}_${line}`} type="warning" style={{ display: 'block' }}>
                        {line}
                      </Text>
                    ))}
                  </div>
                )}
              />
            )}
            {otherWarnings.length > 0 && (
              <Alert
                style={{ marginTop: 12 }}
                type="info"
                showIcon
                message={`其他抽取告警 ${otherWarnings.length} 条`}
                description={(
                  <div style={{ maxHeight: 120, overflow: 'auto' }}>
                    {otherWarnings.map((line, index) => (
                      <Text key={`${index}_${line}`} type="secondary" style={{ display: 'block' }}>
                        {line}
                      </Text>
                    ))}
                  </div>
                )}
              />
            )}
            {selectedRun.logs.length > 0 && (
              <div style={{ marginTop: 12, maxHeight: 180, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
                {selectedRun.logs.map((line, index) => (
                  <Text key={`${index}_${line}`} type="secondary" style={{ display: 'block' }}>
                    {line}
                  </Text>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无抽取任务" />
        )}
      </Card>

      <Card title="发布本体版本">
        {selectedRun ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="版本发布说明"
              description="发布时会固化当前 run 的审核结果，动作与函数可据此挂载版本。"
            />
            <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
              <Text type="secondary">
                当前任务：{selectedRun.id}，状态：{selectedRun.status}，待审核：{selectedRun.pendingReviewCount}
              </Text>
              <Space>
                <Button onClick={() => navigate(`/ontology/projects/${project.id}/graph?runId=${selectedRun.id}`)}>
                  查看图谱
                </Button>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  disabled={selectedRun.status !== 'COMPLETED'}
                  onClick={() => setPublishModalOpen(true)}
                >
                  发布版本
                </Button>
              </Space>
            </Space>
            <Table
              rowKey="id"
              size="small"
              columns={versionColumns}
              dataSource={projectVersions}
              locale={{ emptyText: '暂无已发布版本' }}
              pagination={{ pageSize: 5 }}
            />
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先执行抽取任务" />
        )}
      </Card>

      {selectedRun && (
        <PublishVersionModal
          open={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          onSuccess={loadProject}
          projectId={projectId}
          selectedRun={selectedRun}
          projectVersions={projectVersions}
        />
      )}
    </Space>
  )
}
