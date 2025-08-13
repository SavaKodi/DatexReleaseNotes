import { expandTermsBidirectionally, type AbbrevIndex } from '@/lib/abbreviations/service'

export type LogicOp = 'AND' | 'OR'

export type ProcessedQuery = {
  logic: LogicOp
  terms: string[]
  expandedTerms: string[]
  highlightTerms: string[]
}

function tokenize(input: string): string[] {
  const tokens: string[] = []
  const re = /"([^"]+)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input))) {
    tokens.push((m[1] || m[2]).trim())
  }
  return tokens
}

export function processQuery(raw: string, index?: AbbrevIndex): ProcessedQuery {
  const logic: LogicOp = /\bOR\b|\|\|/i.test(raw) ? 'OR' : 'AND'
  const cleaned = raw.replace(/\b(AND|OR)\b|\&\&|\|\|/gi, ' ').trim()
  const terms = tokenize(cleaned).map((t) => t.toLowerCase())
  const expanded = index ? expandTermsBidirectionally(terms, index) : terms
  const highlightTerms = Array.from(new Set([...terms, ...expanded]))
  return { logic, terms, expandedTerms: expanded, highlightTerms }
}


