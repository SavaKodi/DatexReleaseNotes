import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'
import type { SearchFilters } from '@/types/search'
import { useAbbreviations } from '@/hooks/useAbbreviations'
import { expandSingleTermBidirectionally } from '@/lib/abbreviations/service'
import { processQuery } from '@/lib/search/query'

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

const PAGE_SIZE = 20

function escapeSqlLiteral(input: string): string {
  // Escape single quotes for safe embedding inside SQL literal
  return input.replace(/'/g, "''")
}

function sanitizeWebsearchTerm(input: string): string {
  // Remove problematic quotes/parentheses; collapse whitespace
  return input.replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim()
}

function quoteIfNeeded(term: string): string {
  return /\s/.test(term) ? `"${term}"` : term
}

function applyFilters(query: any, filters: SearchFilters, websearchQuery: string | null) {
  if (filters.query) {
    if (filters.titlesOnly) {
      const q = filters.query.replace(/%/g, '')
      query = query.ilike('title', `%${q}%`)
    } else if (websearchQuery) {
      // Use websearch_to_tsquery on concatenated title/description via search_vector
      query = query.textSearch('search_vector', websearchQuery, { type: 'websearch', config: 'english' })
    } else {
      const q = filters.query.replace(/%/g, '')
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    }
  }
  if (filters.components.length > 0) {
    query = query.in('component', filters.components)
  }
  if (filters.dateFrom) {
    query = query.gte('release_date', filters.dateFrom, { foreignTable: 'releases' })
  }
  if (filters.dateTo) {
    query = query.lte('release_date', filters.dateTo, { foreignTable: 'releases' })
  }
  switch (filters.sort) {
    case 'oldest':
      query = query.order('release_date', { ascending: true, foreignTable: 'releases' })
      break
    case 'relevance':
      // server-side rank ordering when FTS is used; fallback to created_at
      if (websearchQuery) {
        // Note: order by rank using ts_rank. Supabase PostgREST allows ordering by expressions via RPC, but here we
        // can approximate by selecting rank and ordering by it when FTS is active.
        query = query.order('rank', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }
      break
    default:
      query = query.order('release_date', { ascending: false, foreignTable: 'releases' })
  }
  return query
}

export function useInfiniteReleases(filters: SearchFilters) {
  const { index } = useAbbreviations()
  const processed = processQuery(filters.query, index)
  return useInfiniteQuery<{ items: ReleaseItemRow[]; next: number | null; totalCount?: number }, Error>({
    queryKey: ['release-items', { ...filters, query: processed.terms.join(' ').toLowerCase(), abbr: !!index }],
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      // Build websearch query with abbreviation expansion when applicable
      let websearchQuery: string | null = null
      if (filters.query && !filters.titlesOnly) {
        const baseTerms = processed.terms.slice(0, 6)
        const expandedGroups = baseTerms.map((t) =>
          index ? expandSingleTermBidirectionally(t, index) : [t]
        )
        const groupToWeb = (group: string[]) => {
          const uniq = Array.from(new Set(group.map((g) => sanitizeWebsearchTerm(g)).filter(Boolean)))
          // Limit synonyms to keep query short
          const limited = uniq.slice(0, 5)
          return limited.map(quoteIfNeeded).join(' OR ')
        }
        const joiner = processed.logic === 'OR' ? ' OR ' : ' AND '
        const groups = expandedGroups
          .map((g) => groupToWeb(g))
          .filter((s) => s.length > 0)
          .map((s) => `(${s})`)
        websearchQuery = groups.length > 0 ? groups.join(joiner) : null
      }

      // Select with rank only when sorting by relevance (avoids embedding the websearch query in select for other sorts)
      let query = supabase
        .from('release_items')
        .select(
          websearchQuery && filters.sort === 'relevance'
            ? `*, releases:release_id!inner(*), rank:ts_rank(search_vector, websearch_to_tsquery('english', '${escapeSqlLiteral(websearchQuery)}'))`
            : '*, releases:release_id!inner(*)',
          { count: 'exact' }
        )
        .range(from, to)

      query = applyFilters(query, filters, websearchQuery)

      const { data, error, count } = await query
      if (error) throw error
      const hasMore = data && (data as any[]).length === PAGE_SIZE
      return {
        items: (data as unknown as ReleaseItemRow[]) ?? [],
        next: hasMore ? (pageParam as number) + 1 : null,
        totalCount: typeof count === 'number' ? count : undefined,
      }
    },
  })
}


