import type { LinkType, ObjectType } from '../../types/ontology'
import type { ProjectDetail } from '../../types/projectMvp'

export type TabKey = 'documents' | 'schema' | 'extraction' | 'actions' | 'functions'
export type SchemaCreateType = 'ENTITY' | 'RELATION'

export interface RelationEndpointIssue {
  missingDomain: boolean
  missingRange: boolean
}

export interface SchemaViewModel {
  entities: ProjectDetail['schemaConfig']['entityTypes']
  relations: ProjectDetail['schemaConfig']['relationTypes']
  objectTypes: ObjectType[]
  linkTypes: LinkType[]
  graphObjectTypeIdByEntityId: Map<string, number>
  entityIdByGraphObjectTypeId: Map<number, string>
  relationIssuesById: Map<string, RelationEndpointIssue>
  edgeStatsByEntityId: Map<string, { incoming: number; outgoing: number }>
  virtualObjectTypeCount: number
}
