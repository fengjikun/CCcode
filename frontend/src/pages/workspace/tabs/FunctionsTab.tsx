import { useState } from 'react'
import { Button, Input, Popconfirm, Switch, Tag, message } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined, PlayCircleOutlined } from '@ant-design/icons'
import {
  deleteProjectFunction,
  getProjectFunctionInputTemplate,
  runProjectFunction,
  setFunctionStatus,
  updateProjectFunction,
} from '../../../api/projectManagement'
import type { FunctionDefinition, FunctionStatus, ProjectFunctionRunResult } from '../../../types/projectMvp'
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
  runInput: string
  dirty: boolean
  saving: boolean
  running: boolean
  lastRun: ProjectFunctionRunResult | null
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function buildCellState(fn: FunctionDefinition): CellState {
  return {
    name: fn.name,
    description: fn.description ?? '',
    scriptContent: fn.scriptContent,
    runInput: formatJson(getProjectFunctionInputTemplate(fn)),
    dirty: false,
    saving: false,
    running: false,
    lastRun: null,
  }
}

function computeDirty(fn: FunctionDefinition, state: Pick<CellState, 'name' | 'description' | 'scriptContent'>): boolean {
  return state.name !== fn.name
    || state.description !== (fn.description ?? '')
    || state.scriptContent !== fn.scriptContent
}

export default function FunctionsTab({ projectId, functions, loadProject }: FunctionsTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [cellStates, setCellStates] = useState<Record<string, CellState>>({})

  const getCellState = (fn: FunctionDefinition): CellState => cellStates[fn.id] ?? buildCellState(fn)

  const updateCell = (
    fn: FunctionDefinition,
    patch: Partial<CellState>,
    options?: { preserveDirty?: boolean },
  ) => {
    setCellStates((prev) => {
      const current = prev[fn.id] ?? buildCellState(fn)
      const next: CellState = { ...current, ...patch }
      if (!options?.preserveDirty) {
        next.dirty = computeDirty(fn, next)
      }
      return { ...prev, [fn.id]: next }
    })
  }

  const handleSave = async (fn: FunctionDefinition) => {
    const state = getCellState(fn)
    updateCell(fn, { saving: true }, { preserveDirty: true })
    try {
      await updateProjectFunction(projectId, fn.id, {
        name: state.name.trim() || fn.name,
        description: state.description.trim() || undefined,
        scriptContent: state.scriptContent,
      })
      updateCell(
        fn,
        {
          name: state.name.trim() || fn.name,
          description: state.description.trim(),
          scriptContent: state.scriptContent,
          dirty: false,
          saving: false,
        },
        { preserveDirty: true },
      )
      message.success('函数已保存')
      loadProject()
    } catch (error: unknown) {
      updateCell(fn, { saving: false }, { preserveDirty: true })
      message.error(getErrorMessage(error, '保存失败'))
    }
  }

  const handleRun = async (fn: FunctionDefinition) => {
    const state = getCellState(fn)
    let input: Record<string, unknown>

    try {
      input = state.runInput.trim() ? JSON.parse(state.runInput) as Record<string, unknown> : {}
      if (typeof input !== 'object' || Array.isArray(input) || input === null) {
        throw new Error('运行入参必须是 JSON 对象')
      }
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '运行入参不是合法 JSON'))
      return
    }

    updateCell(fn, { running: true }, { preserveDirty: true })

    try {
      const result = await runProjectFunction(projectId, fn.id, {
        input,
        name: state.name.trim() || fn.name,
        scriptContent: state.scriptContent,
      })
      updateCell(fn, { running: false, lastRun: result }, { preserveDirty: true })
      if (result.status === 'SUCCESS') {
        message.success(result.mode === 'HANDLER' ? '函数运行完成' : '已生成运行预览')
      } else {
        message.error(result.errorMessage || '函数运行失败')
      }
    } catch (error: unknown) {
      updateCell(fn, { running: false }, { preserveDirty: true })
      message.error(getErrorMessage(error, '运行失败'))
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
        setCellStates((prev) => {
          const next = { ...prev }
          delete next[fn.id]
          return next
        })
        message.success('函数已删除')
        return loadProject()
      })
      .catch((error: unknown) => message.error(getErrorMessage(error, '删除失败')))
  }

  return (
    <div className="functions-notebook">
      <div className="notebook-header">
        <div className="notebook-title">
          <span className="notebook-icon">&#9679;</span>
          <span className="notebook-label">Skills 清单</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建 Skill
        </Button>
      </div>

      <div className="notebook-cells">
        {functions.length === 0 && (
          <div className="notebook-empty">暂无函数，点击「新建 Skill」添加</div>
        )}
        {functions.map((fn, idx) => {
          const state = getCellState(fn)

          return (
            <div key={fn.id} className="notebook-cell">
              <div className="cell-header">
                <span className="cell-index">In [{idx + 1}]:</span>
                {functionStatusTag(fn.status)}
                {state.dirty && <Tag color="warning">未保存</Tag>}
                {state.lastRun && (
                  <Tag color={state.lastRun.status === 'SUCCESS' ? 'success' : 'error'}>
                    {state.lastRun.status === 'SUCCESS' ? '最近运行成功' : '最近运行失败'}
                  </Tag>
                )}
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
                    disabled={!state.dirty || state.running}
                    onClick={() => void handleSave(fn)}
                  >
                    保存
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={state.running}
                    disabled={state.saving}
                    onClick={() => void handleRun(fn)}
                  >
                    Run
                  </Button>
                  <Popconfirm title="确认删除函数？" onConfirm={() => handleDelete(fn)}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>

              <div className="cell-metadata">
                <Input
                  value={state.name}
                  onChange={(e) => updateCell(fn, { name: e.target.value })}
                  placeholder="函数名称"
                  className="cell-name-input"
                />
                <Input
                  value={state.description}
                  onChange={(e) => updateCell(fn, { description: e.target.value })}
                  placeholder="函数描述（可选）"
                />
              </div>

              <div className="cell-editor">
                <Input.TextArea
                  className="code-textarea"
                  value={state.scriptContent}
                  onChange={(e) => updateCell(fn, { scriptContent: e.target.value })}
                  autoSize={{ minRows: 8, maxRows: 30 }}
                  spellCheck={false}
                />
              </div>

              <div className="cell-runner">
                <div className="runner-label">运行入参 JSON</div>
                <Input.TextArea
                  className="runner-textarea"
                  value={state.runInput}
                  onChange={(e) => updateCell(fn, { runInput: e.target.value }, { preserveDirty: true })}
                  autoSize={{ minRows: 4, maxRows: 12 }}
                  spellCheck={false}
                />
              </div>

              <div className={`cell-output ${state.lastRun?.status === 'FAILED' ? 'cell-output-error' : ''}`}>
                {!state.lastRun && (
                  <span className="cell-output-empty">填写运行入参后点击 Run，这里会显示输出结果和执行日志。</span>
                )}

                {state.lastRun && (
                  <>
                    <div className="cell-output-meta">
                      <Tag color={state.lastRun.status === 'SUCCESS' ? 'success' : 'error'}>
                        {state.lastRun.status}
                      </Tag>
                      <Tag>{state.lastRun.mode === 'HANDLER' ? '模拟执行' : '静态预览'}</Tag>
                      <span>{new Date(state.lastRun.executedAt).toLocaleString()}</span>
                      <span>{state.lastRun.durationMs} ms</span>
                    </div>

                    <pre className="cell-output-pre">
                      {state.lastRun.status === 'FAILED'
                        ? state.lastRun.errorMessage
                        : formatJson(state.lastRun.output)}
                    </pre>

                    {state.lastRun.logLines.length > 0 && (
                      <div className="cell-output-logs">
                        {state.lastRun.logLines.map((line, index) => (
                          <div key={`${fn.id}-log-${index}`}>{line}</div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
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
