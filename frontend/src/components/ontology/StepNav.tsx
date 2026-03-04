import React from 'react'

interface StepDef {
  key: number
  label: string
  sub: string
}

const STEPS: StepDef[] = [
  { key: 1, label: 'Step 01', sub: '实体 & 关系 (Object / Link Types)' },
  { key: 2, label: 'Step 02', sub: 'Actions (动作引擎)' },
  { key: 3, label: 'Step 03', sub: 'Functions (Groovy Notebook)' },
]

interface StepNavProps {
  currentStep: number
  onStepChange: (step: number) => void
}

const StepNav: React.FC<StepNavProps> = ({ currentStep, onStepChange }) => {
  return (
    <div style={styles.bar}>
      {STEPS.map((s, idx) => (
        <React.Fragment key={s.key}>
          {idx > 0 && <span style={styles.chevron}>›</span>}
          <div
            style={{
              ...styles.step,
              borderBottom: currentStep === s.key ? '3px solid #1677ff' : '3px solid transparent',
              color: currentStep === s.key ? '#1677ff' : '#666',
              fontWeight: currentStep === s.key ? 600 : 400,
            }}
            onClick={() => onStepChange(s.key)}
          >
            <span style={styles.label}>{s.label}</span>
            <span style={styles.sub}>{s.sub}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fff',
    borderRadius: 8,
    padding: '0 16px',
    marginBottom: 16,
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    padding: '14px 20px',
    cursor: 'pointer',
    transition: 'all .2s',
    whiteSpace: 'nowrap',
  },
  label: { fontSize: 13, opacity: 0.6 },
  sub: { fontSize: 14, marginTop: 2 },
  chevron: {
    fontSize: 22,
    color: '#ccc',
    userSelect: 'none',
  },
}

export default StepNav
