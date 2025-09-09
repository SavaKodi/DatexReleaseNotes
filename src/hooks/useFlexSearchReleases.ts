import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'
import type { SearchFilters } from '@/types/search'
import { performFlexSearch } from '@/lib/search/flexsearch'

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

const PAGE_SIZE = 20

function applyNonSearchFilters(query: ReturnType<typeof supabase.from>, filters: SearchFilters) {
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
      // For relevance sorting, FlexSearch will handle the ordering
      query = query.order('created_at', { ascending: false })
      break
    default: // 'newest'
      query = query.order('release_date', { ascending: false, foreignTable: 'releases' })
  }

  return query
}

export function useFlexSearchReleases(filters: SearchFilters) {
  return useInfiniteQuery<{ items: ReleaseItemRow[]; next: number | null; totalCount?: number }, Error>({
    queryKey: ['flexsearch-release-items', filters],
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      try {
        // Always fetch ALL data that matches non-search filters first
        // We'll do precise search filtering client-side with FlexSearch
        let query = supabase
          .from('release_items')
          .select('*, releases:release_id!inner(*)', { count: 'exact' })

        // Apply only non-search filters to database query
        query = applyNonSearchFilters(query, filters)

        // Execute the query to get filtered data
        const { data, error } = await query
        if (error) throw error
        
        const allFilteredData = (data as unknown as ReleaseItemRow[]) ?? []
        console.log('🔍 Database returned', allFilteredData.length, 'items after non-search filtering')

        // Now apply FlexSearch for precise text search
        let searchFilteredData = allFilteredData
        if (filters.query?.trim()) {
          searchFilteredData = performFlexSearch(filters.query, filters, allFilteredData)
          
          // If titlesOnly is enabled, filter results to only title matches
          if (filters.titlesOnly) {
            const query = filters.query.toLowerCase()
            searchFilteredData = searchFilteredData.filter(item => 
              item.title.toLowerCase().includes(query)
            )
          }
          
          console.log('🔍 FlexSearch filtered to', searchFilteredData.length, 'items')
        }

        // Apply explicit client-side sorting when not using relevance
        if (filters.sort !== 'relevance') {
          const dir = filters.sort === 'oldest' ? 1 : -1
          searchFilteredData = [...searchFilteredData].sort((a, b) => {
            const da = (a as any).releases?.release_date ?? ''
            const db = (b as any).releases?.release_date ?? ''
            // Compare YYYY-MM-DD strings lexicographically for stability
            if (da < db) return -1 * dir
            if (da > db) return 1 * dir
            // Tiebreaker by created_at to keep deterministic ordering
            const ca = a.created_at ?? ''
            const cb = b.created_at ?? ''
            if (ca < cb) return -1 * dir
            if (ca > cb) return 1 * dir
            return 0
          })
        } else if (filters.query?.trim()) {
          // FlexSearch already returns results in relevance order
          console.log('🔍 Using FlexSearch relevance ordering')
        }

        // Apply pagination to the filtered results
        const paginatedItems = searchFilteredData.slice(from, to)
        const hasMore = to < searchFilteredData.length - 1

        console.log('🔍 Returning page', pageParam, ':', paginatedItems.length, 'items')

        return {
          items: paginatedItems,
          next: hasMore ? (pageParam as number) + 1 : null,
          totalCount: searchFilteredData.length, // Use client-side filtered count
        }
      } catch (error) {
        console.error('FlexSearch query failed:', error)
        throw error
      }
    },
  })
}
