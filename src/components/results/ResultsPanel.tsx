import { useMemo, useRef } from 'react'
import { useInfiniteReleases } from '@/hooks/useInfiniteReleases'
import type { SearchFilters, SortOption } from '@/types/search'
import { ReleaseCard, ReleaseCardSkeleton } from './ReleaseCard'
import { createReleaseItemsFuseIndex, createReleaseItemsFuseIndexTitleOnly } from '@/lib/search/fuse'
import { processQuery } from '@/lib/search/query'
import { useAbbreviations } from '@/hooks/useAbbreviations'
import { recordSearch } from '@/lib/search/history'

type Props = {
  filters: SearchFilters
  onSortChange: (s: SortOption) => void
}

export function ResultsPanel({ filters, onSortChange }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteReleases(filters)
  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])
  const { index } = useAbbreviations()
  const processed = useMemo(() => processQuery(filters.query, index), [filters.query, index])
  const fuse = useMemo(() => {
    if (!filters.query) return null
    // When titlesOnly is false and sort is relevance, we now rely on server-side ranking
    if (!filters.titlesOnly && filters.sort === 'relevance') return null
    return filters.titlesOnly ? createReleaseItemsFuseIndexTitleOnly(allItems) : createReleaseItemsFuseIndex(allItems)
  }, [allItems, filters.query, filters.titlesOnly, filters.sort])
  const filtered = useMemo(() => {
    if (!filters.query) return allItems
    if (filters.sort !== 'relevance') return allItems
    if (!fuse) return allItems
    const terms = processed.expandedTerms.slice(0, 8)
    if (terms.length === 0) return allItems
    const resultsPerTerm = terms.map((t) => fuse.search(t))
    const scoreMap = new Map<string, number>()
    const itemMap = new Map<string, typeof allItems[number]>()
    if (processed.logic === 'AND') {
      const idSets = resultsPerTerm.map((arr) => new Set(arr.map((r) => r.item.id)))
      const baseIds = resultsPerTerm[0]?.map((r) => r.item.id) ?? []
      const intersection = baseIds.filter((id) => idSets.every((s) => s.has(id)))
      for (const id of intersection) {
        let agg = 0
        for (const arr of resultsPerTerm) {
          const found = arr.find((r) => r.item.id === id)
          if (found) {
            agg += found.score ?? 0
            itemMap.set(id, found.item as any)
          }
        }
        scoreMap.set(id, agg / resultsPerTerm.length)
      }
    } else {
      for (const arr of resultsPerTerm) {
        for (const r of arr) {
          const prev = scoreMap.get(r.item.id)
          const next = r.score ?? 0
          if (prev === undefined || next < prev) {
            scoreMap.set(r.item.id, next)
            itemMap.set(r.item.id, r.item as any)
          }
        }
      }
    }
    const ids = Array.from(scoreMap.keys())
    ids.sort((a, b) => (scoreMap.get(a)! - scoreMap.get(b)!))
    return ids.map((id) => itemMap.get(id)!).filter(Boolean)
  }, [fuse, processed, allItems, filters.query, filters.sort])

  useMemo(() => {
    if (status === 'success' && filters.query.trim()) {
      const serverCount = data?.pages?.[0]?.totalCount
      const resultsCount = serverCount ?? (filters.sort === 'relevance' && !filters.titlesOnly ? allItems.length : filtered.length)
      recordSearch(filters.query, resultsCount).catch(() => {})
    }
  }, [status, filters.query, filtered.length, allItems.length, data?.pages])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  // Simple intersection observer for infinite scroll
  useMemo(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const io = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [sentinelRef.current, hasNextPage, isFetchingNextPage])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-400">
          {status === 'pending'
            ? 'Loading…'
            : (() => {
                const serverCount = data?.pages?.[0]?.totalCount
                const count = serverCount ?? (filters.sort === 'relevance' && !filters.titlesOnly ? allItems.length : filtered.length)
                return `${count} results`
              })()}
        </div>
        <select
          value={filters.sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded-md border border-[#6B46C1]/40 bg-[#6B46C1]/20 backdrop-blur px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#6B46C1]"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="relevance">Relevance</option>
        </select>
      </div>

      {status === 'pending' && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReleaseCardSkeleton key={i} />
          ))}
        </div>
      )}

      {status === 'success' &&
        ((filters.sort !== 'relevance' && allItems.length === 0) ||
          (filters.sort === 'relevance' && filters.query && filtered.length === 0)) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#6B46C1]/30 bg-zinc-900/40 backdrop-blur p-10 text-center">
          <div className="mb-3 h-12 w-12 rounded-full bg-[#6B46C1]/20" />
          <div className="text-white">No results</div>
          <div className="text-sm text-zinc-300">Try adjusting your filters</div>
        </div>
      )}

          {status === 'success' && (filters.sort === 'relevance' && !filters.titlesOnly ? allItems.length > 0 : filtered.length > 0) && (
        <div className="grid grid-cols-1 gap-3">
          {(filters.sort === 'relevance' && !filters.titlesOnly ? allItems : filtered).map((item) => (
            <ReleaseCard key={item.id} item={item as any} query={filters.query} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ReleaseCardSkeleton key={`next-${i}`} />
          ))}
        </div>
      )}
    </div>
  )
}


