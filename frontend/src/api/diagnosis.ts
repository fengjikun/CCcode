import { fetchJSON } from './client'
import type {
  Phenomenon,
  PhenomenonDetail,
  DiagnosisPayload,
  DiagnosisRecord,
} from '../types/diagnosis'
import type { GraphData } from '../types/graph'

const API = '/api/diagnosis'

export function getPhenomena(): Promise<Phenomenon[]> {
  return fetchJSON(`${API}/phenomena`)
}

export function getPhenomenonDetail(id: string): Promise<PhenomenonDetail> {
  return fetchJSON(`${API}/phenomena/${id}/detail`)
}

export function analyzeDiagnosis(payload: DiagnosisPayload): Promise<DiagnosisRecord> {
  return fetchJSON(`${API}/analyze`, 'POST', payload)
}

export function getDiagnosisRecords(): Promise<DiagnosisRecord[]> {
  return fetchJSON(`${API}/records`)
}

export function getDiagnosisRecord(id: number): Promise<DiagnosisRecord> {
  return fetchJSON(`${API}/records/${id}`)
}

export function getGraphData(): Promise<GraphData> {
  return fetchJSON(`${API}/graph`)
}
