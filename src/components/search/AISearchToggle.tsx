import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

type Props = {
  isAIMode: boolean
  onToggle: (enabled: boolean) => void
  isConfigured: boolean
}

export function AISearchToggle({ isAIMode, onToggle, isConfigured }: Props) {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => onToggle(!isAIMode)}
        disabled={!isConfigured}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "group relative flex items-center gap-3 w-full rounded-xl border px-5 py-4 text-base font-semibold transition-all duration-300",
          isAIMode && isConfigured
            ? "border-[#6B46C1]/60 bg-gradient-to-r from-[#6B46C1]/25 to-[#8B5CF6]/25 text-white shadow-[0_0_0_1px_rgba(107,70,193,0.2)] ai-border-glow"
            : isConfigured
            ? "border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:border-[#6B46C1]/50 hover:bg-[#6B46C1]/10 hover:ai-border-glow"
            : "border-zinc-800/50 bg-zinc-900/30 text-zinc-500 cursor-not-allowed"
        )}
      >
        {/* Glow Layer */}
        {isConfigured && (
          <div className={cn(
            "ai-glow-layer",
            isAIMode ? "opacity-60" : "opacity-0 group-hover:opacity-40 transition-opacity duration-300"
          )} />
        )}

        {/* Removed spinning border; subtle glow handled on button via class */}

        {/* AI Icon */}
        <div className={cn(
          "relative w-6 h-6 transition-all duration-200",
          isAIMode && isConfigured ? "scale-110" : ""
        )}>
          <div className={cn(
            "w-6 h-6 bg-gradient-to-br rounded-lg flex items-center justify-center transition-all duration-200",
            isAIMode && isConfigured
              ? "from-[#6B46C1] to-[#8B5CF6] shadow-lg"
              : isConfigured
              ? "from-[#6B46C1]/70 to-[#8B5CF6]/70"
              : "from-zinc-600 to-zinc-700"
          )}>
            <svg 
              className={cn(
                "w-3.5 h-3.5 transition-all duration-200",
                isAIMode && isConfigured ? "text-white" : "text-zinc-300"
              )} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          
          {/* Pulsing effect when active */}
          {isAIMode && isConfigured && (
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#6B46C1] to-[#8B5CF6] opacity-25 animate-pulse" />
          )}
        </div>

        <div className="flex-1 text-left">
          <div className={cn(
            "font-semibold transition-colors duration-200",
            isAIMode && isConfigured ? "text-white" : isConfigured ? "text-zinc-200" : "text-zinc-500"
          )}>
            AI Assistant
          </div>
          <div className={cn(
            "text-xs transition-colors duration-200",
            isAIMode && isConfigured ? "text-[#cdb7ff]" : isConfigured ? "text-zinc-400" : "text-zinc-600"
          )}>
            {isConfigured 
              ? isAIMode 
                ? "Find fixes in release notes" 
                : "Click to enable AI search"
              : "Configure in Admin to enable"
            }
          </div>
        </div>

        {/* Toggle indicator */}
        <div className={cn(
          "relative w-5 h-5 rounded-full border-2 transition-all duration-300",
          isAIMode && isConfigured
            ? "border-white/90 bg-white shadow-[0_0_18px_rgba(255,255,255,0.35)]"
            : isConfigured
            ? "border-zinc-600 group-hover:border-[#6B46C1]/60 group-hover:shadow-[0_0_12px_rgba(107,70,193,0.35)]"
            : "border-zinc-700"
        )}>
          {isAIMode && isConfigured && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6B46C1] to-[#8B5CF6] scale-75 m-auto transition-transform duration-300" />
          )}
        </div>
      </button>

      {/* Tooltip when not configured */}
      {!isConfigured && isHovering && (
        <div className="absolute left-0 -top-2 transform -translate-y-full z-20 px-3 py-2 text-xs text-white bg-zinc-800 rounded-md shadow-lg border border-zinc-700 animate-in fade-in-0 zoom-in-95 duration-200">
          Set up OpenRouter API key in Admin tab to enable AI search
          <div className="absolute left-6 top-full w-2 h-2 bg-zinc-800 border-r border-b border-zinc-700 rotate-45 transform -translate-y-1" />
        </div>
      )}
    </div>
  )
}