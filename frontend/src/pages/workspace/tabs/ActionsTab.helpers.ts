import type { ActionDefinition, EntityTypeConfig } from '../../../types/projectMvp'

export function buildTargetEntityOptions(entityTypes: EntityTypeConfig[]) {
  return entityTypes.map(entityType => ({
    label: entityType.name,
    value: entityType.id,
  }))
}

export function normalizeTargetEntityValues(
  targetObjectTypeId: ActionDefinition['targetObjectTypeId'],
  entityTypes: EntityTypeConfig[],
): string[] {
  if (targetObjectTypeId === null || targetObjectTypeId === undefined) {
    return []
  }

  const validEntityTypeIds = new Set(entityTypes.map(entityType => entityType.id))
  const rawValues = Array.isArray(targetObjectTypeId) ? targetObjectTypeId : [targetObjectTypeId]

  return [...new Set(
    rawValues
      .filter(value => value !== null && value !== undefined)
      .map(value => String(value))
      .filter(value => validEntityTypeIds.has(value)),
  )]
}
