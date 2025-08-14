import { OpenRouterService } from './openRouterService'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'
import type { AISearchRequest, AISearchResult } from '@/types/ai'

type ReleaseItemRow = Tables<'release_items'> & { releases?: Tables<'releases'> }

export class IssueAnalyzer {
  private openRouterService: OpenRouterService

  constructor() {
    this.openRouterService = new OpenRouterService()
  }

  /**
   * Extract key search terms from user issue description
   */
  private extractSearchTerms(userIssue: string): string[] {
    // Common abbreviations used in the codebase - CLP and LP are DIFFERENT!
    const abbreviations: Record<string, string[]> = {
      'CLP': ['Composite License Plate'], // CLP contains multiple LPs
      'LP': ['License Plate'], // Individual license plate
      'ASN': ['Advanced Shipping Notice'],
      'BOL': ['Bill of Lading'],
      'UDF': ['User-Defined Field'],
      'PO': ['Purchase Order'],
      'SN': ['Serial Number'],
      'MW': ['Mobile Web'],
      'FP': ['FootPrint', 'Footprint'], // Common variations
      'IC': ['Inventory Container'],
      'SSCC': ['Serial Shipping Container Code'],
      'UCC': ['UCC-128 labels'],
      'UOM': ['Unit of Measure'],
      'VLot': ['Vendor Lot'],
      'ODATA': ['Open Data Protocol', 'OData']
    }

    const terms: string[] = []
    const lowerIssue = userIssue.toLowerCase()

    // Extract specific technical terms
    const technicalPatterns = [
      /\b(license plate|LP|CLP)\b/gi,
      /\b(status|state)\b/gi,
      /\b(stuck|frozen|hanging|blocked)\b/gi,
      /\b(loading|load|loaded)\b/gi,
      /\b(released|release|releasing)\b/gi,
      /\b(error|exception|failure|failed)\b/gi,
      /\b(API|endpoint|service)\b/gi,
      /\b(mobile|desktop|web)\b/gi,
      /\b(portal|HTML5)\b/gi,
    ]

    technicalPatterns.forEach(pattern => {
      const matches = userIssue.match(pattern)
      if (matches) {
        terms.push(...matches.map(m => m.toLowerCase()))
      }
    })

    // Add abbreviation expansions
    Object.keys(abbreviations).forEach(abbr => {
      if (lowerIssue.includes(abbr.toLowerCase())) {
        terms.push(abbr)
        abbreviations[abbr].forEach(expansion => {
          terms.push(expansion.toLowerCase())
        })
      }
    })

    // Remove duplicates and return
    return [...new Set(terms)]
  }

  /**
   * Search release notes using the existing search infrastructure
   */
  private async searchReleaseNotes(
    searchTerms: string[],
    fromDate: string
  ): Promise<ReleaseItemRow[]> {
    try {
      // Build search query using the terms
      let query = supabase
        .from('release_items')
        .select('*, releases:release_id!inner(*)', { count: 'exact' })
        .gte('releases.release_date', fromDate)
        .order('release_date', { ascending: false, foreignTable: 'releases' })
        .limit(50) // Get more results for AI analysis

      // Apply search terms (similar to existing search logic)
      if (searchTerms.length > 0) {
        const searchConditions: string[] = []
        
        searchTerms.forEach(term => {
          searchConditions.push(`title.ilike.%${term}%`)
          searchConditions.push(`description.ilike.%${term}%`)
        })

        if (searchConditions.length > 0) {
          query = query.or(searchConditions.join(','))
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Search error:', error)
        throw error
      }

      return (data as ReleaseItemRow[]) || []
    } catch (error) {
      console.error('Failed to search release notes:', error)
      throw error
    }
  }


  /**
   * Main method to analyze an issue and find relevant fixes
   */
  async analyzeIssue(request: AISearchRequest): Promise<AISearchResult> {
    try {
      // Extract search terms from the user's issue
      const searchTerms = this.extractSearchTerms(request.userIssue)
      
      // Search for release notes from versions after the current version
      const releaseItems = await this.searchReleaseNotes(searchTerms, request.currentVersion)

      if (releaseItems.length === 0) {
        return {
          found: false,
          releaseItems: []
        }
      }

      // Prepare data for AI analysis
      const itemsForAnalysis = releaseItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        version: item.releases?.version || 'Unknown',
        release_date: item.releases?.release_date || '',
        component: item.component,
        azure_devops_id: item.azure_devops_id ?? null,
        azure_link: item.azure_link ?? null
      }))

      // Use AI to analyze and rank the results
      const aiAnalysis = await this.openRouterService.analyzeIssueAndSearch(
        request.userIssue,
        request.currentVersion,
        itemsForAnalysis
      )

      // Filter to top 3 most relevant items
      const topRelevantItems = aiAnalysis.relevantItems
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3)
        .map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          version: item.version,
          releaseDate: item.release_date,
          component: item.component,
          explanation: item.explanation,
          azure_devops_id: item.azure_devops_id ?? null,
          azure_link: item.azure_link ?? null
        }))

      // Be conservative with recommendations based on relevance scores
      const maxRelevanceScore = aiAnalysis.relevantItems.reduce((max, item) => Math.max(max, item.relevanceScore), 0)
      let recommendation: AISearchResult['recommendation'] | undefined
      if (aiAnalysis.recommendation) {
        if (maxRelevanceScore >= 90) {
          // Allow recommendation; keep provided confidence
          recommendation = {
            upgradeFromVersion: aiAnalysis.recommendation.upgradeFromVersion,
            upgradeToVersion: aiAnalysis.recommendation.upgradeToVersion,
            confidence: aiAnalysis.recommendation.confidence
          }
        } else if (maxRelevanceScore >= 85) {
          // Only medium at best for near-exact matches
          recommendation = {
            upgradeFromVersion: aiAnalysis.recommendation.upgradeFromVersion,
            upgradeToVersion: aiAnalysis.recommendation.upgradeToVersion,
            confidence: 'medium'
          }
        } else {
          // Below threshold: suppress recommendation entirely
          recommendation = undefined
        }
      }

      return {
        found: topRelevantItems.length > 0,
        releaseItems: topRelevantItems,
        recommendation
      }
    } catch (error) {
      console.error('Issue analysis failed:', error)
      
      // Return graceful fallback
      return {
        found: false,
        releaseItems: []
      }
    }
  }

  /**
   * Check if AI service is configured and ready
   */
  isConfigured(): boolean {
    try {
      this.openRouterService.refreshConfig()
      return true
    } catch {
      return false
    }
  }
}