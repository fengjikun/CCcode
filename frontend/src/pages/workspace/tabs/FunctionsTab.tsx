import { useState } from 'react'
import { Button, Card, Popconfirm, Switch, Table, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { deleteProjectFunction, setFunctionStatus } from '../../../api/projectManagement'
import type { FunctionDefinition, FunctionStatus } from '../../../types/projectMvp'
import { functionStatusTag, getErrorMessage } from '../helpers'
import FunctionModal from '../modals/FunctionModal'

interface FunctionsTabProps {
  projectId: string
  functions: FunctionDefinition[]
  loadProject: () => void
}

export default function FunctionsTab({ projectId, functions, loadProject }: FunctionsTabProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const columns: ColumnsType<FunctionDefinition> = [
    { title: '名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', render: (value?: string) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: FunctionStatus) => functionStatusTag(value) },
    {
      title: '切换',
      key: 'switch',
      width: 120,
      render: (_value, record) => (
        <Switch
          checked={record.status === 'ACTIVE'}
          onChange={(checked) => {
            const status: FunctionStatus = checked ? 'ACTIVE' : 'DRAFT'
            void setFunctionStatus(projectId, record.id, status)
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
          title="确认删除函数？"
          onConfirm={() => {
            void deleteProjectFunction(projectId, record.id)
              .then(() => {
                message.success('函数已删除')
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
            新增函数
          </Button>
        )}
      >
        <Table<FunctionDefinition>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={functions}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <FunctionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadProject}
        projectId={projectId}
      />
    </>
  )
}
