import { cn } from '@/lib/utils/cn'

type Props = {
  item: {
    id: string
    title: string
    description: string
    version: string
    releaseDate: string
    component: string | null
    explanation: string
    azure_devops_id?: number | null
    azure_link?: string | null
  }
  rank: number
}

const getComponentColor = (component: string | null): string => {
  switch (component) {
    case 'mobile_web':
      return 'bg-blue-900/20 border-blue-700 text-blue-300'
    case 'desktop':
      return 'bg-purple-900/20 border-purple-700 text-purple-300'
    case 'api':
      return 'bg-green-900/20 border-green-700 text-green-300'
    case 'html5_portal':
      return 'bg-orange-900/20 border-orange-700 text-orange-300'
    default:
      return 'bg-zinc-900/20 border-zinc-700 text-zinc-300'
  }
}

const getComponentLabel = (component: string | null): string => {
  switch (component) {
    case 'mobile_web':
      return 'Mobile Web'
    case 'desktop':
      return 'Desktop'
    case 'api':
      return 'API'
    case 'html5_portal':
      return 'HTML5 Portal'
    default:
      return 'General'
  }
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

export function AIResultCard({ item, rank }: Props) {
  return (
    <div className="interactive-card rounded-xl border border-zinc-800/70 bg-zinc-900/40 backdrop-blur p-6 hover:border-[#6B46C1]/30 hover:shadow-[0_0_0_1px_rgba(107,70,193,0.12)]">
      <div className="flex items-start gap-4">
        {/* Rank Badge */}
        <div className="flex-shrink-0 w-8 h-8 bg-[#6B46C1]/20 border border-[#6B46C1]/40 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-[#6B46C1]">{rank}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header with Version and Component */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#6B46C1]">
                Version {item.version}
              </span>
              <span className="text-xs text-zinc-500">
                {formatDate(item.releaseDate)}
              </span>
            </div>
            
            {item.component && (
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium border",
                getComponentColor(item.component)
              )}>
                {getComponentLabel(item.component)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
            {item.description}
          </p>

          {/* Removed AI explanation section per requirements */}

          {/* Azure DevOps Link */}
          {(item.azure_link || item.azure_devops_id) && (
            <div className="mt-3">
              <a
                href={item.azure_link || `https://dev.azure.com/DatexCorporation/Datex%20Agile%20Teams/_workitems/edit/${item.azure_devops_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-[#6B46C1]/50 bg-[#6B46C1]/25 px-3 py-1.5 text-sm text-white hover:border-[#6B46C1]/70 hover:bg-[#6B46C1]/35 transition shadow-[0_2px_12px_rgba(107,70,193,0.15)]"
              >
                <svg className="h-4 w-4 opacity-90" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 3h18v18H3z" fill="none"/>
                  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/>
                  <path d="M5 5h6v2H7v9h9v-4h2v6H5z"/>
                </svg>
                Azure DevOps{item.azure_devops_id ? ` #${item.azure_devops_id}` : ''}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}