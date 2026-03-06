import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Popconfirm,
  Progress,
  Row,
  Space,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BulbOutlined,
  ClearOutlined,
  DeleteOutlined,
  FileZipOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { DataNode, TreeProps } from 'antd/es/tree'
import { clearProjectSchema, removeCustomSkill, removeEntityType, removeRelationType, uploadCustomSkill } from '../../../api/projectManagement'
import type { AiInsightRun, ProjectDetail, ProjectDocument } from '../../../types/projectMvp'
import type { SchemaCreateType, SchemaViewModel } from '../types'
import { runStatusTag, getErrorMessage } from '../helpers'
import OntologyGraph from '../../../components/ontology/step1/OntologyGraph'
import type { ObjectType } from '../../../types/ontology'
import type { LinkType } from '../../../types/ontology'
import AiInsightModal from '../modals/AiInsightModal'
import SchemaFormModal from '../modals/SchemaFormModal'

const { Text } = Typography

interface SchemaTabProps {
  projectId: string
  project: ProjectDetail
  loadProject: () => void
  schemaViewModel: SchemaViewModel
  stableGraphData: { objectTypes: ObjectType[]; linkTypes: LinkType[] }
  aiInsightRun: AiInsightRun | null | undefined
  aiInsightBusy: boolean
  enabledDocuments: ProjectDocument[]
  skillList: ProjectDetail['schemaConfig']['skills']
}

export default function SchemaTab({
  projectId,
  project,
  loadProject,
  schemaViewModel,
  stableGraphData,
  aiInsightRun,
  aiInsightBusy,
  enabledDocuments,
  skillList,
}: SchemaTabProps) {
  const skillZipInputRef = useRef<HTMLInputElement>(null)
  const [uploadingSkills, setUploadingSkills] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedSchemaTreeKeys, setSelectedSchemaTreeKeys] = useState<string[]>([])
  const [schemaModalOpen, setSchemaModalOpen] = useState(false)
  const [schemaModalMode, setSchemaModalMode] = useState<'create' | 'edit'>('create')
  const [schemaType, setSchemaType] = useState<SchemaCreateType>('ENTITY')
  const [editingSchemaId, setEditingSchemaId] = useState<string | null>(null)
  const [aiInsightModalOpen, setAiInsightModalOpen] = useState(false)

  const schemaEntities = schemaViewModel.entities
  const schemaRelations = schemaViewModel.relations

  // Clear selection if selected entity was deleted
  useEffect(() => {
    if (!selectedEntityId) return
    const exists = schemaEntities.some(item => item.id === selectedEntityId)
    if (!exists) {
      setSelectedEntityId(null)
      setSelectedSchemaTreeKeys([])
    }
  }, [schemaEntities, selectedEntityId])

  const selectedEntity = useMemo(
    () => schemaEntities.find(item => item.id === selectedEntityId) || null,
    [schemaEntities, selectedEntityId],
  )

  const selectedGraphNodeId = useMemo(() => {
    if (!selectedEntityId) return null
    return schemaViewModel.graphObjectTypeIdByEntityId.get(selectedEntityId) || null
  }, [schemaViewModel.graphObjectTypeIdByEntityId, selectedEntityId])

  const selectedSchemaNodeStats = useMemo(() => {
    if (!selectedEntityId) return null
    return schemaViewModel.edgeStatsByEntityId.get(selectedEntityId) || { incoming: 0, outgoing: 0 }
  }, [schemaViewModel.edgeStatsByEntityId, selectedEntityId])

  const entityOptions = schemaEntities.map(item => ({ label: item.name, value: item.name }))

  const openCreateModal = () => {
    setSchemaModalMode('create')
    setEditingSchemaId(null)
    setSchemaType('ENTITY')
    setSchemaModalOpen(true)
  }

  const openEditModal = (type: SchemaCreateType, id: string) => {
    setSchemaModalMode('edit')
    setEditingSchemaId(id)
    setSchemaType(type)
    setSchemaModalOpen(true)
  }

  const handleClearSchema = async () => {
    try {
      await clearProjectSchema(projectId)
      message.success('已清空全部实体与关系')
      setSelectedSchemaTreeKeys([])
      setSelectedEntityId(null)
      loadProject()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '清空失败'))
    }
  }

  const handleUploadSkillZip = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    setUploadingSkills(true)
    try {
      for (const file of Array.from(fileList)) {
        if (!file.name.toLowerCase().endsWith('.zip')) {
          message.warning(`${file.name} 不是 zip，已跳过`)
          continue
        }
        await uploadCustomSkill(projectId, file)
      }
      message.success('Skill 上传成功')
      loadProject()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Skill 上传失败'))
    } finally {
      setUploadingSkills(false)
      event.target.value = ''
    }
  }

  const handleDeleteUploadedSkill = async (skillId: string) => {
    try {
      await removeCustomSkill(projectId, skillId)
      message.success('已删除自定义 Skill')
      loadProject()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '删除 Skill 失败'))
    }
  }

  const handleSchemaTreeSelect: TreeProps['onSelect'] = (keys) => {
    const normalizedKeys = keys.map(item => String(item))
    setSelectedSchemaTreeKeys(normalizedKeys)
    const target = normalizedKeys[0]
    if (!target) return

    if (target.startsWith('ent:')) {
      setSelectedEntityId(target.replace('ent:', ''))
      return
    }
    if (target.startsWith('prop:')) {
      const [, entityId] = target.split(':')
      if (entityId) setSelectedEntityId(entityId)
    }
  }

  const schemaTreeData = useMemo<DataNode[]>(() => {
    const entityChildren: DataNode[] = schemaEntities.map(entity => ({
      key: `ent:${entity.id}`,
      title: (
        <Space size={6}>
          <Text>{entity.name}</Text>
          <Tag color="blue">{entity.properties.length} 属性</Tag>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              openEditModal('ENTITY', entity.id)
            }}
          />
          <Popconfirm
            title="删除实体类型？"
            onConfirm={() => {
              void removeEntityType(projectId, entity.id)
                .then(() => {
                  message.success('实体类型已删除')
                  return loadProject()
                })
                .catch((error: unknown) => message.error(getErrorMessage(error, '删除失败')))
            }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(event) => event.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
      children: entity.properties
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(property => ({
          key: `prop:${entity.id}:${property.id}`,
          title: (
            <Space size={6}>
              <Text type="secondary">{property.displayName}</Text>
              <Tag>{property.dataType}</Tag>
              {property.required && <Tag color="error">必填</Tag>}
            </Space>
          ),
          isLeaf: true,
        })),
    }))

    const relationChildren: DataNode[] = schemaRelations.map(relation => {
      const endpointIssue = schemaViewModel.relationIssuesById.get(relation.id)
      return {
        key: `rel:${relation.id}`,
        title: (
          <Space size={6}>
            <Text>{relation.name}</Text>
            <Text type="secondary">{relation.domain} → {relation.range}</Text>
            <Tag>{relation.properties.length} 属性</Tag>
            {endpointIssue && <Tag color="warning">端点异常</Tag>}
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation()
                openEditModal('RELATION', relation.id)
              }}
            />
            <Popconfirm
              title="删除关系类型？"
              onConfirm={() => {
                void removeRelationType(projectId, relation.id)
                  .then(() => {
                    message.success('关系类型已删除')
                    return loadProject()
                  })
                  .catch((error: unknown) => message.error(getErrorMessage(error, '删除失败')))
              }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => event.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        ),
        isLeaf: true,
      }
    })

    return [
      {
        key: 'root:entities',
        title: (
          <Space size={6}>
            <AppstoreOutlined />
            <Text>实体类型 ({schemaEntities.length})</Text>
          </Space>
        ),
        children: entityChildren,
      },
      {
        key: 'root:relations',
        title: (
          <Space size={6}>
            <ApartmentOutlined />
            <Text>关系类型 ({schemaRelations.length})</Text>
          </Space>
        ),
        children: relationChildren,
      },
    ]
  }, [loadProject, projectId, schemaEntities, schemaRelations, schemaViewModel.relationIssuesById])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={7}>
          <Card
            title="实体/关系树"
            extra={(
              <Space>
                <Tag>{schemaEntities.length + schemaRelations.length}</Tag>
                <Popconfirm
                  title="确认清空全部？"
                  description="将删除该项目所有实体类型与关系类型，此操作不可恢复。"
                  onConfirm={handleClearSchema}
                  okText="清空"
                  okType="danger"
                  disabled={schemaEntities.length === 0 && schemaRelations.length === 0}
                >
                  <Button
                    danger
                    icon={<ClearOutlined />}
                    disabled={schemaEntities.length === 0 && schemaRelations.length === 0}
                  >
                    清空
                  </Button>
                </Popconfirm>
                <Button
                  icon={<BulbOutlined />}
                  loading={aiInsightBusy}
                  disabled={aiInsightBusy}
                  onClick={() => setAiInsightModalOpen(true)}
                >
                  AI洞察
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                  新增
                </Button>
              </Space>
            )}
            style={{ height: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">统一管理实体与关系，点击"新增"后在弹窗里选择类型并填写字段。</Text>
              <Tree
                treeData={schemaTreeData}
                selectedKeys={selectedSchemaTreeKeys}
                onSelect={handleSchemaTreeSelect}
                defaultExpandAll
                height={380}
                style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}
              />
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={17}>
          <Card
            title="本体结构图（实体类型 / 关系类型）"
            extra={<Text type="secondary">点击节点可高亮查看</Text>}
            style={{ height: '100%' }}
          >
            {schemaEntities.length === 0 && schemaRelations.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无实体类型，先新增实体类型后可查看图谱" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {schemaViewModel.relationIssuesById.size > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message={(
                      <span>
                        检测到 {schemaViewModel.relationIssuesById.size} 条关系端点未匹配实体类型，图中已按"未匹配实体"节点展示
                        {schemaViewModel.virtualObjectTypeCount > 0 ? `（${schemaViewModel.virtualObjectTypeCount} 个）` : ''}。
                      </span>
                    )}
                  />
                )}
                <OntologyGraph
                  objectTypes={stableGraphData.objectTypes}
                  linkTypes={stableGraphData.linkTypes}
                  selectedOTId={selectedGraphNodeId}
                  onSelectOT={(ot) => {
                    const entityId = schemaViewModel.entityIdByGraphObjectTypeId.get(ot.id)
                    if (entityId) {
                      setSelectedEntityId(entityId)
                      setSelectedSchemaTreeKeys([`ent:${entityId}`])
                    }
                  }}
                />
                {selectedEntity && selectedSchemaNodeStats && (
                  <Space wrap>
                    <Tag color="blue">实体：{selectedEntity.name}</Tag>
                    <Tag color="cyan">出边 {selectedSchemaNodeStats.outgoing}</Tag>
                    <Tag color="geekblue">入边 {selectedSchemaNodeStats.incoming}</Tag>
                  </Space>
                )}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {aiInsightRun && (
        <Card title="AI洞察任务进展">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Space wrap>
              {runStatusTag(aiInsightRun.status)}
              <Text>创建时间：{new Date(aiInsightRun.createdAt).toLocaleString()}</Text>
              {aiInsightRun.completedAt && (
                <Text type="secondary">完成时间：{new Date(aiInsightRun.completedAt).toLocaleString()}</Text>
              )}
            </Space>
            <Progress
              percent={aiInsightRun.progress}
              status={
                aiInsightRun.status === 'FAILED'
                  ? 'exception'
                  : aiInsightRun.status === 'COMPLETED'
                    ? 'success'
                    : 'active'
              }
            />
            <Space wrap>
              <Tag color="blue">扫描文档 {aiInsightRun.scannedDocumentCount}</Tag>
              <Tag color="green">新增实体 {aiInsightRun.addedEntityCount}</Tag>
              <Tag color="purple">新增关系 {aiInsightRun.addedRelationCount}</Tag>
              {aiInsightRun.stage && <Tag color="geekblue">阶段 {aiInsightRun.stage}</Tag>}
              {aiInsightRun.currentDocument && <Tag color="cyan">当前文档 {aiInsightRun.currentDocument}</Tag>}
            </Space>
            {aiInsightRun.errorMessage && (
              <Alert type="error" showIcon message="AI洞察执行失败" description={aiInsightRun.errorMessage} />
            )}
            {aiInsightRun.logs.length > 0 && (
              <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
                {aiInsightRun.logs.map((line, index) => (
                  <Text key={`${index}_${line}`} type="secondary" style={{ display: 'block' }}>
                    {line}
                  </Text>
                ))}
              </div>
            )}
            {aiInsightRun.warnings.length > 0 && (
              <div style={{ maxHeight: 120, overflow: 'auto' }}>
                {aiInsightRun.warnings.map((line, index) => (
                  <Text key={`${index}_${line}`} type="warning" style={{ display: 'block' }}>
                    {line}
                  </Text>
                ))}
              </div>
            )}
          </Space>
        </Card>
      )}

      <Card
        title={(
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <span style={{ letterSpacing: 1, fontWeight: 700 }}>Skill 能力编排</span>
            <Tag>{skillList.length}</Tag>
          </Space>
        )}
        extra={(
          <>
            <input
              ref={skillZipInputRef}
              type="file"
              multiple
              accept=".zip"
              style={{ display: 'none' }}
              onChange={(event) => { void handleUploadSkillZip(event) }}
            />
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploadingSkills}
              onClick={() => skillZipInputRef.current?.click()}
            >
              上传 Skill 包
            </Button>
          </>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="支持上传 Claude 标准 Skill 包（zip）"
            description="压缩包中需包含 SKILL.md，系统会自动解析名称、简介与包元数据并存库。"
          />
          {skillList.length === 0 && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Skill。" />
          )}
          {skillList.map(skill => (
            <Card key={skill.id} size="small" title={skill.name} extra={(
              <Space size={6}>
                {skill.enabled ? <Tag color="success">已启用</Tag> : <Tag>未启用</Tag>}
                {skill.source === 'built_in' ? <Tag color="blue">内置</Tag> : <Tag color="purple">用户上传</Tag>}
              </Space>
            )}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <Text type="secondary">{skill.description || '暂无介绍'}</Text>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="来源">
                    {skill.source === 'built_in' ? '系统内置' : '客户自定义'}
                  </Descriptions.Item>
                  <Descriptions.Item label="编码">{skill.code}</Descriptions.Item>
                  <Descriptions.Item label="包格式">
                    {String(skill.metadata?.packageFormat || (skill.source === 'built_in' ? 'builtin' : '-'))}
                  </Descriptions.Item>
                  <Descriptions.Item label="SKILL.md">
                    {skill.metadata?.hasSkillMd ? '已检测' : (skill.source === 'built_in' ? '内置能力' : '未检测')}
                  </Descriptions.Item>
                </Descriptions>
                <Space wrap>
                  {(skill.tags || []).map(tag => <Tag key={tag}>{tag}</Tag>)}
                  {Array.isArray(skill.metadata?.capabilities)
                    ? skill.metadata.capabilities?.map((capability) => (
                      <Tag color="geekblue" key={`${skill.id}_${String(capability)}`}>
                        {String(capability)}
                      </Tag>
                    ))
                    : null}
                  {skill.fileName && (
                    <Tag icon={<FileZipOutlined />}>{skill.fileName}</Tag>
                  )}
                  {skill.blocked && <Tag color="orange">依赖未满足</Tag>}
                </Space>
                {skill.missing && <Text type="secondary">缺失依赖：{skill.missing}</Text>}
                {skill.source === 'uploaded' && (
                  <Space>
                    <Popconfirm
                      title="删除该 Skill？"
                      description="删除后不会参与后续图谱处理。"
                      onConfirm={() => {
                        void handleDeleteUploadedSkill(skill.id)
                      }}
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </Space>
            </Card>
          ))}
        </Space>
      </Card>

      <AiInsightModal
        open={aiInsightModalOpen}
        onClose={() => setAiInsightModalOpen(false)}
        onSuccess={loadProject}
        projectId={projectId}
        enabledDocuments={enabledDocuments}
        aiInsightRun={aiInsightRun}
        aiInsightBusy={aiInsightBusy}
      />

      <SchemaFormModal
        open={schemaModalOpen}
        mode={schemaModalMode}
        editingId={editingSchemaId}
        schemaType={schemaType}
        onSchemaTypeChange={setSchemaType}
        onClose={() => setSchemaModalOpen(false)}
        onSuccess={loadProject}
        projectId={projectId}
        schemaConfig={project.schemaConfig}
        entityOptions={entityOptions}
      />
    </Space>
  )
}
