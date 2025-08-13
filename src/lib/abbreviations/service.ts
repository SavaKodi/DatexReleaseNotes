import { supabase } from '@/lib/supabase/client'

export type Abbreviation = {
  key: string
  value: string
}

let cachedAbbreviations: Abbreviation[] | null = null
let cacheExpiry: number = 0

export async function getAbbreviations(): Promise<Abbreviation[]> {
  // Return cached abbreviations if still valid (cache for 5 minutes)
  if (cachedAbbreviations && Date.now() < cacheExpiry) {
    return cachedAbbreviations
  }

  try {
    const { data, error } = await supabase
      .from('abbreviations')
      .select('key, value')
      .order('key')

    if (error) {
      console.warn('Failed to load abbreviations:', error)
      return []
    }

    cachedAbbreviations = (data || []).map(item => ({
      key: item.key.trim(),
      value: item.value.trim()
    }))
    cacheExpiry = Date.now() + 5 * 60 * 1000 // Cache for 5 minutes

    return cachedAbbreviations
  } catch (error) {
    console.warn('Error loading abbreviations:', error)
    return []
  }
}

export function expandQuery(query: string, abbreviations: Abbreviation[]): string {
  if (!query || abbreviations.length === 0) return query
  
  // Create a map for faster lookups (case-insensitive)
  const abbrevMap = new Map<string, string>()
  const reverseMap = new Map<string, string[]>()
  const wordMap = new Map<string, string[]>() // Map individual words to their abbreviations
  
  for (const abbrev of abbreviations) {
    const key = abbrev.key.toLowerCase().trim()
    const value = abbrev.value.toLowerCase().trim()
    
    abbrevMap.set(key, abbrev.value)
    
    // Build reverse map for value -> key expansion
    if (!reverseMap.has(value)) {
      reverseMap.set(value, [])
    }
    reverseMap.get(value)!.push(abbrev.key)
    
    // Build word-level mapping for more precise partial matching
    const valueWords = value.split(/\s+/)
    for (const valueWord of valueWords) {
      const cleanValueWord = valueWord.replace(/[^\w]/g, '')
      if (cleanValueWord.length >= 3) { // Only consider words of 3+ characters for partial matching
        if (!wordMap.has(cleanValueWord)) {
          wordMap.set(cleanValueWord, [])
        }
        wordMap.get(cleanValueWord)!.push(abbrev.key)
      }
    }
  }

  // Split query into words and expand each
  const words = query.split(/\s+/).filter(word => word.length > 0)
  const expandedWords: string[] = []

  for (const word of words) {
    const lowerWord = word.toLowerCase()
    const cleanWord = lowerWord.replace(/[^\w]/g, '') // Remove punctuation for matching
    
    // Always include the original word
    expandedWords.push(word)
    
    // Check if word is an abbreviation (exact match)
    if (abbrevMap.has(cleanWord)) {
      expandedWords.push(abbrevMap.get(cleanWord)!)
    }
    // Check if word matches a full form exactly (reverse expansion)
    else if (reverseMap.has(cleanWord)) {
      expandedWords.push(...reverseMap.get(cleanWord)!)
    }
    // More conservative partial matching: only for longer words (4+ chars) and exact word matches
    else if (cleanWord.length >= 4 && wordMap.has(cleanWord)) {
      expandedWords.push(...wordMap.get(cleanWord)!)
    }
  }

  // Remove duplicates and return
  return [...new Set(expandedWords)].join(' ')
}

export async function expandSearchQuery(query: string): Promise<string> {
  const abbreviations = await getAbbreviations()
  return expandQuery(query, abbreviations)
}

// Clear cache when abbreviations are updated
export function clearAbbreviationCache(): void {
  cachedAbbreviations = null
  cacheExpiry = 0
}