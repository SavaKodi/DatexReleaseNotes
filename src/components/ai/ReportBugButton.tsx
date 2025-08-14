import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

type Props = {
  userIssue: string
  currentVersion: string
}

export function ReportBugButton({ userIssue, currentVersion }: Props) {
  const [isReporting, setIsReporting] = useState(false)
  const [reported, setReported] = useState(false)

  const handleReportBug = () => {
    setIsReporting(true)
    
    try {
      // Create email subject and body
      const subject = encodeURIComponent(`Bug Report: Issue not found in release notes`)
      const body = encodeURIComponent(
        `Hi QA Team,

I used the AI Assistant to search for a fix to my issue, but no relevant solutions were found in the release notes.

Current Version: ${currentVersion}

Issue Description:
${userIssue}

Please investigate this issue and let me know if:
1. This is a known issue with a workaround
2. This will be fixed in an upcoming release
3. This requires further investigation

Thank you for your assistance.

Best regards`
      )
      
      // Open email client with pre-filled content
      const emailUrl = `mailto:QA@datexcorp.com?subject=${subject}&body=${body}`
      window.location.href = emailUrl
      
      setReported(true)
      
      // Reset after a few seconds
      setTimeout(() => {
        setReported(false)
      }, 3000)
      
    } catch (error) {
      console.error('Failed to open email client:', error)
      alert('Please email QA@datexcorp.com with your issue details')
    } finally {
      setIsReporting(false)
    }
  }

  if (reported) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-900/20 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Bug Report Sent!</h3>
        <p className="text-zinc-400 text-sm">
          Your email client should have opened with a pre-filled bug report.<br/>
          The QA team will investigate your issue.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-red-900/20 border border-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">No Fixes Found</h3>
      <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
        I couldn't find any relevant fixes in the release notes for your issue. 
        This might be a new issue or require further investigation.
      </p>
      
      <button
        onClick={handleReportBug}
        disabled={isReporting}
        className={cn(
          "px-6 py-3 rounded-md font-medium transition-colors",
          "bg-red-900/20 border border-red-700 text-red-300",
          "hover:bg-red-900/30 hover:border-red-600",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isReporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-300 inline" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Opening Email...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Report Bug to QA Team
          </>
        )}
      </button>
      
      <p className="text-xs text-zinc-500 mt-3">
        This will open your email client with a pre-filled message to QA@datexcorp.com
      </p>
    </div>
  )
}