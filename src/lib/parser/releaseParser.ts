import type { Enums } from '@/types/supabase'

export type ParsedCategory = 'bug' | 'core_development' | 'implementation'

export type ParsedItem = {
  azureDevopsId: number | null
  title: string
  description: string
  component: Enums<'component_type'> | null
  category: ParsedCategory | null
}

export type ParsedRelease = {
  version: string
  releaseDate: string
  items: ParsedItem[]
}

const componentSynonyms: Record<string, Enums<'component_type'>> = {
  'html5 portal': 'html5_portal',
  portal: 'html5_portal',
  'mobile web': 'mobile_web',
  mobile: 'mobile_web',
  desktop: 'desktop',
  client: 'desktop',
  api: 'api',
  'rest api': 'api',
}

function normalize(text: string) {
  return text.toLowerCase().trim()
}

function detectComponent(text: string): Enums<'component_type'> | null {
  const n = normalize(text)
  for (const key of Object.keys(componentSynonyms)) {
    const re = new RegExp(`(^|\W)${key}(\W|$)`, 'i')
    if (re.test(n)) return componentSynonyms[key]
  }
  return null
}

function detectCategory(title: string, description: string): ParsedCategory | null {
  const blob = `${title}\n${description}`.toLowerCase()
  if (/(bug|fix|fixed|error|issue|defect|hotfix)/i.test(blob)) return 'bug'
  if (/(implement|implementation|feature|add|support|enable)/i.test(blob)) return 'implementation'
  if (/(core|refactor|performance|optimi[sz]e|infra|architecture)/i.test(blob)) return 'core_development'
  return null
}

function parseDateToken(token: string): { iso: string; version: string } | null {
  const t = token.trim()
  // Handle yyyy.mm.dd or yyyy-mm-dd
  let m = t.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/)
  if (m) {
    const yyyy = Number(m[1])
    const mm = Number(m[2])
    const dd = Number(m[3])
    const iso = new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString()
    // Normalize version as yy.mm.dd (common release version format)
    const version = `${String(yyyy).slice(-2)}.${String(mm).padStart(2, '0')}.${String(dd).padStart(2, '0')}`
    return { iso, version }
  }
  // Handle dd.mm.yyyy or mm.dd.yyyy (disambiguate by month/day ranges)
  m = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const yyyy = Number(m[3])
    let dd: number
    let mm: number
    if (a > 12 && b <= 12) {
      dd = a
      mm = b
    } else if (b > 12 && a <= 12) {
      dd = b
      mm = a
    } else {
      // Ambiguous: prefer dd.mm.yyyy
      dd = a
      mm = b
    }
    const iso = new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString()
    const version = `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${String(yyyy).slice(-2)}`
    return { iso, version }
  }
  // Handle 2-2-2 tokens with heuristics: could be yy.mm.dd or dd.mm.yy
  m = t.match(/^(\d{2})[.\/-](\d{2})[.\/-](\d{2})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const c = Number(m[3])
    const toYear = (yy: number) => 2000 + yy
    // Heuristic:
    // - If first looks like a year (20-39), interpret as yy.mm.dd
    // - Else if last looks like a year (20-39), interpret as dd.mm.yy
    // - Else prefer yy.mm.dd when valid, otherwise fallback to dd.mm.yy
    if (a >= 20 && a <= 39 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
      const yyyy = toYear(a)
      const mm = b
      const dd = c
      const iso = new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString()
      const version = `${String(a).padStart(2, '0')}.${String(b).padStart(2, '0')}.${String(c).padStart(2, '0')}`
      return { iso, version }
    }
    if (c >= 20 && c <= 39 && b >= 1 && b <= 12 && a >= 1 && a <= 31) {
      const yyyy = toYear(c)
      const mm = b
      const dd = a
      const iso = new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString()
      const version = `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${String(c).padStart(2, '0')}`
      return { iso, version }
    }
    // Fallbacks when both look plausible: try yy.mm.dd first
    const yyFirst = a
    const mm1 = b
    const dd1 = c
    if (mm1 >= 1 && mm1 <= 12 && dd1 >= 1 && dd1 <= 31) {
      const yyyy = toYear(yyFirst)
      const iso = new Date(Date.UTC(yyyy, mm1 - 1, dd1)).toISOString()
      const version = `${String(a).padStart(2, '0')}.${String(b).padStart(2, '0')}.${String(c).padStart(2, '0')}`
      return { iso, version }
    }
    // Else fallback to dd.mm.yy
    const dd2 = a
    const mm2 = b
    const yyyy2 = toYear(c)
    const iso = new Date(Date.UTC(yyyy2, mm2 - 1, dd2)).toISOString()
    const version = `${String(dd2).padStart(2, '0')}.${String(mm2).padStart(2, '0')}.${String(c).padStart(2, '0')}`
    return { iso, version }
  }
  // mm/dd/yyyy or dd/mm/yyyy
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const yPart = m[3]
    const yyyy = Number(yPart.length === 2 ? `${Number(yPart) + 2000}` : yPart)
    let dd: number
    let mm: number
    if (a > 12 && b <= 12) {
      dd = a
      mm = b
    } else if (b > 12 && a <= 12) {
      dd = b
      mm = a
    } else {
      // Ambiguous: prefer dd/mm
      dd = a
      mm = b
    }
    const iso = new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString()
    const version = `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${String(yyyy).slice(-2)}`
    return { iso, version }
  }
  return null
}

export function parseReleaseNotes(text: string): ParsedRelease {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
  const lines = normalized.split('\n')
  let releaseDateIso = ''
  let version = ''
  const items: ParsedItem[] = []

  // Prefer a standalone header-like version line near the top
  const headerCandidates: { line: string; idx: number }[] = []
  for (let i = 0; i < Math.min(lines.length, 100); i += 1) {
    const l = lines[i].trim()
    if (!l) continue
    // Consider only very short lines that look like a version/date token or prefixed with 'version'/'release'
    if (l.length <= 20) {
      const m = l.match(/^(?:version|release|footprint\s*version)\s*[:\-]?\s*(\d{2}[.\/-]\d{2}[.\/-](\d{2})(\d{2})?)$/i)
      const n = l.match(/^(\d{2}[.\/-]\d{2}[.\/-](\d{2})(\d{2})?)$/)
      const token = (m?.[1] ?? n?.[1])?.trim()
      if (token) headerCandidates.push({ line: token, idx: i })
    }
  }
  if (headerCandidates.length > 0) {
    // Choose the first header-like candidate; these are more trustworthy than inline tokens
    const chosen = headerCandidates[0].line
    const parsed = parseDateToken(chosen)
    if (parsed) {
      releaseDateIso = parsed.iso
      version = parsed.version
    }
  }
  if (!releaseDateIso) {
    // Fallback: scan all lines for standalone tokens; then pick the last occurrence to avoid inline dates inside descriptions
    const standalone: string[] = []
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i].trim()
      if (!l) continue
      if (/^(\d{2}[.\/-]\d{2}[.\/-](\d{2})(\d{2})?)$/.test(l)) standalone.push(l)
    }
    if (standalone.length > 0) {
      const candidate = standalone[standalone.length - 1]
      const parsed = parseDateToken(candidate)
      if (parsed) {
        releaseDateIso = parsed.iso
        version = parsed.version
      }
    }
  }
  if (!releaseDateIso) {
    // Final fallback: scan the entire text for any date-like token (including mm/dd/yyyy) and pick the last match
    const blob = lines.join('\n')
    const regexes = [
      /(\b\d{2}[.\/-]\d{2}[.\/-](\d{2})(\d{2})?\b)/g, // dd.mm.yy or dd.mm.yyyy
      /(\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/g, // mm/dd/yyyy or dd/mm/yyyy
    ]
    for (const re of regexes) {
      let match: RegExpExecArray | null
      let lastToken: string | null = null
      // eslint-disable-next-line no-cond-assign
      while ((match = re.exec(blob)) !== null) {
        lastToken = match[1]
      }
      if (lastToken) {
        const parsed = parseDateToken(lastToken)
        if (parsed) {
          releaseDateIso = parsed.iso
          version = parsed.version
          break
        }
      }
    }
  }
  if (!releaseDateIso) throw new Error('Unable to parse release date/version')

  // Parse items
  let current: ParsedItem | null = null
  const flush = () => {
    if (!current) return
    current.description = current.description.trim()
    if (!current.component) {
      const inferred = detectComponent(`${current.title}\n${current.description}`)
      if (inferred) current.component = inferred
    }
    current.category = detectCategory(current.title, current.description)
    items.push(current)
    current = null
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line || /^-+$/.test(line)) continue

    // Treat standalone date/version tokens as separators between items
    if (/^(\d{2}[.\/-]\d{2}[.\/-](\d{2})(\d{2})?)$/.test(line)) {
      flush()
      continue
    }

    // Pattern A: New item header that starts with Azure ID then text
    const itemHeader = line.match(/^(\d{4,9})\s+(.+)$/)
    if (itemHeader) {
      flush()
      const azureId = Number(itemHeader[1])
      const rest = itemHeader[2]
      let title = rest
      let component: Enums<'component_type'> | null = null
      const parts = rest.split(/\s+-\s+/)
      if (parts.length >= 2) {
        const compCandidate = parts[0]
        const comp = detectComponent(compCandidate)
        if (comp) {
          component = comp
          title = parts.slice(1).join(' - ')
        }
      }
      current = {
        azureDevopsId: Number.isFinite(azureId) ? azureId : null,
        title: title.trim(),
        description: '',
        component,
        category: null,
      }
      continue
    }

    // Pattern B: Metadata line like "ID: 214984 | Component: mobile_web | Category: bug"
    const meta = line.match(/^id\s*:\s*(\d{3,9})(?:\s*\|\s*component\s*:\s*([^|]+))?(?:\s*\|\s*category\s*:\s*([^|]+))?/i)
    if (meta) {
      flush()
      const azureId = Number(meta[1])
      const compToken = meta[2]?.trim() ?? ''
      const catToken = meta[3]?.trim() ?? ''
      const prevTitle = (() => {
        for (let j = i - 1; j >= 0; j -= 1) {
          const t = lines[j].trim()
          if (!t) continue
          if (/^id\s*:/i.test(t)) break
          if (/^(\d{2}[.\/-]\d{2}[.\/-](\d{2})(\d{2})?)$/.test(t)) break
          return t
        }
        return 'Untitled'
      })()
      const component = compToken ? detectComponent(compToken) : null
      let category: ParsedCategory | null = null
      const catN = catToken.toLowerCase()
      if (/bug|fix/.test(catN)) category = 'bug'
      else if (/implement|feature/.test(catN)) category = 'implementation'
      else if (/core|refactor|perf|infra/.test(catN)) category = 'core_development'
      current = {
        azureDevopsId: Number.isFinite(azureId) ? azureId : null,
        title: prevTitle,
        description: '',
        component,
        category,
      }
      continue
    }

    // Continuation of description
    if (current) {
      current.description += (current.description ? '\n' : '') + raw
    }
  }
  flush()

  return { version, releaseDate: releaseDateIso, items }
}

export function toSupabasePayload(parsed: ParsedRelease) {
  return {
    release: {
      version: parsed.version,
      // Store as YYYY-MM-DD for date column compliance
      release_date: parsed.releaseDate.slice(0, 10),
    },
    items: parsed.items.map((it) => ({
      title: it.title,
      description: it.description,
      azure_devops_id: it.azureDevopsId,
      component: it.component,
    })),
  }
}

// Multi-release parsing utilities

export const CUTOFF_DATE = '2023-05-19'

function isDashLine(s: string) {
  return /^-+$/.test(s.trim())
}

function extractReleaseSections(text: string): { headerIdx: number; dateLine: string; section: string }[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
  const lines = normalized.split('\n')
  const dateLineRegex = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})(\d{2})?$/
  const headers: number[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i].trim()
    if (!l) continue
    if (dateLineRegex.test(l)) {
      const hasDashAbove = i - 1 >= 0 && isDashLine(lines[i - 1])
      const hasDashBelow = i + 1 < lines.length && isDashLine(lines[i + 1])
      if (hasDashAbove || hasDashBelow) headers.push(i)
    }
  }
  if (headers.length === 0) {
    // Fallback: try to parse whole blob as a single release
    const single = parseReleaseNotes(text)
    return [
      {
        headerIdx: 0,
        dateLine: single.version,
        section: text,
      },
    ]
  }

  const sections: { headerIdx: number; dateLine: string; section: string }[] = []
  for (let h = 0; h < headers.length; h += 1) {
    const idx = headers[h]
    const nextIdx = h + 1 < headers.length ? headers[h + 1] : lines.length
    const dateLine = lines[idx].trim()

    // Determine where content starts: skip immediate dash line below if present
    let start = idx + 1
    if (start < lines.length && isDashLine(lines[start])) start += 1

    // Exclude trailing dash that belongs to next header block (the line just above next header if dash)
    // We'll simply end at nextIdx - 1 and let per-release parser ignore dashes
    const chunk = lines.slice(start, nextIdx).join('\n')
    // Ensure the date header is present at the top for reliable parsing
    const section = `${dateLine}\n${chunk}`.trim()
    sections.push({ headerIdx: idx, dateLine, section })
  }
  return sections
}

export function parseMultipleReleaseNotes(text: string): ParsedRelease[] {
  const t = text.trim()
  // If JSON provided, try to ingest directly
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const obj = JSON.parse(t)
      const arr = Array.isArray(obj) ? obj : [obj]
      const mapped: ParsedRelease[] = arr
        .map((r: any) => {
          if (!r) return null
          const versionToken: string | undefined = r.version || r.releaseDate
          let releaseDateIso = ''
          let version = ''
          if (versionToken) {
            const parsed = parseDateToken(String(versionToken))
            if (parsed) {
              releaseDateIso = parsed.iso
              version = parsed.version
            }
          }
          if (!releaseDateIso && typeof r.release_date === 'string') {
            // already in YYYY-MM-DD
            const dt = r.release_date
            if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
              releaseDateIso = new Date(`${dt}T00:00:00Z`).toISOString()
              version = `${dt.slice(8, 10)}.${dt.slice(5, 7)}.${dt.slice(2, 4)}`
            }
          }
          const items: ParsedItem[] = Array.isArray(r.items)
            ? r.items.map((it: any) => ({
                azureDevopsId: typeof it.azureDevopsId === 'number' ? it.azureDevopsId : typeof it.azure_devops_id === 'number' ? it.azure_devops_id : null,
                title: String(it.title ?? ''),
                description: String(it.description ?? ''),
                component: it.component ?? null,
                category: (it.category as ParsedCategory) ?? null,
              }))
            : []
          if (!releaseDateIso) return null
          return { version, releaseDate: releaseDateIso, items }
        })
        .filter(Boolean) as ParsedRelease[]
      return mapped.filter((r) => r.releaseDate.slice(0, 10) >= CUTOFF_DATE)
    } catch {
      // fallthrough to text parsing
    }
  }

  const sections = extractReleaseSections(text)
  const parsed: ParsedRelease[] = []
  for (const s of sections) {
    try {
      const pr = parseReleaseNotes(s.section)
      if (pr.releaseDate.slice(0, 10) >= CUTOFF_DATE) parsed.push(pr)
    } catch {
      // ignore bad sections
    }
  }
  return parsed
}

export function toSupabasePayloads(releases: ParsedRelease[]) {
  return releases.map((r) => toSupabasePayload(r))
}


