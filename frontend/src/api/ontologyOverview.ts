import type { ObjectTypeSummary, LinkTypeSummary, ActionDefinition } from '../types/ontologyOverview'

const OBJECT_TYPES: ObjectTypeSummary[] = [
  { key: '1', name: 'PurchaseOrder', displayName: '采购订单', properties: 12, actions: 5, links: 3, backingDataset: 'transform_orders/output/normalized_orders', status: 'Active', recordCount: 45230, updatedAt: '2025-03-08' },
  { key: '2', name: 'Equipment', displayName: '设备资产', properties: 18, actions: 8, links: 5, backingDataset: 'transform_assets/output/equipment_master', status: 'Active', recordCount: 3420, updatedAt: '2025-03-07' },
  { key: '3', name: 'Customer', displayName: '客户', properties: 15, actions: 4, links: 4, backingDataset: 'transform_crm/output/customer_360', status: 'Active', recordCount: 18900, updatedAt: '2025-03-06' },
  { key: '4', name: 'Inventory', displayName: '库存', properties: 10, actions: 6, links: 3, backingDataset: 'transform_inventory/output/stock_levels', status: 'Active', recordCount: 12450, updatedAt: '2025-03-08' },
  { key: '5', name: 'Supplier', displayName: '供应商', properties: 14, actions: 3, links: 4, backingDataset: 'transform_scm/output/supplier_master', status: 'Active', recordCount: 560, updatedAt: '2025-03-05' },
  { key: '6', name: 'WorkOrder', displayName: '维修工单', properties: 16, actions: 7, links: 5, backingDataset: 'transform_cmms/output/work_orders', status: 'Active', recordCount: 8750, updatedAt: '2025-03-08' },
  { key: '7', name: 'QualityInspection', displayName: '质检记录', properties: 11, actions: 3, links: 2, backingDataset: 'transform_qms/output/inspections', status: 'Draft', recordCount: 6200, updatedAt: '2025-03-04' },
  { key: '8', name: 'ProductionBatch', displayName: '生产批次', properties: 13, actions: 4, links: 3, backingDataset: 'transform_mes/output/batches', status: 'Draft', recordCount: 2300, updatedAt: '2025-03-03' },
]

const LINK_TYPES: LinkTypeSummary[] = [
  { key: '1', name: 'OrderedBy', sourceType: 'PurchaseOrder', targetType: 'Supplier', cardinality: 'N:1', description: '订单所属供应商' },
  { key: '2', name: 'EquipmentHasWorkOrder', sourceType: 'Equipment', targetType: 'WorkOrder', cardinality: '1:N', description: '设备关联维修工单' },
  { key: '3', name: 'CustomerPlacedOrder', sourceType: 'Customer', targetType: 'PurchaseOrder', cardinality: '1:N', description: '客户下单' },
  { key: '4', name: 'InventoryForEquipment', sourceType: 'Inventory', targetType: 'Equipment', cardinality: 'N:N', description: '备件与设备关联' },
  { key: '5', name: 'InspectionForBatch', sourceType: 'QualityInspection', targetType: 'ProductionBatch', cardinality: 'N:1', description: '质检关联批次' },
  { key: '6', name: 'SupplierProvidesInventory', sourceType: 'Supplier', targetType: 'Inventory', cardinality: '1:N', description: '供应商供应物料' },
]

const ACTIONS: ActionDefinition[] = [
  { key: '1', name: 'ApprovePurchaseOrder', objectType: 'PurchaseOrder', parameters: 3, preconditions: 2, effects: 3, status: 'Active', callCount: 1240 },
  { key: '2', name: 'CreateMaintenanceTicket', objectType: 'Equipment', parameters: 5, preconditions: 1, effects: 4, status: 'Active', callCount: 856 },
  { key: '3', name: 'AdjustSafetyStock', objectType: 'Inventory', parameters: 3, preconditions: 2, effects: 2, status: 'Active', callCount: 432 },
  { key: '4', name: 'RejectPurchaseOrder', objectType: 'PurchaseOrder', parameters: 2, preconditions: 1, effects: 2, status: 'Active', callCount: 198 },
  { key: '5', name: 'SchedulePreventiveMaint', objectType: 'Equipment', parameters: 4, preconditions: 3, effects: 3, status: 'Active', callCount: 324 },
  { key: '6', name: 'UpdateCustomerScore', objectType: 'Customer', parameters: 2, preconditions: 1, effects: 1, status: 'Draft', callCount: 0 },
  { key: '7', name: 'CloseWorkOrder', objectType: 'WorkOrder', parameters: 3, preconditions: 2, effects: 3, status: 'Active', callCount: 742 },
  { key: '8', name: 'RecordInspectionResult', objectType: 'QualityInspection', parameters: 4, preconditions: 1, effects: 2, status: 'Active', callCount: 560 },
]

export interface OntologyStats {
  objectTypes: number
  totalProperties: number
  linkTypes: number
  actions: number
  totalRecords: string
  activeActions: number
}

export function getOntologyStats(): OntologyStats {
  return {
    objectTypes: OBJECT_TYPES.length,
    totalProperties: OBJECT_TYPES.reduce((s, o) => s + o.properties, 0),
    linkTypes: LINK_TYPES.length,
    actions: ACTIONS.length,
    totalRecords: `${(OBJECT_TYPES.reduce((s, o) => s + o.recordCount, 0) / 1000).toFixed(1)}K`,
    activeActions: ACTIONS.filter(a => a.status === 'Active').length,
  }
}

export function getObjectTypes(): ObjectTypeSummary[] {
  return OBJECT_TYPES
}

export function getLinkTypes(): LinkTypeSummary[] {
  return LINK_TYPES
}

export function getActions(): ActionDefinition[] {
  return ACTIONS
}
