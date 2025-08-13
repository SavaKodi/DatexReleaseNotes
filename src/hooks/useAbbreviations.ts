import { useQuery } from '@tanstack/react-query'
import { addDefaults, buildAbbreviationIndex, fetchAbbreviations } from '@/lib/abbreviations/service'

export function useAbbreviations() {
  const q = useQuery({
    queryKey: ['abbreviations'],
    queryFn: fetchAbbreviations,
    staleTime: 1000 * 60 * 5,
  })
  const augmented = q.data ? addDefaults(q.data) : undefined
  const index = augmented ? buildAbbreviationIndex(augmented) : undefined
  return { ...q, index }
}


