import { useState } from 'react'
import { useReleasesOptions } from '@/hooks/useReleasesOptions'
import { IssueAnalyzer } from '@/lib/ai/issueAnalyzer'
import { getAIConfiguration } from '@/lib/ai/config'
import { AIResultCard } from './AIResultCard'
import { ReportBugButton } from './ReportBugButton'
import { cn } from '@/lib/utils/cn'
import type { AISearchResult } from '@/types/ai'

type AnalysisState = 'idle' | 'analyzing' | 'completed' | 'error'

export function AIAssistantPanel() {
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [userIssue, setUserIssue] = useState('')
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle')
  const [result, setResult] = useState<AISearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: releases } = useReleasesOptions()
  const issueAnalyzer = new IssueAnalyzer()

  // Check if AI is configured
  const aiConfig = getAIConfiguration()
  const isAIConfigured = aiConfig.isConfigured

  const handleFindFixes = async () => {
    if (!currentVersion || !userIssue.trim()) {
      setError('Please select your current version and describe your issue')
      return
    }

    if (!isAIConfigured) {
      setError('AI Assistant is not configured. Please set up the API key in admin settings.')
      return
    }

    setAnalysisState('analyzing')
    setError(null)
    setResult(null)

    try {
      // Get all available versions for analysis (not used directly but could be useful)
      const availableVersions = releases?.map(r => r.version) || []

      const analysisResult = await issueAnalyzer.analyzeIssue({
        userIssue,
        currentVersion,
        availableVersions
      })

      setResult(analysisResult)
      setAnalysisState('completed')
    } catch (err) {
      console.error('Analysis failed:', err)
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
      setAnalysisState('error')
    }
  }

  const handleReset = () => {
    setAnalysisState('idle')
    setResult(null)
    setError(null)
    setUserIssue('')
    setCurrentVersion('')
  }

  // Configuration check UI
  if (!isAIConfigured) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-yellow-900/20 border border-yellow-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">AI Assistant Not Configured</h3>
        <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
          The AI Assistant requires configuration before it can help find fixes in release notes.
        </p>
        <p className="text-zinc-500 text-xs">
          Please go to the Admin tab to set up your OpenRouter API key and select an AI model.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {analysisState === 'idle' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">AI Issue Assistant</h2>
            <p className="text-zinc-400 text-sm">
              Describe your issue and I'll search through release notes to find potential fixes.
            </p>
          </div>

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
              rows={6}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 backdrop-blur px-3 py-3 text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#6B46C1] transition resize-none"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Be specific about components, error messages, or functionality that's not working as expected.
            </p>
          </div>

          {/* Find Fixes Button */}
          <button
            onClick={handleFindFixes}
            disabled={!currentVersion || !userIssue.trim()}
            className={cn(
              "w-full rounded-md px-4 py-3 font-medium transition",
              currentVersion && userIssue.trim()
                ? "bg-[#6B46C1]/20 border border-[#6B46C1]/40 text-white hover:border-[#6B46C1]/60"
                : "bg-zinc-800/50 border border-zinc-700 text-zinc-400 cursor-not-allowed"
            )}
          >
            Find Fixes
          </button>

          {error && (
            <div className="p-3 rounded-md bg-red-900/20 border border-red-700 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Analysis Loading State */}
      {analysisState === 'analyzing' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#6B46C1]/20 border border-[#6B46C1]/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="animate-spin w-8 h-8 text-[#6B46C1]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Analyzing Your Issue</h3>
          <p className="text-zinc-400 text-sm">
            I'm searching through release notes to find relevant fixes...
          </p>
        </div>
      )}

      {/* Results Section */}
      {analysisState === 'completed' && result && (
        <div className="space-y-6">
          {result.found ? (
            <>
              {/* Success Header with Recommendation */}
              <div className="text-center">
                <div className="w-12 h-12 bg-green-900/20 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Found {result.releaseItems.length} Potential Fix{result.releaseItems.length !== 1 ? 'es' : ''}
                </h3>
                
                {result.recommendation && (
                  <div className="bg-green-900/10 border border-green-700/30 rounded-md p-4 mb-6">
                    <p className="text-green-300 text-sm">
                      <span className="font-medium">Recommendation:</span> Upgrading from your version to{' '}
                      <span className="font-semibold">{result.recommendation.upgradeToVersion}</span>{' '}
                      might fix this issue.
                    </p>
                  </div>
                )}
              </div>

              {/* Result Cards */}
              <div className="space-y-4">
                {result.releaseItems.map((item, index) => (
                  <AIResultCard
                    key={item.id}
                    item={item}
                    rank={index + 1}
                  />
                ))}
              </div>
            </>
          ) : (
            <ReportBugButton userIssue={userIssue} currentVersion={currentVersion} />
          )}

          {/* Reset Button */}
          <div className="text-center pt-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              ← Search for Another Issue
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {analysisState === 'error' && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-900/20 border border-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Analysis Failed</h3>
          {error && (
            <p className="text-red-300 text-sm mb-4 max-w-md mx-auto">
              {error}
            </p>
          )}
          <button
            onClick={handleReset}
            className="px-6 py-2 rounded-md bg-zinc-800/50 border border-zinc-700 text-zinc-300 hover:border-zinc-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}