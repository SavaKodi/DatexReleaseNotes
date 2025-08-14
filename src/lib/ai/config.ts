import type { AIConfiguration } from '@/types/ai'
import { AVAILABLE_MODELS } from '@/types/ai'

const STORAGE_KEY = 'ai-configuration'

// Function to get current AI configuration
export const getAIConfiguration = (): AIConfiguration => {
  const savedConfig = localStorage.getItem(STORAGE_KEY)
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig) as AIConfiguration
    } catch (error) {
      console.error('Failed to parse AI configuration:', error)
    }
  }
  
  return {
    apiKey: '',
    selectedModel: AVAILABLE_MODELS[0].id,
    isConfigured: false
  }
}