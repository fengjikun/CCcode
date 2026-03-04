export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Phenomenon {
  id: string
  label: string
  properties?: Record<string, string>
}

export interface SubPhenomenon {
  id: string
  label: string
}

export interface PhenomenonDetail {
  id: string
  label: string
  subPhenomena: SubPhenomenon[]
}

export interface DiagnosisPayload {
  deviceId: number | null
  deviceName: string
  deviceType: string
  phenomenonId: string
  symptoms: string[]
  description: string
  severity: Severity
}

export interface DiagnosisRecord {
  id: number
  deviceId: number | null
  deviceName: string
  deviceType: string
  symptoms: string
  description: string
  severity: Severity
  status: string
  diagnosisResult: string
  reportedAt: string
}

export interface DiagnosisResult {
  phenomenon?: string
  fault_type?: string
  confidence?: string
  urgency?: string
  summary?: string
  note?: string
  matched_sub_phenomena?: string[]
  causes?: string[]
  root_causes?: string[]
  checkpoints?: Array<{
    step?: number
    priority?: number
    checkpoint?: string
    action?: string
    method?: string
    detail?: string
    expected?: string
  }>
  solutions?: Array<{
    title?: string
    action?: string
    steps?: string
    detail?: string
    estimated_time?: string
    risk_level?: string
  }>
  estimated_time?: string
}
