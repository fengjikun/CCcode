import { useState } from 'react'
import { Button, Card, Popconfirm, Switch, Table, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { deleteProjectAction, setActionStatus } from '../../../api/projectManagement'
import type { ActionDefinition, ActionStatus } from '../../../types/projectMvp'
import { actionStatusTag, getErrorMessage } from '../helpers'
import ActionModal from '../modals/ActionModal'

interface ActionsTabProps {
  projectId: string
  actions: ActionDefinition[]
  loadProject: () => void
}

export default function ActionsTab({ projectId, actions, loadProject }: ActionsTabProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const columns: ColumnsType<ActionDefinition> = [
    { title: '名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', render: (value?: string) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: ActionStatus) => actionStatusTag(value) },
    {
      title: '切换',
      key: 'switch',
      width: 120,
      render: (_value, record) => (
        <Switch
          checked={record.status === 'ACTIVE'}
          onChange={(checked) => {
            const status: ActionStatus = checked ? 'ACTIVE' : 'DRAFT'
            void setActionStatus(projectId, record.id, status)
              .then(() => loadProject())
              .catch((error: unknown) => message.error(getErrorMessage(error, '更新状态失败')))
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_value, record) => (
        <Popconfirm
          title="确认删除动作？"
          onConfirm={() => {
            void deleteProjectAction(projectId, record.id)
              .then(() => {
                message.success('动作已删除')
                return loadProject()
              })
              .catch((error: unknown) => message.error(getErrorMessage(error, '删除失败')))
          }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Card
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新增动作
          </Button>
        )}
      >
        <Table<ActionDefinition>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={actions}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadProject}
        projectId={projectId}
      />
    </>
  )
}
