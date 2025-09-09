import { Index } from 'flexsearch'
import type { Tables } from '@/types/supabase'
import type { SearchFilters } from '@/types/search'

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

// Create separate indexes for titles and descriptions
const titleIndex = new Index({
  preset: 'match',
  tokenize: 'forward',
  resolution: 9
})

const descriptionIndex = new Index({
  preset: 'match', 
  tokenize: 'forward',
  resolution: 6
})

// Cache for search results
let isIndexed = false
let lastIndexedData: ReleaseItemRow[] = []
let lastIndexedIdsKey = ''

/**
 * Index data in FlexSearch for precise searching
 */
export function indexData(data: ReleaseItemRow[]): void {
  // Only re-index if data set changed (by identity, not just length)
  const idsKey = data.map(d => d.id).sort().join('|')
  if (isIndexed && idsKey === lastIndexedIdsKey) return

  console.log('🔍 FlexSearch: Indexing', data.length, 'items')
  
  // Clear existing indexes
  titleIndex.clear()
  descriptionIndex.clear()
  
  // Add all items to indexes
  data.forEach(item => {
    titleIndex.add(item.id, item.title)
    descriptionIndex.add(item.id, item.description)
  })
  
  isIndexed = true
  lastIndexedData = data
  lastIndexedIdsKey = idsKey
}

/**
 * Perform precise search with word boundaries using FlexSearch
 */
export function performFlexSearch(
  query: string,
  filters: SearchFilters,
  allData: ReleaseItemRow[]
): ReleaseItemRow[] {
  if (!query.trim()) {
    return allData
  }

  // Ensure data is indexed
  indexData(allData)

  // Simple abbreviation lookup (same as existing system)
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

  // Build search terms including abbreviation expansions
  const searchTerms = [query.trim()]
  const upperTerm = query.trim().toUpperCase()
  const expansion = abbreviations[upperTerm]
  
  if (expansion) {
    searchTerms.push(expansion)
    console.log('🔍 FlexSearch: Expanding', query, '→', expansion)
  }

  // Perform search with FlexSearch
  try {
    let matchedIds = new Set<string>()
    
    for (let i = 0; i < searchTerms.length; i++) {
      const term = searchTerms[i]
      
      // Search in both title and description indexes
      let titleResults: string[] = []
      let descriptionResults: string[] = []
      
      if (filters.titlesOnly) {
        titleResults = titleIndex.search(term, 1000) as string[]
      } else {
        titleResults = titleIndex.search(term, 1000) as string[]
        descriptionResults = descriptionIndex.search(term, 1000) as string[]
      }
      
      // Combine title and description results
      const termIds = new Set([...titleResults, ...descriptionResults])
      
      if (i === 0) {
        // First term sets the initial results
        matchedIds = termIds
      } else if (filters.logic === 'OR') {
        // OR: add all new IDs
        termIds.forEach(id => matchedIds.add(id))
      } else {
        // AND: keep only IDs that appear in both sets
        matchedIds = new Set([...matchedIds].filter(id => termIds.has(id)))
      }
    }

    // Filter original data to return only matched items
    const matchedItems = allData.filter(item => matchedIds.has(item.id))
    
    console.log('🔍 FlexSearch: Found', matchedItems.length, 'results for:', query)
    
    return matchedItems

  } catch (error) {
    console.warn('FlexSearch failed, falling back to original data:', error)
    return allData
  }
}

/**
 * Get all search terms for highlighting (original + abbreviation expansions)
 */
export function getHighlightTerms(query: string): string[] {
  if (!query.trim()) return []

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

  const terms = [query.trim()]
  const upperTerm = query.trim().toUpperCase()
  const expansion = abbreviations[upperTerm]
  
  if (expansion) {
    // Add both the abbreviation and its expansion for highlighting
    terms.push(expansion)
    
    // Also add individual words from expansion for comprehensive highlighting
    const expansionWords = expansion.split(' ').filter(word => word.length > 2)
    terms.push(...expansionWords)
  }

  return [...new Set(terms)] // Remove duplicates
}

/**
 * Reset FlexSearch index (useful for testing)
 */
export function resetFlexSearchIndex(): void {
  titleIndex.clear()
  descriptionIndex.clear()
  isIndexed = false
  lastIndexedData = []
  lastIndexedIdsKey = ''
  console.log('🔍 FlexSearch: Index reset')
}
