import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'
import type { SearchFilters } from '@/types/search'
import { processSearchQuery, shouldUseExpandedQuery } from '@/lib/search/query'

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

const PAGE_SIZE = 20

function sanitizeSearchTerm(input: string): string {
  // Clean up search term for both FTS and ILIKE
  return input.replace(/[%'\\]/g, '').trim()
}

function buildFullTextQuery(searchTerm: string, logic: 'AND' | 'OR'): string {
  // Build a websearch-friendly query string
  const terms = searchTerm.split(/\s+/).filter(t => t.length > 0)
  if (terms.length === 0) return ''
  
  if (logic === 'OR') {
    // websearch_to_tsquery uses the word 'or'
    return terms.join(' or ')
  } else {
    // AND is implicit in websearch; spaces suffice
    return terms.join(' ')
  }
}

async function applySearchFilter(query: ReturnType<typeof supabase.from>, filters: SearchFilters) {
  if (!filters.query) return query

  const searchTerm = sanitizeSearchTerm(filters.query)
  if (!searchTerm) return query

  try {
    if (filters.titlesOnly) {
      // For title-only search, expand abbreviations but use ILIKE
      const processedQuery = await processSearchQuery(searchTerm)
      const expandedTerm = shouldUseExpandedQuery(processedQuery) ? processedQuery.expanded : searchTerm
      const escapedTerm = expandedTerm.replace(/'/g, "''").replace(/%/g, '\\%')
      return query.ilike('title', `%${escapedTerm}%`)
    }

    // Process query with abbreviation expansion
    const processedQuery = await processSearchQuery(searchTerm)
    const queryToUse = shouldUseExpandedQuery(processedQuery) ? processedQuery.expanded : searchTerm
    
    // Use PostgreSQL full-text search with the existing search_vector
    const ftsQuery = buildFullTextQuery(queryToUse, filters.logic)
    if (!ftsQuery) return query
    
    try {
      // Use websearch_to_tsquery compatible syntax
      return query.textSearch('search_vector', ftsQuery, { type: 'websearch' })
    } catch (e) {
      console.warn('FTS failed, falling back to ILIKE:', e)
      
      // Fallback to ILIKE search with expanded query
      try {
        const escapedQuery = queryToUse.replace(/'/g, "''").replace(/%/g, '\\%')
        return query.or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`)
      } catch (iLikeError) {
        console.warn('ILIKE fallback failed, returning original query:', iLikeError)
        return query
      }
    }
  } catch (error) {
    console.warn('Search filter processing failed, returning unfiltered query:', error)
    // Return the original query without search filtering if anything fails
    return query
  }
}

function applyFilters(query: ReturnType<typeof supabase.from>, filters: SearchFilters) {
  // Note: Search filter is now applied separately as async function

  // Apply component filter
  if (filters.components.length > 0) {
    query = query.in('component', filters.components)
  }

  // Apply date range filters - use dot notation for foreign table
  if (filters.dateFrom) {
    query = query.gte('releases.release_date', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('releases.release_date', filters.dateTo)
  }

  // Apply sorting
  switch (filters.sort) {
    case 'oldest':
      query = query.order('release_date', { ascending: true, foreignTable: 'releases' })
      break
    case 'relevance':
      // For relevance sorting, we'll handle it in the main query function since it needs async processing
      query = query.order('created_at', { ascending: false })
      break
    default: // 'newest'
      query = query.order('release_date', { ascending: false, foreignTable: 'releases' })
  }

  return query
}

export function useInfiniteReleases(filters: SearchFilters) {
  return useInfiniteQuery<{ items: ReleaseItemRow[]; next: number | null; totalCount?: number }, Error>({
    queryKey: ['release-items', filters],
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      try {
        // Build the query with simple selection
        let query = supabase
          .from('release_items')
          .select('*, releases:release_id!inner(*)', { count: 'exact' })
          .range(from, to)

        // Apply search filter first (async) and handle relevance sorting
        try {
          query = await applySearchFilter(query, filters)
        } catch (error) {
          console.warn('Search filter application failed, continuing with base query:', error)
          // Continue with the original query if search filter fails
        }

        // Apply other filters
        if (query && typeof query.order === 'function') {
          query = applyFilters(query, filters)
        } else {
          console.warn('Query object is invalid, rebuilding base query')
          // Rebuild the query if it's corrupted
          query = supabase
            .from('release_items')
            .select('*, releases:release_id!inner(*)', { count: 'exact' })
            .range(from, to)
          query = applyFilters(query, filters)
        }

        // Handle relevance sorting with abbreviation expansion
        if (filters.sort === 'relevance' && filters.query) {
          try {
            const searchTerm = sanitizeSearchTerm(filters.query)
            if (searchTerm) {
              const processedQuery = await processSearchQuery(searchTerm)
              const queryToUse = shouldUseExpandedQuery(processedQuery) ? processedQuery.expanded : searchTerm
              const ftsQuery = buildFullTextQuery(queryToUse, filters.logic)
              if (ftsQuery) {
                // Rank using websearch_to_tsquery with proper escaping
                const escapedQuery = ftsQuery.replace(/'/g, "''")
                query = query.order(`ts_rank(search_vector, websearch_to_tsquery('${escapedQuery}'))`, { ascending: false })
              }
            }
          } catch (error) {
            console.warn('Relevance sorting failed, falling back to date sorting:', error)
            // Fall back to date sorting if relevance sorting fails
            query = query.order('release_date', { ascending: false, foreignTable: 'releases' })
          }
        }

        const { data, error, count } = await query
        if (error) throw error
        
        const rows = (data as unknown as ReleaseItemRow[]) ?? []
        const total = typeof count === 'number' ? count : undefined
        const hasMore = rows.length === PAGE_SIZE

        return {
          items: rows,
          next: hasMore ? (pageParam as number) + 1 : null,
          totalCount: total,
        }
      } catch (error) {
        console.error('Query failed:', error)
        throw error
      }
    },
  })
}


