import { supabase } from '@/lib/supabase/client'
import type { Tables, TablesInsert } from '@/types/supabase'

export type Abbrev = Tables<'abbreviations'>

export async function fetchAbbreviations(): Promise<Abbrev[]> {
  const { data, error } = await supabase.from('abbreviations').select('*').order('key')
  if (error) throw error
  return data ?? []
}

const defaultAbbreviations: Array<Pick<Abbrev, 'key' | 'value'>> = [
  { key: 'LP', value: 'License Plate' },
  { key: 'CLP', value: 'Composite License Plate' },
  { key: 'FP', value: 'FootPrint' },
  { key: 'ASN', value: 'Advance Shipping Notice' },
  { key: 'UDF', value: 'User Defined Fields' },
]

export function addDefaults(entries: Abbrev[]): Abbrev[] {
  const out: Abbrev[] = [...entries]
  const existing = new Set(entries.map((e) => `${e.key}::${e.value}`.toLowerCase()))
  for (const d of defaultAbbreviations) {
    const fingerprint = `${d.key}::${d.value}`.toLowerCase()
    if (!existing.has(fingerprint)) {
      out.push({ id: `default:${d.key}`, key: d.key, value: d.value, created_at: new Date(0).toISOString() } as Abbrev)
    }
  }
  return out
}

export async function upsertAbbreviation(input: { id?: string; key: string; value: string }) {
  const payload: TablesInsert<'abbreviations'> = {
    id: input.id,
    key: input.key,
    value: input.value,
  }
  if (input.id) {
    const { data, error } = await supabase.from('abbreviations').update(payload).eq('id', input.id).select('*')
    if (error) throw error
    return data?.[0] as Abbrev
  }
  const { data, error } = await supabase.from('abbreviations').insert(payload).select('*')
  if (error) throw error
  return data?.[0] as Abbrev
}

export async function deleteAbbreviation(id: string) {
  const { error } = await supabase.from('abbreviations').delete().eq('id', id)
  if (error) throw error
}

export type AbbrevIndex = {
  byKey: Map<string, Set<string>>
  byValue: Map<string, Set<string>>
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

export function buildAbbreviationIndex(entries: Abbrev[]): AbbrevIndex {
  const byKey = new Map<string, Set<string>>()
  const byValue = new Map<string, Set<string>>()
  for (const e of entries) {
    const key = normalize(e.key)
    const value = normalize(e.value)
    if (!byKey.has(key)) byKey.set(key, new Set<string>())
    byKey.get(key)!.add(value)
    if (!byValue.has(value)) byValue.set(value, new Set<string>())
    byValue.get(value)!.add(key)
  }
  return { byKey, byValue }
}

export function expandTermsBidirectionally(terms: string[], index: AbbrevIndex): string[] {
  const out = new Set<string>()
  for (const term of terms) {
    const t = normalize(term)
    out.add(t)
    const keyVals = index.byKey.get(t)
    if (keyVals) for (const v of keyVals) out.add(v)
    const revKeys = index.byValue.get(t)
    if (revKeys) for (const k of revKeys) out.add(k)
  }
  return Array.from(out)
}

export function expandSingleTermBidirectionally(term: string, index: AbbrevIndex): string[] {
  const out = new Set<string>()
  const t = normalize(term)
  out.add(t)
  const keyVals = index.byKey.get(t)
  if (keyVals) for (const v of keyVals) out.add(v)
  const revKeys = index.byValue.get(t)
  if (revKeys) for (const k of revKeys) out.add(k)
  return Array.from(out)
}

export function buildHighlightRegex(terms: string[]): RegExp | null {
  const safeTerms = Array.from(new Set(terms.map((t) => t.trim()).filter(Boolean))).map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  if (safeTerms.length === 0) return null
  return new RegExp(`(\\b(?:${safeTerms.join('|')})\\b)`, 'ig')
}


