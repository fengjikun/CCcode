import type { TrainingDataset } from '../types/trainingDataset'

const MOCK_DATASETS: TrainingDataset[] = [
  { key: '1', name: 'purchase_orders_v3', source: 'ontology://PurchaseOrder/output', trainSplit: 70, valSplit: 15, testSplit: 15, records: 12450, version: 'v3.0', status: 'Ready', size: '156 MB', createdAt: '2025-02-15', updatedAt: '2025-03-08', linkedModels: ['purchase-order-classifier'] },
  { key: '2', name: 'equipment_sensors_v2', source: 'ontology://Equipment/output', trainSplit: 80, valSplit: 10, testSplit: 10, records: 45230, version: 'v2.1', status: 'Ready', size: '1.2 GB', createdAt: '2025-01-20', updatedAt: '2025-03-07', linkedModels: ['equipment-fault-predictor'] },
  { key: '3', name: 'customer_churn_v1', source: 'ontology://Customer/output', trainSplit: 70, valSplit: 15, testSplit: 15, records: 8920, version: 'v1.0', status: 'Ready', size: '89 MB', createdAt: '2025-02-28', updatedAt: '2025-03-05', linkedModels: ['churn-predictor'] },
  { key: '4', name: 'inventory_demand_v1', source: 'ontology://Inventory/output', trainSplit: 75, valSplit: 15, testSplit: 10, records: 23100, version: 'v1.2', status: 'Building', size: '320 MB', createdAt: '2025-03-01', updatedAt: '2025-03-08', linkedModels: ['demand-forecaster'] },
  { key: '5', name: 'quality_inspection_v1', source: 'ontology://QualityInspection/output', trainSplit: 70, valSplit: 15, testSplit: 15, records: 6200, version: 'v1.0', status: 'Ready', size: '72 MB', createdAt: '2025-03-03', updatedAt: '2025-03-06', linkedModels: [] },
  { key: '6', name: 'supplier_risk_v1', source: 'ontology://Supplier/output', trainSplit: 70, valSplit: 20, testSplit: 10, records: 3400, version: 'v1.0', status: 'Ready', size: '45 MB', createdAt: '2025-02-20', updatedAt: '2025-03-04', linkedModels: ['supplier-risk-scorer'] },
  { key: '7', name: 'workorder_nlp_v1', source: 'ontology://WorkOrder/output', trainSplit: 80, valSplit: 10, testSplit: 10, records: 8750, version: 'v1.0', status: 'Failed', size: '—', createdAt: '2025-03-07', updatedAt: '2025-03-08', linkedModels: [] },
]

const STORAGE_KEY = 'deepexios_datasets'

function load(): TrainingDataset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) { save(MOCK_DATASETS); return MOCK_DATASETS }
    return JSON.parse(raw)
  } catch { return MOCK_DATASETS }
}

function save(list: TrainingDataset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function listDatasets(): TrainingDataset[] {
  return load()
}

export function createDataset(input: Partial<TrainingDataset>): TrainingDataset {
  const list = load()
  const ds: TrainingDataset = {
    key: `ds-${Date.now()}`,
    name: input.name || '',
    source: input.source || '',
    trainSplit: input.trainSplit || 70,
    valSplit: input.valSplit || 15,
    testSplit: input.testSplit || 15,
    records: 0,
    version: 'v1.0',
    status: 'Building',
    size: '—',
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    linkedModels: [],
  }
  list.push(ds)
  save(list)
  return ds
}

export function deleteDataset(key: string): void {
  save(load().filter(d => d.key !== key))
}

export interface DatasetStats {
  total: number
  totalRecords: string
  readyCount: number
  totalSize: string
}

export function getDatasetStats(): DatasetStats {
  const list = load()
  const totalRecords = list.reduce((s, d) => s + d.records, 0)
  return {
    total: list.length,
    totalRecords: totalRecords >= 1000 ? `${(totalRecords / 1000).toFixed(1)}K` : `${totalRecords}`,
    readyCount: list.filter(d => d.status === 'Ready').length,
    totalSize: '1.9 GB',
  }
}
