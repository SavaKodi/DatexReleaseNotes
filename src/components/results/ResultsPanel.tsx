import { useMemo, useRef } from 'react'
import { useInfiniteReleases } from '@/hooks/useInfiniteReleases'
import type { SearchFilters, SortOption } from '@/types/search'
import type { Tables } from '@/types/supabase'
import { ReleaseCard, ReleaseCardSkeleton } from './ReleaseCard'

type Props = {
  filters: SearchFilters
  onSortChange: (s: SortOption) => void
}

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

export function ResultsPanel({ filters, onSortChange }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error } = useInfiniteReleases(filters) as any
  const allItems = useMemo<ReleaseItemRow[]>(
    () => data?.pages.flatMap((p: { items: ReleaseItemRow[] }) => p.items) ?? [],
    [data]
  )
  const totalCount = data?.pages?.[0]?.totalCount

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
  }, [sentinelRef.current, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-400">
          {status === 'pending'
            ? 'Loading…'
            : totalCount !== undefined
            ? `${totalCount} results`
            : `${allItems.length} results`}
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

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-red-500/30 bg-red-900/20 backdrop-blur p-10 text-center">
          <div className="mb-3 h-12 w-12 rounded-full bg-red-500/20" />
          <div className="text-white">Search failed</div>
          <div className="text-sm text-zinc-200">{String((error as any)?.message ?? error ?? 'Unknown error')}</div>
        </div>
      )}

      {status === 'success' && allItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#6B46C1]/30 bg-zinc-900/40 backdrop-blur p-10 text-center">
          <div className="mb-3 h-12 w-12 rounded-full bg-[#6B46C1]/20" />
          <div className="text-white">No results</div>
          <div className="text-sm text-zinc-300">Try adjusting your filters or search terms</div>
        </div>
      )}

      {status === 'success' && allItems.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {allItems.map((item: ReleaseItemRow) => (
            <ReleaseCard key={item.id} item={item} query={filters.query} />
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