import { describe, expect, it } from 'vitest'

import type { DataSource } from '../../types/dataSource'
import {
  formatIngestionRecordCount,
  getIngestionCategoryLabel,
  getIngestionDomainLabel,
  getIngestionOutputLabel,
  getIngestionTargetLabel,
  getIngestionModeLabel,
  toIngestionJobView,
} from './dataIngestion.helpers'

const structuredSource: DataSource = {
  id: 'ds-structured',
  name: '故障工单主表',
  category: 'structured',
  type: 'PostgreSQL',
  connection: {
    host: 'pg-fault-workorder.factory.local',
    port: 5432,
    database: 'fault_workorder_ods',
    username: 'fault_reader',
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
  name: '机台原始日志文件库',
  category: 'unstructured',
  type: 'OSS',
  connection: {
    endpoint: 'https://oss.demo.local',
    bucket: 'fault-machine-log-raw',
    region: 'cn-east-1',
    pathPrefix: 'machines/raw-logs/',
  },
  syncFrequency: 'daily',
  status: 'Syncing',
  lastSync: '同步中',
  recordCount: 8300,
  description: 'unstructured source',
  createdAt: '2025-01-01T08:00:00.000Z',
  updatedAt: '2025-03-10T08:00:00.000Z',
}

const replenishmentSource: DataSource = {
  id: 'ds-replenishment',
  name: 'WMS 仓库库存与在途快照库',
  category: 'structured',
  type: 'MySQL',
  connection: {
    host: 'mysql-wms-stock.ops.local',
    port: 3306,
    database: 'wms_supply_snapshot',
    username: 'wms_reader',
  },
  syncFrequency: '5min',
  status: 'Syncing',
  lastSync: '同步中',
  recordCount: 1260842,
  description: 'replenishment source',
  createdAt: '2025-01-01T08:00:00.000Z',
  updatedAt: '2025-03-10T08:00:00.000Z',
}

describe('data ingestion helpers', () => {
  it('formats structured datasource targets using host and database', () => {
    expect(getIngestionTargetLabel(structuredSource)).toBe('pg-fault-workorder.factory.local / fault_workorder_ods')
    expect(getIngestionCategoryLabel(structuredSource.category)).toBe('数据库')
  })

  it('formats object storage targets using bucket and path prefix', () => {
    expect(getIngestionTargetLabel(unstructuredSource)).toBe('fault-machine-log-raw / machines/raw-logs/')
    expect(getIngestionCategoryLabel(unstructuredSource.category)).toBe('对象存储')
  })

  it('formats record counts for task display', () => {
    expect(formatIngestionRecordCount(8300)).toBe('8,300')
    expect(formatIngestionRecordCount(128000)).toBe('12.8万')
  })

  it('derives ingestion task rows directly from datasource records', () => {
    expect(toIngestionJobView(structuredSource)).toMatchObject({
      id: 'ds-structured',
      taskName: '故障工单主表采集任务',
      sourceName: '故障工单主表',
      categoryLabel: '数据库',
      domainLabel: '工单域',
      dataSourceType: 'PostgreSQL',
      ingestionModeLabel: '增量 CDC',
      scheduleLabel: '每小时',
      statusLabel: '正常',
      lastRunLabel: '1 分钟前',
      recordCountLabel: '98.8万',
      targetLabel: 'pg-fault-workorder.factory.local / fault_workorder_ods',
      outputLabel: '落地 ODS 工单中心 / fault_work_order',
    })
  })

  it('classifies replenishment datasource rows with replenishment-specific labels', () => {
    expect(getIngestionDomainLabel(replenishmentSource)).toBe('库存供给域')
    expect(getIngestionModeLabel(replenishmentSource)).toBe('分钟批采')
    expect(getIngestionOutputLabel(replenishmentSource)).toBe('落地库存供给主题 / inventory_supply_snapshot')
  })
})
