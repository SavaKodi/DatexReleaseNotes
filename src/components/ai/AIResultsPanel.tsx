import { useState, useEffect } from 'react'
import { AIResultCard } from './AIResultCard'
import { ReportBugButton } from './ReportBugButton'
import { cn } from '@/lib/utils/cn'
import type { AISearchResult } from '@/types/ai'

type Props = {
  result: AISearchResult | null
  userIssue: string
  currentVersion: string
}

export function AIResultsPanel({ result, userIssue, currentVersion }: Props) {
  const [visibleCards, setVisibleCards] = useState<number>(0)

  // Animate cards appearing one by one
  useEffect(() => {
    if (result?.found && result.releaseItems.length > 0) {
      setVisibleCards(0)
      
      // Show cards one by one with staggered animation
      result.releaseItems.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(index + 1)
        }, 400 + (index * 200)) // Start after 400ms, then 200ms between each
      })
    } else {
      setVisibleCards(0)
    }
  }, [result])

  if (!result) {
    return null
  }

  if (result.found && result.releaseItems.length > 0) {
    return (
      <div className="space-y-6">
        {/* Success Header with Animation */}
        <div className="text-center animate-in fade-in-0 slide-in-from-top-2 duration-500">
          <div className="w-12 h-12 bg-green-900/20 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Found {result.releaseItems.length} Potential Fix{result.releaseItems.length !== 1 ? 'es' : ''}
          </h3>
          
          {result.recommendation && (
            <div className="bg-green-900/10 border border-green-700/30 rounded-md p-4 mb-6 animate-in fade-in-0 slide-in-from-top-1 duration-700 delay-200">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-green-400/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-green-300 text-sm font-medium mb-1">
                    Upgrade Consideration
                  </p>
                  <p className="text-green-200 text-sm">
                    Upgrading to <span className="font-semibold">{result.recommendation.upgradeToVersion}</span> may help, but verify the fix context against your exact workflow before proceeding.
                  </p>
                  {result.recommendation.confidence && (
                    <div className="mt-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                        result.recommendation.confidence === 'high' && "bg-green-500/20 text-green-300 border border-green-500/30",
                        result.recommendation.confidence === 'medium' && "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
                        result.recommendation.confidence === 'low' && "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          result.recommendation.confidence === 'high' && "bg-green-400",
                          result.recommendation.confidence === 'medium' && "bg-yellow-400",
                          result.recommendation.confidence === 'low' && "bg-orange-400"
                        )} />
                        {result.recommendation.confidence} confidence
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Result Cards with Staggered Animation */}
        <div className="space-y-4">
          {result.releaseItems.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "transition-all duration-500 transform",
                index < visibleCards 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-4 scale-95"
              )}
              style={{ 
                transitionDelay: `${index * 200}ms` 
              }}
            >
              <AIResultCard
                item={item}
                rank={index + 1}
              />
            </div>
          ))}
        </div>

        {/* Floating Animation Effect */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-[#6B46C1]/30 rounded-full animate-pulse"
              style={{
                left: `${20 + i * 30}%`,
                top: `${30 + i * 20}%`,
                animationDelay: `${i * 1000}ms`,
                animationDuration: '3s'
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // No results found - show report bug with animation
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <ReportBugButton userIssue={userIssue} currentVersion={currentVersion} />
    </div>
  )
}