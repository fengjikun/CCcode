import type { ActionDefinition, EntityTypeConfig } from '../../../types/projectMvp'

export function buildTargetEntityOptions(entityTypes: EntityTypeConfig[]) {
  return entityTypes.map(entityType => ({
    label: entityType.name,
    value: entityType.id,
  }))
}

export function normalizeTargetEntityValue(
  targetObjectTypeId: ActionDefinition['targetObjectTypeId'],
  entityTypes: EntityTypeConfig[],
): string | undefined {
  if (targetObjectTypeId === null || targetObjectTypeId === undefined) {
    return undefined
  }

  const normalizedValue = String(targetObjectTypeId)
  return entityTypes.some(entityType => entityType.id === normalizedValue)
    ? normalizedValue
    : undefined
}
