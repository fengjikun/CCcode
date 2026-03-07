import { useParams } from 'react-router-dom'
import { Button, Card, Descriptions, Empty, Space, Tag, Tabs, Typography } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useProjectWorkspace } from './workspace/useProjectWorkspace'
import DocumentsTab from './workspace/tabs/DocumentsTab'
import SchemaTab from './workspace/tabs/SchemaTab'
import ExtractionTab from './workspace/tabs/ExtractionTab'
import ActionsTab from './workspace/tabs/ActionsTab'
import FunctionsTab from './workspace/tabs/FunctionsTab'
import type { TabKey } from './workspace/types'

const { Title, Text } = Typography

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()

  const {
    project,
    loading,
    loadProject,
    navigate,
    activeTab,
    setActiveTab,
    setActiveRunId,
    selectedRun,
    schemaViewModel,
    stableGraphData,
    aiInsightRun,
    aiInsightBusy,
    extractionBusy,
    enabledDocuments,
    enabledDataSources,
    projectVersions,
    skillList,
  } = useProjectWorkspace(projectId)

  if (loading && !project) {
    return <Card loading style={{ minHeight: 320 }} />
  }

  if (!project || !projectId) {
    return <Empty description="本体不存在或已删除" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
                返回本体列表
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => void loadProject()} loading={loading}>
                刷新
              </Button>
            </Space>
            <Tag color="blue">本体 ID: {project.id}</Tag>
          </Space>

          <Title level={4} style={{ margin: 0 }}>{project.name}</Title>
          <Text type="secondary">{project.description || '未填写本体说明'}</Text>

          <Descriptions size="small" column={5} bordered>
            <Descriptions.Item label="文档">{project.documents.length}</Descriptions.Item>
            <Descriptions.Item label="数据源">{project.dataSources.length}</Descriptions.Item>
            <Descriptions.Item label="实体类型">{project.schemaConfig.entityTypes.length}</Descriptions.Item>
            <Descriptions.Item label="关系类型">{project.schemaConfig.relationTypes.length}</Descriptions.Item>
            <Descriptions.Item label="版本">{project.versions.length}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as TabKey)}
        items={[
          {
            key: 'documents',
            label: '1. 数据来源管理',
            children: (
              <DocumentsTab
                projectId={projectId}
                project={project}
                loadProject={loadProject}
                enabledDocuments={enabledDocuments}
                enabledDataSources={enabledDataSources}
              />
            ),
          },
          {
            key: 'schema',
            label: '2. 本体建模与技能',
            children: (
              <SchemaTab
                projectId={projectId}
                project={project}
                loadProject={loadProject}
                schemaViewModel={schemaViewModel}
                stableGraphData={stableGraphData}
                aiInsightRun={aiInsightRun}
                aiInsightBusy={aiInsightBusy}
                enabledDocuments={enabledDocuments}
                skillList={skillList}
              />
            ),
          },
          {
            key: 'extraction',
            label: '3. 全量抽取与版本',
            children: (
              <ExtractionTab
                projectId={projectId}
                project={project}
                loadProject={loadProject}
                selectedRun={selectedRun}
                enabledDocuments={enabledDocuments}
                enabledDataSources={enabledDataSources}
                projectVersions={projectVersions}
                extractionBusy={extractionBusy}
                setActiveRunId={setActiveRunId}
              />
            ),
          },
          {
            key: 'actions',
            label: '4. 动作管理',
            children: (
              <ActionsTab
                projectId={projectId}
                actions={project.actions}
                loadProject={loadProject}
              />
            ),
          },
          {
            key: 'functions',
            label: '5. 函数管理',
            children: (
              <FunctionsTab
                projectId={projectId}
                functions={project.functions}
                loadProject={loadProject}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
