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

export function buildSupabaseSearchConditions(processedQuery: ProcessedQuery, _logic: 'AND' | 'OR' = 'AND', titlesOnly = false): string[] {
  if (processedQuery.terms.length === 0) return []
  
  // Create Supabase-compatible filter conditions
  const supabaseConditions: string[] = []
  
  for (const term of processedQuery.terms) {
    // Clean term for Supabase (no single quotes, just escape wildcards)
    const cleanTerm = term.replace(/[%_']/g, '')
    
    if (titlesOnly) {
      // Search only in title field
      supabaseConditions.push(`title.ilike.%${cleanTerm}%`)
    } else {
      // Search in both title and description fields
      supabaseConditions.push(`title.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%`)
    }
  }
  
  return supabaseConditions
}

export function buildAbbreviationSearchConditions(original: string, expanded: string, logic: 'AND' | 'OR' = 'AND', titlesOnly = false): string {
  // Handle the case where abbreviation expansion creates additional terms
  const originalTerms = original.trim().split(/\s+/).filter(t => t.length > 0)
  const expandedTerms = expanded.trim().split(/\s+/).filter(t => t.length > 0)
  
  // Remove original terms from expanded to get just the new terms
  const newTermsFromExpansion = expandedTerms.filter(term => 
    !originalTerms.some(orig => orig.toLowerCase() === term.toLowerCase())
  )
  
  const conditions: string[] = []
  
  // For each original term, create a condition that searches for either the term OR its expansion
  for (const originalTerm of originalTerms) {
    const cleanOriginal = originalTerm.replace(/[%_']/g, '')
    const termConditions: string[] = []
    
    if (titlesOnly) {
      termConditions.push(`title.ilike.%${cleanOriginal}%`)
      
      // Add expansions related to this term
      for (const expandedTerm of newTermsFromExpansion) {
        const cleanExpanded = expandedTerm.replace(/[%_']/g, '')
        termConditions.push(`title.ilike.%${cleanExpanded}%`)
      }
    } else {
      termConditions.push(`title.ilike.%${cleanOriginal}%`)
      termConditions.push(`description.ilike.%${cleanOriginal}%`)
      
      // Add expansions related to this term
      for (const expandedTerm of newTermsFromExpansion) {
        const cleanExpanded = expandedTerm.replace(/[%_']/g, '')
        termConditions.push(`title.ilike.%${cleanExpanded}%`)
        termConditions.push(`description.ilike.%${cleanExpanded}%`)
      }
    }
    
    // Join this term's conditions with OR (term OR its expansions)
    conditions.push(termConditions.join(','))
  }
  
  // Join different terms based on user's logic preference  
  // For OR: join all conditions with commas
  // For AND: return first condition (we'll handle multiple AND calls in the hook)
  return logic === 'OR' ? conditions.join(',') : conditions[0] || ''
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