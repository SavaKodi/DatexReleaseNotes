import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'
import type { SearchFilters } from '@/types/search'

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

const PAGE_SIZE = 20

function applySearchFilter(query: ReturnType<typeof supabase.from>, filters: SearchFilters) {
  if (!filters.query) return query

  const searchTerm = filters.query.trim()
  if (!searchTerm) return query

  // Simple abbreviation lookup - no async, no complexity
  const abbreviations: Record<string, string> = {
    'CLP': 'Composite License Plate',
    'LP': 'License Plate',
    'ASN': 'Advanced Shipping Notice',
    'BOL': 'Bill of Lading',
    'UDF': 'User-Defined Field',
    'PO': 'Purchase Order',
    'SN': 'Serial Number',
    'MW': 'Mobile Web',
    'FP': 'FootPrint',
    'IC': 'Inventory Container',
    'SSCC': 'Serial Shipping Container Code',
    'UCC': 'UCC-128 labels',
    'UOM': 'Unit of Measure',
    'VLot': 'Vendor Lot',
    'ODATA API': 'Open Data Protocol API'
  }

  const upperTerm = searchTerm.toUpperCase()
  const expansion = abbreviations[upperTerm]
  
  try {
    if (filters.titlesOnly) {
      // Search only in titles
      if (expansion) {
        console.log('🔍 Title search with abbreviation:', searchTerm, '→', expansion)
        return query.or(`title.ilike.%${searchTerm}%,title.ilike.%${expansion}%`)
      } else {
        console.log('🔍 Simple title search:', searchTerm)
        return query.ilike('title', `%${searchTerm}%`)
      }
    } else {
      // Search in both title and description
      if (expansion) {
        console.log('🔍 Full search with abbreviation:', searchTerm, '→', expansion)
        return query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,title.ilike.%${expansion}%,description.ilike.%${expansion}%`)
      } else {
        console.log('🔍 Simple full search:', searchTerm)
        return query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }
    }
  } catch (error) {
    console.warn('Search failed, using title only fallback:', error)
    return query.ilike('title', `%${searchTerm}%`)
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

        // Apply search filter (simple and synchronous)
        try {
          query = applySearchFilter(query, filters)
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

        // Handle relevance sorting (simplified)
        if (filters.sort === 'relevance' && filters.query) {
          try {
            // For now, just fall back to date sorting for relevance until we get basic search working
            // TODO: Implement proper relevance ranking once basic search is stable
            query = query.order('release_date', { ascending: false, foreignTable: 'releases' })
          } catch (error) {
            console.warn('Relevance sorting failed, falling back to date sorting:', error)
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


