import { useQuery } from '@tanstack/react-query'
import { getSearchSuggestions } from '@/lib/search/history'

export function useSearchSuggestions(prefix: string) {
  return useQuery({
    queryKey: ['search-suggestions', prefix],
    queryFn: () => getSearchSuggestions(prefix),
    enabled: !!prefix && prefix.length >= 2,
    staleTime: 60_000,
  })
}


