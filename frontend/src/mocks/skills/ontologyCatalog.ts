import { ONTOLOGY_DEFS, type OntologyDef } from '../../api/projectManagement'
import type { SkillIndustry } from '../../types/skill'

export interface OntologyCatalogEntry {
  code: string
  name: string
  industry: SkillIndustry
  phase: string
  triple: string
  agentScene: string
  trainingType: string
  dataCount: number
}

export function normalizeOntologyDef(def: OntologyDef): OntologyCatalogEntry {
  const [code, name, industry, phase, triple, agentScene, trainingType, dataCount] = def
  return {
    code,
    name,
    industry: industry as SkillIndustry,
    phase,
    triple,
    agentScene,
    trainingType,
    dataCount,
  }
}

export const ONTOLOGY_CATALOG: OntologyCatalogEntry[] = ONTOLOGY_DEFS.map(normalizeOntologyDef)
