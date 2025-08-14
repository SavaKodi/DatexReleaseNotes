export type AIProvider = 'anthropic' | 'openai' | 'google'

export type AIModel = {
  id: string
  name: string
  provider: AIProvider
}

export const AVAILABLE_MODELS: AIModel[] = [
  // Anthropic Claude models
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic' },
  
  // OpenAI models
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  
  // Google models
  { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
  { id: 'google/gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
]

export type AIConfiguration = {
  apiKey: string
  selectedModel: string
  isConfigured: boolean
}

export type AISearchRequest = {
  userIssue: string
  currentVersion: string
  availableVersions: string[]
}

export type AISearchResult = {
  found: boolean
  releaseItems: Array<{
    id: string
    title: string
    description: string
    version: string
    releaseDate: string
    component: string | null
    explanation: string
    azure_devops_id?: number | null
    azure_link?: string | null
  }>
  recommendation?: {
    upgradeFromVersion: string
    upgradeToVersion: string
    confidence: 'high' | 'medium' | 'low'
  }
}