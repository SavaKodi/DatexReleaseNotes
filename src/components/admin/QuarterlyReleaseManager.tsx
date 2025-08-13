import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { getQuarterInfo, getQuarterColorScheme } from '@/lib/utils/releaseUtils'

export function QuarterlyReleaseManager() {
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch all releases
  const { data: releases, isLoading } = useQuery<Tables<'releases'>[]>({
    queryKey: ['all-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('release_date', { ascending: false })
      
      if (error) throw error
      return data || []
    }
  })

  const toggleQuarterly = async (releaseId: string, currentValue: boolean | null) => {
    setIsUpdating(releaseId)
    setError(null)
    
    try {
      const newValue = currentValue === true ? false : true
      
      console.log('Updating release:', releaseId, 'from', currentValue, 'to', newValue)
      
      // Update and return updated rows so we can verify success
      const { error, data } = await supabase
        .from('releases')
        .update({ is_quarterly: newValue })
        .eq('id', releaseId)
        .select()
      
      console.log('Update result:', { error, dataLength: Array.isArray(data) ? data.length : null })
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      const updatedCount = Array.isArray(data) ? data.length : 0
      if (updatedCount === 0) {
        throw new Error('No rows were updated. Release may not exist or you may not have permission.')
      }
      
      console.log('Update successful, rows affected:', updatedCount)
      
      // Force refresh the releases list
      await queryClient.invalidateQueries({ queryKey: ['all-releases'] })
      await queryClient.refetchQueries({ queryKey: ['all-releases'] })
      // Also refresh any cached release data
      queryClient.invalidateQueries({ queryKey: ['releases-options'] })
      queryClient.invalidateQueries({ queryKey: ['release-items'] })
      
      console.log('Queries invalidated')
    } catch (e: any) {
      console.error('Toggle quarterly failed:', e)
      setError(e.message ?? 'Failed to update release')
    } finally {
      setIsUpdating(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-lg font-semibold">Official Release Manager</div>
        <div className="text-zinc-400">Loading releases...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Official Release Manager</div>
      <div className="text-sm text-zinc-400">
        Mark releases as official. Simple toggle to manually mark important releases.
      </div>
      
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md p-3">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        {releases?.map((release) => {
          const quarterInfo = (() => {
            try {
              return getQuarterInfo(release.version, release.release_date, release.is_quarterly)
            } catch {
              return null
            }
          })()
          
          return (
            <div
              key={release.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border transition',
                release.is_quarterly === true
                  ? 'border-green-500/50 bg-green-900/20'
                  : 'border-zinc-800 bg-zinc-900/30'
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{release.version}</span>
                  <span className="text-sm text-zinc-400">
                    {new Date(release.release_date).toLocaleDateString()}
                  </span>
                  
                  {release.is_quarterly === true && (
                    <span className="rounded-md border border-green-500/50 bg-green-500/20 px-2 py-1 text-xs font-medium text-green-200">
                      ✓ OFFICIAL RELEASE
                    </span>
                  )}
                  
                  {quarterInfo && (
                    <span className={cn(
                      'rounded-md border px-2 py-1 text-xs font-medium',
                      getQuarterColorScheme(quarterInfo.quarter)
                    )}>
                      {quarterInfo.label}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => {
                  console.log('Button clicked for release:', release.id, release.version, release.is_quarterly)
                  toggleQuarterly(release.id, release.is_quarterly)
                }}
                disabled={isUpdating === release.id}
                className={cn(
                  'rounded-md border px-4 py-2 text-sm transition',
                  release.is_quarterly === true
                    ? 'border-amber-700 bg-amber-900/30 text-amber-200 hover:border-amber-600'
                    : 'border-[#6B46C1]/40 bg-[#6B46C1]/20 text-white hover:border-[#6B46C1]/60',
                  isUpdating === release.id && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isUpdating === release.id ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : release.is_quarterly === true ? (
                  'Revert as Official'
                ) : (
                  'Mark as Official'
                )}
              </button>
            </div>
          )
        })}
      </div>
      
      {releases && releases.length === 0 && (
        <div className="text-center py-8 text-zinc-400">
          No releases found.
        </div>
      )}
    </div>
  )
}