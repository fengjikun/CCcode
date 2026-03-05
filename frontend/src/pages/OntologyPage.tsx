import React, { useState, useEffect } from 'react'
import { Alert, Button } from 'antd'
import {
  AppstoreOutlined, ApartmentOutlined, ThunderboltOutlined, CodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import StepNav from '../components/ontology/StepNav'
import EntitiesAndLinks from '../components/ontology/step1/EntitiesAndLinks'
import OntologyGraph from '../components/ontology/step1/OntologyGraph'
import PropertyPanel from '../components/ontology/step1/PropertyPanel'
import ActionsPanel from '../components/ontology/step2/ActionsPanel'
import ActionDetail from '../components/ontology/step2/ActionDetail'
import NotebookPanel from '../components/ontology/step3/NotebookPanel'
import {
  useObjectTypes, useLinkTypes, useActionTypes, useOntologyFunctions, useOntologyStats,
} from '../hooks/useOntology'
import type { ObjectType, ActionType } from '../types/ontology'

const STAT_ITEMS = [
  { key: 'entities', label: '实体类型', icon: <AppstoreOutlined /> },
  { key: 'relations', label: '关系类型', icon: <ApartmentOutlined /> },
  { key: 'actions', label: '动作类型', icon: <ThunderboltOutlined /> },
  { key: 'functions', label: '函数', icon: <CodeOutlined /> },
] as const

export default function OntologyPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedOT, setSelectedOT] = useState<ObjectType | null>(null)
  const [selectedAT, setSelectedAT] = useState<ActionType | null>(null)

  const objectTypes = useObjectTypes()
  const linkTypes = useLinkTypes()
  const actionTypes = useActionTypes()
  const functions = useOntologyFunctions()
  const { stats, reload: reloadStats } = useOntologyStats()

  const refreshStep1 = () => {
    objectTypes.reload()
    linkTypes.reload()
    reloadStats()
  }

  const refreshStep2 = () => {
    actionTypes.reload()
    reloadStats()
  }

  const refreshStep3 = () => {
    functions.reload()
    reloadStats()
  }

  // When action type is refreshed, update selectedAT with latest data
  const handleRefreshStep2 = () => {
    refreshStep2()
  }

  // Sync selectedAT with latest data after reload
  useEffect(() => {
    if (selectedAT && actionTypes.data.length > 0) {
      const updated = actionTypes.data.find(a => a.id === selectedAT.id)
      if (updated && updated !== selectedAT) setSelectedAT(updated)
    }
  }, [actionTypes.data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate errors from all hooks
  const errors = [
    objectTypes.error && `实体类型: ${objectTypes.error}`,
    linkTypes.error && `关系类型: ${linkTypes.error}`,
    actionTypes.error && `动作类型: ${actionTypes.error}`,
    functions.error && `函数: ${functions.error}`,
  ].filter(Boolean) as string[]

  const handleRetry = () => {
    objectTypes.reload()
    linkTypes.reload()
    actionTypes.reload()
    functions.reload()
    reloadStats()
  }

  return (
    <div style={styles.page}>
      {/* Error Alert */}
      {errors.length > 0 && (
        <Alert
          type="error"
          showIcon
          closable
          message="数据加载失败"
          description={errors.join('；')}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
              重试
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        {STAT_ITEMS.map(item => (
          <div key={item.key} style={styles.statCard}>
            <div style={styles.statIcon}>{item.icon}</div>
            <div>
              <div style={styles.statNumber}>
                {stats[item.key]}
              </div>
              <div style={styles.statLabel}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Step Navigation */}
      <StepNav currentStep={currentStep} onStepChange={setCurrentStep} />

      {/* Step Content */}
      <div style={styles.content}>
        {currentStep === 1 && (
          <div style={styles.step1Layout}>
            <EntitiesAndLinks
              objectTypes={objectTypes.data}
              linkTypes={linkTypes.data}
              selectedOT={selectedOT}
              onSelectOT={setSelectedOT}
              onRefresh={refreshStep1}
              loading={objectTypes.loading}
            />
            <OntologyGraph
              objectTypes={objectTypes.data}
              linkTypes={linkTypes.data}
              selectedOTId={selectedOT?.id ?? null}
              onSelectOT={setSelectedOT}
            />
            <PropertyPanel
              objectTypeId={selectedOT?.id ?? null}
              objectTypeName={selectedOT?.displayName || selectedOT?.name || ''}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div style={styles.step2Layout}>
            <ActionsPanel
              actionTypes={actionTypes.data}
              selectedAT={selectedAT}
              onSelectAT={setSelectedAT}
              onRefresh={refreshStep2}
              loading={actionTypes.loading}
            />
            <ActionDetail
              actionType={selectedAT}
              objectTypes={objectTypes.data}
              onRefresh={handleRefreshStep2}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div style={styles.step3Layout}>
            <NotebookPanel
              functions={functions.data}
              onRefresh={refreshStep3}
              loading={functions.loading}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  statsBar: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
    borderRadius: 10,
    color: '#fff',
  },
  statIcon: {
    fontSize: 28,
    opacity: 0.85,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.85,
    marginTop: 2,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  step1Layout: {
    display: 'flex',
    gap: 16,
    height: '100%',
  },
  step2Layout: {
    display: 'flex',
    gap: 16,
    height: '100%',
  },
  step3Layout: {
    height: '100%',
    overflowY: 'auto',
  },
}
