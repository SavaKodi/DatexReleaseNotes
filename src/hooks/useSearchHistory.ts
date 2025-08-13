import { useQuery } from '@tanstack/react-query'

export function useSearchSuggestions(prefix: string) {
  return useQuery({
    queryKey: ['search-suggestions', prefix],
    queryFn: () => Promise.resolve([]), // Simplified - return empty suggestions
    enabled: false, // Disable for now
    staleTime: 60_000,
  })
}