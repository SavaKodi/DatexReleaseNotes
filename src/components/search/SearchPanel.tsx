import { useEffect, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import type { ComponentFilter, SearchFilters } from '@/types/search'
import { cn } from '@/lib/utils/cn'
import { useSearchSuggestions } from '@/hooks/useSearchHistory'
import { useReleasesOptions } from '@/hooks/useReleasesOptions'
import { CUTOFF_DATE } from '@/lib/parser/releaseParser'

type Props = {
  value: SearchFilters
  onChange: (next: SearchFilters) => void
  onClear: () => void
}

const COMPONENT_OPTIONS: { label: string; value: ComponentFilter }[] = [
  { label: 'Mobile Web', value: 'mobile_web' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'API', value: 'api' },
  { label: 'HTML5 Portal', value: 'html5_portal' },
]

export function SearchPanel({ value, onChange, onClear }: Props) {
  const [query, setQuery] = useState(value.query)
  const [dateError, setDateError] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 300)
  const { data: suggestions } = useSearchSuggestions(query)
  const { data: releases } = useReleasesOptions()

  // propagate debounced query after render commit
  useEffect(() => {
    if (debouncedQuery !== value.query) {
      onChange({ ...value, query: debouncedQuery })
    }
  }, [debouncedQuery, value, onChange])

  // Validate date range
  useEffect(() => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      setDateError('"From" date cannot be after "To" date')
    } else {
      setDateError(null)
    }
  }, [value.dateFrom, value.dateTo])

  const toggleComponent = (v: ComponentFilter) => {
    const exists = value.components.includes(v)
    const next = exists ? value.components.filter((c) => c !== v) : [...value.components, v]
    onChange({ ...value, components: next })
  }

  const handleDateFromChange = (dateFrom: string | undefined) => {
    onChange({ ...value, dateFrom })
  }

  const handleDateToChange = (dateTo: string | undefined) => {
    onChange({ ...value, dateTo })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-white/90">Search</label>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search release notes…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur px-4 py-4 text-base md:text-lg text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#6B46C1] transition shadow-[0_0_0_1px_rgba(107,70,193,0.08)]"
          />
          <div className="absolute right-2 top-2">
            <div className="group relative inline-block">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 text-xs text-zinc-300">i</div>
              <div className="pointer-events-none absolute right-0 z-10 hidden w-64 rounded-md border border-zinc-800 bg-zinc-900/95 p-3 text-xs text-zinc-300 shadow-lg group-hover:block">
                Only releases from {CUTOFF_DATE} and later are included. For older notes, email QA at QA@datexcorp.com.
              </div>
            </div>
          </div>
          {suggestions && suggestions.length > 0 && query && (
            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/85 backdrop-blur shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="block w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
          <input
            id="titlesOnly"
            type="checkbox"
            checked={value.titlesOnly}
            onChange={(e) => onChange({ ...value, titlesOnly: e.target.checked })}
          />
          <label htmlFor="titlesOnly">Search titles only</label>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-white/90">Components</div>
        <div className="flex flex-wrap gap-2">
          {COMPONENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleComponent(opt.value)}
              className={cn(
              'rounded-full border px-3 py-1 text-xs transition backdrop-blur-sm',
              value.components.includes(opt.value)
                  ? 'border-[#6B46C1]/50 bg-[#6B46C1]/20 text-white'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:border-zinc-700'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-white/90">Logic</div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="logic"
              checked={value.logic === 'AND'}
              onChange={() => onChange({ ...value, logic: 'AND' })}
            />
            AND
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="logic"
              checked={value.logic === 'OR'}
              onChange={() => onChange({ ...value, logic: 'OR' })}
            />
            OR
          </label>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-white/90">Releases</div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={value.dateFrom ?? ''}
            onChange={(e) => handleDateFromChange(e.target.value || undefined)}
            className={cn(
              "rounded-md border backdrop-blur px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#6B46C1] transition",
              dateError ? "border-red-500 bg-red-900/20" : "border-zinc-800 bg-zinc-900/50"
            )}
          >
            <option value="">From (any)</option>
            {releases?.map((r) => (
              <option key={r.id} value={r.release_date}>
                {r.version}
              </option>
            ))}
          </select>
          <select
            value={value.dateTo ?? ''}
            onChange={(e) => handleDateToChange(e.target.value || undefined)}
            className={cn(
              "rounded-md border backdrop-blur px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#6B46C1] transition",
              dateError ? "border-red-500 bg-red-900/20" : "border-zinc-800 bg-zinc-900/50"
            )}
          >
            <option value="">To (any)</option>
            {releases?.map((r) => (
              <option key={r.id} value={r.release_date}>
                {r.version}
              </option>
            ))}
          </select>
        </div>
        {dateError && (
          <div className="mt-2 text-sm text-red-400">
            {dateError}
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={() => onClear()}
          className="w-full rounded-md border border-[#6B46C1]/40 bg-[#6B46C1]/20 backdrop-blur px-4 py-3 text-sm text-white hover:border-[#6B46C1]/60 transition shadow-[0_0_0_1px_rgba(107,70,193,0.14)]"
        >
          Clear all filters
        </button>
      </div>
    </div>
  )
}


