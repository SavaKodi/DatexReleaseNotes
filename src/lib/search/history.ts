import { supabase } from '@/lib/supabase/client'
import type { Tables, TablesInsert } from '@/types/supabase'

export async function recordSearch(query: string, resultsCount: number) {
  const payload: TablesInsert<'search_history'> = { query, results_count: resultsCount }
  const { error } = await supabase.from('search_history').insert(payload)
  if (error) throw error
}

export async function getSearchSuggestions(prefix: string, limit = 8): Promise<string[]> {
  if (!prefix) return []
  const { data, error } = await supabase
    .from('search_history')
    .select('query')
    .ilike('query', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  const uniq = new Set<string>()
  for (const row of data ?? []) {
    const q = row.query.trim()
    if (!uniq.has(q)) uniq.add(q)
    if (uniq.size >= limit) break
  }
  return Array.from(uniq)
}


