export type UUID = string

export type Release = {
  id: UUID
  version: string
  release_date: string
  created_at: string
}

export type ReleaseItemComponent = 'mobile_web' | 'desktop' | 'api' | 'html5_portal'

export type ReleaseItem = {
  id: UUID
  release_id: UUID
  title: string
  description: string
  azure_devops_id: number | null
  component: ReleaseItemComponent | null
  created_at: string
}

export type Abbreviation = {
  id: UUID
  key: string
  value: string
  created_at: string
}

export type SearchHistory = {
  id: UUID
  query: string
  results_count: number
  created_at: string
}


