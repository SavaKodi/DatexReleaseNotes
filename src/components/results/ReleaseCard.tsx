import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { Tables } from '@/types/supabase'
import { useAbbreviations } from '@/hooks/useAbbreviations'
import { buildHighlightRegex } from '@/lib/abbreviations/service'
import { processQuery } from '@/lib/search/query'

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

type Props = {
  item: ReleaseItemRow
  query: string
}

function useHighlighter(query: string) {
  const { index } = useAbbreviations()
  const regex = useMemo(() => {
    if (!query) return null
    const processed = processQuery(query, index)
    return buildHighlightRegex(processed.highlightTerms)
  }, [query, index])
  return (text: string) => {
    if (!regex) return text
    const parts = text.split(regex)
    return parts.map((chunk, i) =>
      regex.test(chunk) ? (
        <mark key={i} className="bg-[#6B46C1]/30 text-white rounded-sm px-0.5">{chunk}</mark>
      ) : (
        <span key={i}>{chunk}</span>
      )
    )
  }
}

const componentColor: Record<string, string> = {
  mobile_web: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  desktop: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  api: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  html5_portal: 'bg-pink-500/20 text-pink-200 border-pink-500/30',
}

export function ReleaseCard({ item, query }: Props) {
  const [expanded, setExpanded] = useState(false)
  const adoUrl = item.azure_link ?? (item.azure_devops_id ? `https://dev.azure.com/DatexCorporation/Datex%20Agile%20Teams/_workitems/edit/${item.azure_devops_id}` : null)
  const date = item.releases?.release_date
  const version = item.releases?.version
  const highlight = useHighlighter(query)

  return (
    <div className="interactive-card rounded-xl border border-zinc-800/70 bg-zinc-900/40 backdrop-blur p-5 transition hover:border-[#6B46C1]/30 hover:shadow-[0_0_0_1px_rgba(107,70,193,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-base font-semibold text-white">
          {highlight(item.title)}
        </div>
        <div className="flex items-center gap-2">
          {version && (
            <span className="rounded-md border border-[#6B46C1]/30 bg-[#6B46C1]/20 backdrop-blur px-2.5 py-1 text-xs text-white">
              {version}
            </span>
          )}
          {date && (
            <span className="rounded-md border border-zinc-800 bg-zinc-900/50 backdrop-blur px-2.5 py-1 text-xs text-zinc-300">
              {new Date(date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {item.component && (
          <span className={cn('rounded-full border px-2 py-0.5 text-xs', componentColor[item.component] ?? '')}>
            {item.component.replace('_', ' ')}
          </span>
        )}
        {adoUrl && (
          <a
            href={adoUrl}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-md border border-[#6B46C1]/50 bg-[#6B46C1]/25 px-3 py-1.5 text-sm text-white hover:border-[#6B46C1]/70 hover:bg-[#6B46C1]/35 transition shadow-[0_2px_12px_rgba(107,70,193,0.15)]"
          >
            <svg className="h-4 w-4 opacity-90 group-hover:opacity-100" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3 3h18v18H3z" fill="none"/>
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/>
              <path d="M5 5h6v2H7v9h9v-4h2v6H5z"/>
            </svg>
            Azure DevOps #{item.azure_devops_id}
          </a>
        )}
        <button
          onClick={() => {
            if (item.azure_devops_id) navigator.clipboard.writeText(String(item.azure_devops_id))
          }}
          className="rounded-md border border-zinc-700/60 bg-zinc-800/40 backdrop-blur px-2.5 py-1 text-xs text-zinc-200 hover:border-[#6B46C1]/40 hover:text-white transition"
        >
          Copy ID
        </button>
      </div>

      <div className="mt-4 text-sm leading-6 text-zinc-200">
        <div className={cn('line-clamp-3', expanded && 'line-clamp-none')}>{highlight(item.description)}</div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs text-[#cbb2ff] hover:text-white transition"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      </div>
    </div>
  )
}

export function ReleaseCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 animate-pulse">
      <div className="h-4 w-2/3 rounded bg-zinc-800" />
      <div className="mt-2 h-3 w-full rounded bg-zinc-800" />
      <div className="mt-1 h-3 w-4/5 rounded bg-zinc-800" />
    </div>
  )
}


