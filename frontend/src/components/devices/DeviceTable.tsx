import { useMemo } from 'react'
import { Table, Tag, Button, Space, Input, Select, Modal, message } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Device, DeviceStatus } from '../../types/device'
import { deleteDevice } from '../../api/devices'

const STATUS_LABEL: Record<DeviceStatus, string> = {
  ONLINE: '在线',
  OFFLINE: '离线',
  MAINTENANCE: '维修中',
  FAULT: '故障',
}

const STATUS_COLOR: Record<DeviceStatus, string> = {
  ONLINE: 'green',
  OFFLINE: 'default',
  MAINTENANCE: 'orange',
  FAULT: 'red',
}

interface DeviceTableProps {
  devices: Device[]
  loading: boolean
  deviceTypes: string[]
  keyword: string
  status: string
  type: string
  onKeywordChange: (value: string) => void
  onStatusChange: (value: string) => void
  onTypeChange: (value: string) => void
  onEdit: (device: Device) => void
  onDiagnose: (device: Device) => void
  onReload: () => void
}

export default function DeviceTable({
  devices,
  loading,
  deviceTypes,
  keyword,
  status,
  type,
  onKeywordChange,
  onStatusChange,
  onTypeChange,
  onEdit,
  onDiagnose,
  onReload,
}: DeviceTableProps) {
  const handleDelete = (device: Device) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除设备「${device.name}」吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteDevice(device.id)
          message.success('设备已删除')
          onReload()
        } catch {
          // error is already handled by fetchJSON
        }
      },
    })
  }

  const columns: ColumnsType<Device> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 70,
        sorter: (a, b) => a.id - b.id,
      },
      {
        title: '设备名称',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (val: string | null) => val ?? '-',
      },
      {
        title: '位置',
        dataIndex: 'location',
        key: 'location',
        width: 140,
        render: (val: string | null) => val ?? '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (s: DeviceStatus) => (
          <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>
        ),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (val: string | null) => val ?? '-',
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        sorter: (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        render: (val: string) =>
          new Date(val).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
      },
      {
        title: '操作',
        key: 'actions',
        width: 200,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => onDiagnose(record)}
            >
              诊断
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [onEdit, onDiagnose, onReload],
  )

  const statusOptions = [
    { label: '全部状态', value: '' },
    { label: '在线', value: 'ONLINE' },
    { label: '离线', value: 'OFFLINE' },
    { label: '维修中', value: 'MAINTENANCE' },
    { label: '故障', value: 'FAULT' },
  ]

  const typeOptions = useMemo(
    () => [
      { label: '全部类型', value: '' },
      ...deviceTypes.map((t) => ({ label: t, value: t })),
    ],
    [deviceTypes],
  )

  return (
    <>
      <Space wrap style={{ marginBottom: 16, width: '100%' }}>
        <Input
          placeholder="搜索设备名称..."
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          style={{ width: 240 }}
        />
        <Select
          value={status}
          onChange={onStatusChange}
          options={statusOptions}
          style={{ width: 140 }}
        />
        <Select
          value={type}
          onChange={onTypeChange}
          options={typeOptions}
          style={{ width: 160 }}
        />
      </Space>

      <Table<Device>
        rowKey="id"
        columns={columns}
        dataSource={devices}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1000 }}
      />
    </>
  )
}
