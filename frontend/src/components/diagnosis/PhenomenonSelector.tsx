import { useState, useCallback } from 'react'
import { Select, Checkbox, Spin, Typography } from 'antd'
import type { GetProp } from 'antd'
type CheckboxValueType = GetProp<typeof Checkbox.Group, 'value'>[number]
import type { Phenomenon, PhenomenonDetail } from '../../types/diagnosis'
import { getPhenomenonDetail } from '../../api/diagnosis'

const { Text } = Typography

interface PhenomenonSelectorProps {
  phenomena: Phenomenon[]
  phenomenaLoading?: boolean
  value?: { phenomenonId: string; symptoms: string[] }
  onChange?: (value: { phenomenonId: string; symptoms: string[] }) => void
}

export default function PhenomenonSelector({
  phenomena,
  phenomenaLoading,
  value,
  onChange,
}: PhenomenonSelectorProps) {
  const [detail, setDetail] = useState<PhenomenonDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handlePhenomenonChange = useCallback(
    async (id: string) => {
      onChange?.({ phenomenonId: id, symptoms: [] })
      setDetailLoading(true)
      try {
        const d = await getPhenomenonDetail(id)
        setDetail(d)
      } catch {
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [onChange],
  )

  const handleSymptomsChange = useCallback(
    (checked: CheckboxValueType[]) => {
      if (value?.phenomenonId) {
        onChange?.({
          phenomenonId: value.phenomenonId,
          symptoms: checked as string[],
        })
      }
    },
    [value?.phenomenonId, onChange],
  )

  return (
    <div>
      <Select
        placeholder="选择故障现象"
        style={{ width: '100%' }}
        loading={phenomenaLoading}
        value={value?.phenomenonId || undefined}
        onChange={handlePhenomenonChange}
        showSearch
        optionFilterProp="label"
        options={phenomena.map((p) => ({ label: p.label, value: p.id }))}
      />

      {detailLoading && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Spin size="small" />
        </div>
      )}

      {!detailLoading && detail && detail.subPhenomena.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
            子现象（可多选）:
          </Text>
          <Checkbox.Group
            value={value?.symptoms ?? []}
            onChange={handleSymptomsChange}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {detail.subPhenomena.map((sp) => (
              <Checkbox key={sp.id} value={sp.id}>
                {sp.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </div>
      )}

      {!detailLoading && detail && detail.subPhenomena.length === 0 && (
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          该现象暂无子现象
        </Text>
      )}
    </div>
  )
}
