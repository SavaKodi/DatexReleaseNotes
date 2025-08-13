export type SortOption = 'newest' | 'oldest' | 'relevance'
export type LogicOption = 'AND' | 'OR'

export type ComponentFilter = 'mobile_web' | 'desktop' | 'api' | 'html5_portal'

export type SearchFilters = {
  query: string
  titlesOnly: boolean
  components: ComponentFilter[]
  dateFrom?: string
  dateTo?: string
  sort: SortOption
  logic: LogicOption
}

export const DefaultFilters: SearchFilters = {
  query: '',
  titlesOnly: false,
  components: [],
  dateFrom: undefined,
  dateTo: undefined,
  sort: 'newest',
  logic: 'AND',
}


