import { useState, useEffect } from 'react'
import type { AIConfiguration } from '@/types/ai'
import { AVAILABLE_MODELS } from '@/types/ai'
import { cn } from '@/lib/utils/cn'

const STORAGE_KEY = 'ai-configuration'

export function AIConfiguration() {
  const [config, setConfig] = useState<AIConfiguration>({
    apiKey: '',
    selectedModel: AVAILABLE_MODELS[0].id,
    isConfigured: false
  })
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  // Load configuration from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY)
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig) as AIConfiguration
        setConfig(parsedConfig)
      } catch (error) {
        console.error('Failed to parse AI configuration:', error)
      }
    }
  }, [])

  // Save configuration to localStorage
  const saveConfig = (newConfig: AIConfiguration) => {
    setConfig(newConfig)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig))
  }

  const handleApiKeyChange = (apiKey: string) => {
    const newConfig = {
      ...config,
      apiKey,
      isConfigured: apiKey.trim().length > 0
    }
    saveConfig(newConfig)
    setTestResult(null) // Reset test result when API key changes
  }

  const handleModelChange = (selectedModel: string) => {
    const newConfig = {
      ...config,
      selectedModel
    }
    saveConfig(newConfig)
  }

  const testConnection = async () => {
    if (!config.apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key first' })
      return
    }

    setIsTestingConnection(true)
    setTestResult(null)

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Datex Release Notes AI Assistant'
        },
        body: JSON.stringify({
          model: config.selectedModel,
          messages: [
            { role: 'user', content: 'Test connection - respond with just "OK"' }
          ],
          max_tokens: 5
        })
      })

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' })
      } else {
        const error = await response.json()
        setTestResult({ 
          success: false, 
          message: `Connection failed: ${error.error?.message || response.statusText}` 
        })
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === config.selectedModel)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">AI Assistant Configuration</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Configure the AI assistant to help users find fixes in release notes. 
          You'll need an OpenRouter API key to access various AI models.
        </p>
      </div>

      <div className="space-y-4">
        {/* API Key Configuration */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            OpenRouter API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 backdrop-blur px-3 py-2 text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#6B46C1] transition"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-2 text-zinc-400 hover:text-white text-sm"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Get your API key from{' '}
            <a 
              href="https://openrouter.ai/settings/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#6B46C1] hover:underline"
            >
              OpenRouter Settings
            </a>
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            AI Model
          </label>
          <select
            value={config.selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 backdrop-blur px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#6B46C1] transition"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.id} value={model.id} className="bg-zinc-900">
                {model.name} ({model.provider})
              </option>
            ))}
          </select>
          {selectedModelInfo && (
            <p className="text-xs text-zinc-500 mt-1">
              Provider: {selectedModelInfo.provider.charAt(0).toUpperCase() + selectedModelInfo.provider.slice(1)}
            </p>
          )}
        </div>

        {/* Test Connection */}
        <div>
          <button
            onClick={testConnection}
            disabled={isTestingConnection || !config.apiKey.trim()}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              config.apiKey.trim() 
                ? "bg-[#6B46C1]/20 border border-[#6B46C1]/40 text-white hover:border-[#6B46C1]/60 disabled:opacity-50"
                : "bg-zinc-800/50 border border-zinc-700 text-zinc-400 cursor-not-allowed"
            )}
          >
            {isTestingConnection ? 'Testing Connection...' : 'Test Connection'}
          </button>

          {testResult && (
            <div className={cn(
              "mt-3 p-3 rounded-md text-sm",
              testResult.success 
                ? "bg-green-900/20 border border-green-700 text-green-300"
                : "bg-red-900/20 border border-red-700 text-red-300"
            )}>
              {testResult.message}
            </div>
          )}
        </div>

        {/* Configuration Status */}
        <div className={cn(
          "p-3 rounded-md text-sm border",
          config.isConfigured 
            ? "bg-green-900/20 border-green-700 text-green-300"
            : "bg-yellow-900/20 border-yellow-700 text-yellow-300"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              config.isConfigured ? "bg-green-400" : "bg-yellow-400"
            )} />
            {config.isConfigured 
              ? "AI Assistant is configured and ready to use"
              : "AI Assistant requires configuration before use"
            }
          </div>
        </div>
      </div>
    </div>
  )
}

