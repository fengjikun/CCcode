import { describe, expect, it } from 'vitest'

import type { DataSource } from '../../types/dataSource'
import {
  formatIngestionRecordCount,
  getIngestionCategoryLabel,
  getIngestionTargetLabel,
  toIngestionJobView,
} from './dataIngestion.helpers'

const structuredSource: DataSource = {
  id: 'ds-structured',
  name: '企业主数据湖',
  category: 'structured',
  type: 'PostgreSQL',
  connection: {
    host: 'lake.company.local',
    port: 5432,
    database: 'lakehouse',
    username: 'reader',
  },
  syncFrequency: 'hourly',
  status: 'Active',
  lastSync: '1 分钟前',
  recordCount: 987654,
  description: 'structured source',
  createdAt: '2025-01-01T08:00:00.000Z',
  updatedAt: '2025-03-10T08:00:00.000Z',
}

const unstructuredSource: DataSource = {
  id: 'ds-unstructured',
  name: '合同附件仓',
  category: 'unstructured',
  type: 'OSS',
  connection: {
    endpoint: 'https://oss.demo.local',
    bucket: 'contract-archive',
    region: 'cn-east-1',
    pathPrefix: 'contracts/v1/',
  },
  syncFrequency: 'daily',
  status: 'Syncing',
  lastSync: '同步中',
  recordCount: 8300,
  description: 'unstructured source',
  createdAt: '2025-01-01T08:00:00.000Z',
  updatedAt: '2025-03-10T08:00:00.000Z',
}

describe('data ingestion helpers', () => {
  it('formats structured datasource targets using host and database', () => {
    expect(getIngestionTargetLabel(structuredSource)).toBe('lake.company.local / lakehouse')
    expect(getIngestionCategoryLabel(structuredSource.category)).toBe('数据库')
  })

  it('formats object storage targets using bucket and path prefix', () => {
    expect(getIngestionTargetLabel(unstructuredSource)).toBe('contract-archive / contracts/v1/')
    expect(getIngestionCategoryLabel(unstructuredSource.category)).toBe('对象存储')
  })

  it('formats record counts for task display', () => {
    expect(formatIngestionRecordCount(8300)).toBe('8,300')
    expect(formatIngestionRecordCount(128000)).toBe('12.8万')
  })

  it('derives ingestion task rows directly from datasource records', () => {
    expect(toIngestionJobView(structuredSource)).toMatchObject({
      id: 'ds-structured',
      taskName: '企业主数据湖接入任务',
      sourceName: '企业主数据湖',
      categoryLabel: '数据库',
      dataSourceType: 'PostgreSQL',
      scheduleLabel: '每小时',
      statusLabel: '正常',
      lastRunLabel: '1 分钟前',
      recordCountLabel: '98.8万',
      targetLabel: 'lake.company.local / lakehouse',
    })
  })
})
