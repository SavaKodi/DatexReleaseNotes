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

export function getSearchRelevanceScore(processedQuery: ProcessedQuery): number {
  // Return a relevance multiplier based on query characteristics
  const originalTerms = processedQuery.original.trim().split(/\s+/).filter(t => t.length > 0)
  const expandedTerms = processedQuery.expanded.trim().split(/\s+/).filter(t => t.length > 0)
  
  // If expansion added many more terms than original, reduce relevance weight
  const expansionRatio = expandedTerms.length / Math.max(originalTerms.length, 1)
  
  // Reduce relevance for heavily expanded queries to prevent over-matching
  if (expansionRatio > 2) {
    return 0.3 // Low relevance for heavily expanded queries
  } else if (expansionRatio > 1.5) {
    return 0.7 // Medium relevance for moderately expanded queries
  }
  
  return 1.0 // Full relevance for minimal expansion
}

export function shouldUseExpandedQuery(processedQuery: ProcessedQuery): boolean {
  // Use expanded query if it's different from original (meaning abbreviations were found)
  return processedQuery.expanded !== processedQuery.original
}