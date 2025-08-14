import { expandSearchQuery } from '@/lib/abbreviations/service'

export type ProcessedQuery = {
  original: string
  expanded: string
  terms: string[]
}

export async function processSearchQuery(query: string): Promise<ProcessedQuery> {
  const original = query.trim()
  
  if (!original) {
    return {
      original: '',
      expanded: '',
      terms: []
    }
  }

  try {
    // Expand abbreviations
    const expanded = await expandSearchQuery(original)
    
    // Extract unique terms
    const allTerms = expanded.split(/\s+/).filter(term => term.length > 0)
    const uniqueTerms = [...new Set(allTerms.map(term => term.toLowerCase()))]
    
    return {
      original,
      expanded,
      terms: uniqueTerms
    }
  } catch (error) {
    console.warn('Failed to process search query, using original:', error)
    // Return the original query without expansion if abbreviation processing fails
    const terms = original.split(/\s+/).filter(term => term.length > 0)
    const uniqueTerms = [...new Set(terms.map(term => term.toLowerCase()))]
    
    return {
      original,
      expanded: original,
      terms: uniqueTerms
    }
  }
}

export function buildSearchTerms(processedQuery: ProcessedQuery, logic: 'AND' | 'OR' = 'AND'): string {
  if (processedQuery.terms.length === 0) return ''
  
  const connector = logic === 'OR' ? ' | ' : ' & '
  return processedQuery.terms.join(connector)
}

export function shouldUseExpandedQuery(processedQuery: ProcessedQuery): boolean {
  // Use expanded query if it's different from original (meaning abbreviations were found)
  return processedQuery.expanded !== processedQuery.original
}