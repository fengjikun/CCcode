import { useState } from 'react'
import { Button, Input, Popconfirm, Switch, Tag, message } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { deleteProjectFunction, setFunctionStatus, updateProjectFunction } from '../../../api/projectManagement'
import type { FunctionDefinition, FunctionStatus } from '../../../types/projectMvp'
import { functionStatusTag, getErrorMessage } from '../helpers'
import FunctionModal from '../modals/FunctionModal'
import './FunctionsTab.css'

interface FunctionsTabProps {
  projectId: string
  functions: FunctionDefinition[]
  loadProject: () => void
}

interface CellState {
  name: string
  description: string
  scriptContent: string
  dirty: boolean
  saving: boolean
}

export default function FunctionsTab({ projectId, functions, loadProject }: FunctionsTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [cellStates, setCellStates] = useState<Record<string, CellState>>({})

  const getCellState = (fn: FunctionDefinition): CellState =>
    cellStates[fn.id] ?? {
      name: fn.name,
      description: fn.description ?? '',
      scriptContent: fn.scriptContent,
      dirty: false,
      saving: false,
    }

  const updateCell = (fn: FunctionDefinition, patch: Partial<CellState>) => {
    setCellStates((prev) => {
      const current = prev[fn.id] ?? {
        name: fn.name,
        description: fn.description ?? '',
        scriptContent: fn.scriptContent,
        dirty: false,
        saving: false,
      }
      return { ...prev, [fn.id]: { ...current, ...patch } }
    })
  }

  const handleScriptChange = (fn: FunctionDefinition, value: string) => {
    updateCell(fn, { scriptContent: value, dirty: true })
  }

  const handleSave = async (fn: FunctionDefinition) => {
    const state = getCellState(fn)
    const name = state.name || fn.name
    const description = state.description || undefined
    const scriptContent = state.scriptContent
    updateCell(fn, { saving: true })
    try {
      await updateProjectFunction(projectId, fn.id, { name, description, scriptContent })
      message.success('已保存')
      updateCell(fn, { dirty: false, saving: false })
      loadProject()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '保存失败'))
      updateCell(fn, { saving: false })
    }
  }

  const handleStatusToggle = (fn: FunctionDefinition, checked: boolean) => {
    const status: FunctionStatus = checked ? 'ACTIVE' : 'DRAFT'
    void setFunctionStatus(projectId, fn.id, status)
      .then(() => loadProject())
      .catch((error: unknown) => message.error(getErrorMessage(error, '更新状态失败')))
  }

  const handleDelete = (fn: FunctionDefinition) => {
    void deleteProjectFunction(projectId, fn.id)
      .then(() => {
        message.success('函数已删除')
        return loadProject()
      })
      .catch((error: unknown) => message.error(getErrorMessage(error, '删除失败')))
  }

  return (
    <div className="functions-notebook">
      {/* 顶部 Header */}
      <div className="notebook-header">
        <div className="notebook-title">
          <span className="notebook-icon">&#9679;</span>
          <span className="notebook-label">Skills 清单</span>
          <Tag>Groovy 4.0</Tag>
          <Tag>JVM 25</Tag>
          <Tag>30s timeout</Tag>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          + 新建 Cell
        </Button>
      </div>

      {/* Cell 列表 */}
      <div className="notebook-cells">
        {functions.length === 0 && (
          <div className="notebook-empty">暂无函数，点击「+ 新建 Cell」添加</div>
        )}
        {functions.map((fn, idx) => {
          const state = getCellState(fn)
          return (
            <div key={fn.id} className="notebook-cell">
              {/* Cell 头部 */}
              <div className="cell-header">
                <span className="cell-index">In [{idx + 1}]:</span>
                <span className="cell-name">{fn.name}</span>
                {functionStatusTag(fn.status)}
                {state.dirty && <Tag color="warning">已修改</Tag>}
                <div className="cell-actions">
                  <Switch
                    size="small"
                    checked={fn.status === 'ACTIVE'}
                    onChange={(checked) => handleStatusToggle(fn, checked)}
                    checkedChildren="ACTIVE"
                    unCheckedChildren="DRAFT"
                  />
                  <Button
                    size="small"
                    icon={<SaveOutlined />}
                    loading={state.saving}
                    disabled={!state.dirty}
                    onClick={() => void handleSave(fn)}
                  >
                    保存
                  </Button>
                  <Button size="small" type="primary" icon={<PlayCircleOutlined />} disabled>
                    Run
                  </Button>
                  <Popconfirm title="确认删除函数？" onConfirm={() => handleDelete(fn)}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>

              {/* 代码编辑区 */}
              <div className="cell-editor">
                <Input.TextArea
                  className="code-textarea"
                  value={state.scriptContent}
                  onChange={(e) => handleScriptChange(fn, e.target.value)}
                  autoSize={{ minRows: 6, maxRows: 30 }}
                  spellCheck={false}
                />
              </div>

              {/* 输出区 */}
              <div className="cell-output">– Run 后显示输出 –</div>
            </div>
          )
        })}
      </div>

      <FunctionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadProject}
        projectId={projectId}
      />
    </div>
  )
}
