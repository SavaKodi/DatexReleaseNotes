import type { AIConfiguration } from '@/types/ai'
import { getAIConfiguration } from './config'

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type OpenRouterResponse = {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterService {
  private config: AIConfiguration
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor() {
    this.config = getAIConfiguration()
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Datex Release Notes AI Assistant'
    }
  }

  async sendChatCompletion(messages: OpenRouterMessage[], options: {
    maxTokens?: number
    temperature?: number
  } = {}): Promise<OpenRouterResponse> {
    if (!this.config.isConfigured || !this.config.apiKey) {
      throw new Error('OpenRouter is not configured. Please set up the API key in admin settings.')
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.selectedModel,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.1, // Low temperature for more focused responses
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`)
    }

    return await response.json()
  }

  async analyzeIssueAndSearch(
    userIssue: string,
    currentVersion: string,
    releaseItems: Array<{
      id: string
      title: string
      description: string
      version: string
      release_date: string
      component: string | null
      azure_devops_id?: number | null
      azure_link?: string | null
    }>
  ): Promise<{
    relevantItems: Array<{
      id: string
      title: string
      description: string
      version: string
      release_date: string
      component: string | null
      relevanceScore: number
      explanation: string
      azure_devops_id?: number | null
      azure_link?: string | null
    }>
    recommendation: {
      upgradeFromVersion: string
      upgradeToVersion: string
      confidence: 'high' | 'medium' | 'low'
      summary: string
    } | null
  }> {
    const systemPrompt = `You are a cautious Datex Footprint expert analyzing software issues to find fixes in release notes.

IMPORTANT CONTEXT:
- Release notes format: [Azure DevOps ID] [Component] - [Title] followed by detailed description
- Components: Mobile Web, Desktop, API, HTML5 Portal, Core
- CLP (Composite License Plate) and LP (License Plate) are DIFFERENT - CLP contains multiple LPs
- Each entry has an Azure DevOps ID (like 215139, 200517) for tracking
- Focus on exact functional matches, not just keyword similarity. Explicitly acknowledge when similar terms refer to different operations. For example: "cycle count" is different from "blind count" and should not be treated as the same workflow; "CLP" (composite license plate) entails different interactions than a single "LP". If matches are only adjacent (e.g., cycle vs blind count), mark as related but distinct.

ANALYSIS PROCESS:
1. Extract key functional elements from user issue (component, action, error state, context, workflow type such as receiving, blind count, cycle count, picking)
2. Look for release notes that fix the SAME functionality or error pattern
3. Prioritize exact functional matches over keyword matches and penalize near-misses across different workflows (e.g., cycle vs blind count)
4. Consider workflow context (receiving, picking, loading, etc.)

RANKING CRITERIA (1-100 score):
- 90-100: Exact same functionality and error condition fixed
- 80-89: Same component and very similar functionality issue
- 70-79: Related functionality in same component that could cause the issue
- 60-69: Same component with potentially related fixes
- 50-59: Different component but same core functionality
- Below 50: Only return if highly confident it could be related

TERMINOLOGY:
- LP = Individual License Plate
- CLP = Composite License Plate (container holding multiple LPs)  
- ASN = Advanced Shipping Notice
- FootPrint/FP = The main software system
- Mobile Web/MW = Mobile interface
- Desktop = Desktop interface

 Focus on functional fixes, not just keyword matches. Return only highly relevant items. If there are no strong matches, return an empty list.

Respond with JSON:
{
  "relevantItems": [
    {
      "id": "item_id",
      "relevanceScore": 85,
      "explanation": "This fix addresses the exact same issue: [specific functionality] in [component] where [problem] occurs during [context]."
    }
  ],
  // Only include a recommendation if there is at least one relevantItem with relevanceScore >= 85 in the SAME workflow. Otherwise set this to null.
  "recommendation": {
    "upgradeFromVersion": "current_version", 
    "upgradeToVersion": "target_version",
    "confidence": "high|medium|low",
    "summary": "One-sentence rationale. Be conservative and highlight uncertainties or workflow differences if present."
  }
}

 Confidence guidance:
 - Use "high" only for exact functional matches in the same workflow with clear evidence in the note text.
 - Use "medium" for very close but not identical matches, or when context is partially inferred.
 - Use "low" when items are only related (adjacent workflows or similar terminology) or when evidence is weak.

 Return an empty array if no functionally relevant fixes found. If no strong matches exist (no items >= 85 in the same workflow), set "recommendation" to null.`

    const userPrompt = `Current Version: ${currentVersion}

User Issue: ${userIssue}

Available Release Notes (from newer versions):
${releaseItems.map(item => `
Version: ${item.version}
Release Date: ${item.release_date}
Component: ${item.component || 'General'}
Title: ${item.title}
Description: ${item.description}
ID: ${item.id}
`).join('\n---\n')}

Please analyze this issue and find relevant fixes in the release notes.`

    const response = await this.sendChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      maxTokens: 2000,
      temperature: 0.1
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI service')
    }

    try {
      const result = JSON.parse(content)
      
      // Add the original item data to relevant items
      const relevantItems = result.relevantItems?.map((item: { id: string; relevanceScore: number; explanation: string }) => {
        const originalItem = releaseItems.find(ri => ri.id === item.id)
        if (!originalItem) return null
        
        return {
          ...originalItem,
          relevanceScore: item.relevanceScore,
          explanation: item.explanation
        }
      }).filter(Boolean) || []

      return {
        relevantItems,
        recommendation: result.recommendation
      }
    } catch {
      console.error('Failed to parse AI response:', content)
      throw new Error('Failed to parse AI analysis response')
    }
  }

  // Method to test the connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendChatCompletion([
        { role: 'user', content: 'Test connection - respond with just "OK"' }
      ], { maxTokens: 5 })
      
      return response.choices?.[0]?.message?.content?.includes('OK') || false
    } catch (error) {
      console.error('OpenRouter connection test failed:', error)
      return false
    }
  }

  // Method to refresh configuration
  refreshConfig(): void {
    this.config = getAIConfiguration()
  }
}