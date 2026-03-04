import { useState, useMemo, useCallback } from 'react'
import { Button, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDevices, useDeviceTypes } from '../hooks/useDevices'
import DeviceStats from '../components/devices/DeviceStats'
import DeviceTable from '../components/devices/DeviceTable'
import DeviceForm from '../components/devices/DeviceForm'
import type { Device } from '../types/device'

const { Title } = Typography

/** Debounce helper */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  const ref = useMemo(() => ({ timer: 0 as unknown as ReturnType<typeof setTimeout> }), [])

  useMemo(() => {
    clearTimeout(ref.timer)
    ref.timer = setTimeout(() => setDebounced(value), delay)
  }, [value, delay, ref])

  return debounced
}

export default function DevicesPage() {
  const navigate = useNavigate()

  // --- filter state ---
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')

  const debouncedKeyword = useDebounce(keyword, 300)

  const params = useMemo(
    () => ({
      keyword: debouncedKeyword || undefined,
      status: status || undefined,
      type: type || undefined,
    }),
    [debouncedKeyword, status, type],
  )

  const { data: devices, loading, reload } = useDevices(params)
  const { types: deviceTypes } = useDeviceTypes()

  // --- modal state ---
  const [formOpen, setFormOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)

  const openCreate = useCallback(() => {
    setEditingDevice(null)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((device: Device) => {
    setEditingDevice(device)
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditingDevice(null)
  }, [])

  const handleFormSuccess = useCallback(() => {
    reload()
  }, [reload])

  const handleDiagnose = useCallback(
    (device: Device) => {
      navigate(`/diagnosis?deviceId=${device.id}`)
    },
    [navigate],
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          设备管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建设备
        </Button>
      </div>

      <DeviceStats devices={devices} />

      <DeviceTable
        devices={devices}
        loading={loading}
        deviceTypes={deviceTypes}
        keyword={keyword}
        status={status}
        type={type}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onTypeChange={setType}
        onEdit={openEdit}
        onDiagnose={handleDiagnose}
        onReload={reload}
      />

      <DeviceForm
        open={formOpen}
        device={editingDevice}
        deviceTypes={deviceTypes}
        onClose={closeForm}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
