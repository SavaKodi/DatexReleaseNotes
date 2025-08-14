import { useState } from 'react'
import { useReleasesOptions } from '@/hooks/useReleasesOptions'
import { IssueAnalyzer } from '@/lib/ai/issueAnalyzer'
import { cn } from '@/lib/utils/cn'
import type { AISearchResult } from '@/types/ai'

type Props = {
  onResults: (result: AISearchResult, userIssue: string, currentVersion: string) => void
  onClear: () => void
}

type SearchState = 'idle' | 'analyzing' | 'completed' | 'error'

export function AISearchSection({ onResults, onClear }: Props) {
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [userIssue, setUserIssue] = useState('')
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [error, setError] = useState<string | null>(null)

  const { data: releases } = useReleasesOptions()
  const issueAnalyzer = new IssueAnalyzer()

  const handleSearch = async () => {
    if (!currentVersion || !userIssue.trim()) {
      setError('Please select your current version and describe your issue')
      return
    }

    setSearchState('analyzing')
    setError(null)
    onClear() // Clear any previous results

    try {
      const availableVersions = releases?.map(r => r.version) || []

      const result = await issueAnalyzer.analyzeIssue({
        userIssue,
        currentVersion,
        availableVersions
      })

      setSearchState('completed')
      onResults(result, userIssue, currentVersion)
    } catch (err) {
      console.error('AI search failed:', err)
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
      setSearchState('error')
    }
  }

  const handleClear = () => {
    setSearchState('idle')
    setError(null)
    setUserIssue('')
    setCurrentVersion('')
    onClear()
  }

  return (
    <div className="space-y-4">
      {/* Version Selection */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-2">
          Your Current Version
        </label>
        <select
          value={currentVersion}
          onChange={(e) => setCurrentVersion(e.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 backdrop-blur px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#6B46C1] transition"
        >
          <option value="" className="bg-zinc-900">Select your version...</option>
          {releases?.map((release) => (
            <option key={release.id} value={release.release_date} className="bg-zinc-900">
              {release.version}
            </option>
          ))}
        </select>
      </div>

      {/* Issue Description */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-2">
          Describe Your Issue
        </label>
        <textarea
          value={userIssue}
          onChange={(e) => setUserIssue(e.target.value)}
          placeholder="e.g., License Plate is stuck on Released status after loading"
          rows={4}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 backdrop-blur px-3 py-3 text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#6B46C1] transition resize-none"
        />
        <p className="text-xs text-zinc-500 mt-2">
          Be specific about components, error messages, or functionality issues.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={!currentVersion || !userIssue.trim() || searchState === 'analyzing'}
          className={cn(
            "flex-1 rounded-md px-4 py-3 font-medium transition-all duration-200",
            currentVersion && userIssue.trim() && searchState !== 'analyzing'
              ? "bg-gradient-to-r from-[#6B46C1] to-[#8B5CF6] text-white hover:from-[#5B3BA3] hover:to-[#7C46E8] shadow-[0_2px_12px_rgba(107,70,193,0.25)]"
              : "bg-zinc-800/50 border border-zinc-700 text-zinc-400 cursor-not-allowed"
          )}
        >
          {searchState === 'analyzing' ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Analyzing...
            </div>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Find Fixes
            </>
          )}
        </button>

        {(searchState === 'completed' || searchState === 'error') && (
          <button
            onClick={handleClear}
            className="rounded-md px-4 py-3 border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600 hover:text-white transition-all duration-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-md bg-red-900/20 border border-red-700 text-red-300 text-sm animate-in fade-in-0 slide-in-from-top-1 duration-300">
          {error}
        </div>
      )}

      {/* Analysis Status */}
      {searchState === 'analyzing' && (
        <div className="text-center py-4 animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <div className="text-sm text-[#6B46C1] mb-2 font-medium">
            🧠 AI is analyzing your issue...
          </div>
          <div className="text-xs text-zinc-400">
            Searching through release notes to find relevant fixes
          </div>
        </div>
      )}
    </div>
  )
}