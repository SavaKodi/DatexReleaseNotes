import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'

export function useReleasesOptions() {
  return useQuery<{ id: string; version: string; release_date: string }[], Error>({
    queryKey: ['releases-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, version, release_date')
        .order('release_date', { ascending: false })
      if (error) throw error
      return (data as Tables<'releases'>[]).map((r) => ({ id: r.id, version: r.version, release_date: r.release_date }))
    },
    staleTime: 5 * 60 * 1000,
  })
}


