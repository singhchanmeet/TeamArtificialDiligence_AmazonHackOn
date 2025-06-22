// utils/cardRankingService.js
// Integration service for the FastAPI Card Ranking Model

/**
 * Card Ranking Service
 * Integrates with the FastAPI ranking service running on port 8000
 */
class CardRankingService {
    constructor() {
      this.baseURL = process.env.RANKING_API_URL || 'http://localhost:8000';
      this.timeout = 5000; // 5 second timeout
    }
  
    /**
     * Check if the ranking service is healthy
     */
    async checkHealth() {
      try {
        const response = await fetch(`${this.baseURL}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(this.timeout)
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            isHealthy: data.status === 'healthy',
            modelLoaded: data.model_loaded,
            pipelineLoaded: data.feature_pipeline_loaded
          };
        }
        return { isHealthy: false, modelLoaded: false, pipelineLoaded: false };
      } catch (error) {
        console.error('Ranking service health check failed:', error);
        return { isHealthy: false, modelLoaded: false, pipelineLoaded: false };
      }
    }
  
    /**
     * Convert cardholder data to ranking API format
     */
    prepareCardholderData(cardholder, requestHistory = []) {
      // Calculate performance metrics from request history
      const completedRequests = requestHistory.filter(req => req.status === 'completed');
      const declinedRequests = requestHistory.filter(req => req.status === 'declined');
      const totalRequests = requestHistory.length;
  
      // Calculate success rate
      const transactionSuccessRate = totalRequests > 0 
        ? completedRequests.length / totalRequests 
        : 0.95; // Default high success rate for new cardholders
  
      // Calculate average response time (simulate based on activity)
      const avgResponseTime = cardholder.isOnline ? 2.0 : 8.0; // 2 minutes if online, 8 if offline
  
      // Calculate discount hit rate (how often discounts are accepted)
      const discountHitRate = totalRequests > 0 
        ? (totalRequests - declinedRequests.length) / totalRequests 
        : 0.8; // Default good hit rate
  
      // Calculate commission acceptance rate
      const commissionAcceptanceRate = transactionSuccessRate;
  
      // Estimate user rating based on performance
      let userRating = 4; // Default good rating
      if (transactionSuccessRate > 0.9 && declinedRequests.length === 0) userRating = 5;
      else if (transactionSuccessRate < 0.7 || declinedRequests.length > 3) userRating = 3;
      else if (transactionSuccessRate < 0.5) userRating = 2;
  
      // Get highest credit limit from cards
      const creditLimit = cardholder.cards && cardholder.cards.length > 0 
        ? Math.max(...cardholder.cards.map(card => card.monthlyLimit || 50000))
        : 50000;
  
      return {
        user_id: cardholder.userId,
        credit_limit: creditLimit,
        avg_repayment_time: avgResponseTime,
        transaction_success_rate: transactionSuccessRate,
        response_speed: avgResponseTime * 60, // Convert to seconds
        discount_hit_rate: discountHitRate,
        commission_acceptance_rate: commissionAcceptanceRate,
        user_rating: userRating,
        default_count: declinedRequests.length > 5 ? Math.min(declinedRequests.length - 5, 10) : 0,
        record_timestamp: cardholder.lastActiveAt || new Date().toISOString()
      };
    }
  
    /**
     * Rank a single cardholder
     */
    async rankSingleCardholder(cardholder, requestHistory = []) {
      try {
        const health = await this.checkHealth();
        if (!health.isHealthy) {
          throw new Error('Ranking service is not available');
        }
  
        const cardholderData = this.prepareCardholderData(cardholder, requestHistory);
        
        const response = await fetch(`${this.baseURL}/rank-single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardholderData),
          signal: AbortSignal.timeout(this.timeout)
        });
  
        if (!response.ok) {
          throw new Error(`Ranking API error: ${response.status}`);
        }
  
        const result = await response.json();
        return {
          success: true,
          ranking: result.cardholder,
          processingTime: result.processing_time_ms,
          requestId: result.request_id
        };
  
      } catch (error) {
        console.error('Single cardholder ranking failed:', error);
        return {
          success: false,
          error: error.message,
          ranking: this.getFallbackRanking(cardholder)
        };
      }
    }
  
    /**
     * Rank multiple cardholders
     */
    async rankCardholders(cardholders, requestHistories = {}, merchantCategory = null) {
      try {
        const health = await this.checkHealth();
        if (!health.isHealthy) {
          throw new Error('Ranking service is not available');
        }
  
        const batchData = {
          cardholders: cardholders.map(cardholder => 
            this.prepareCardholderData(cardholder, requestHistories[cardholder.userId] || [])
          ),
          merchant_category: merchantCategory
        };
  
        const response = await fetch(`${this.baseURL}/rank-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchData),
          signal: AbortSignal.timeout(this.timeout * 2) // Double timeout for batch
        });
  
        if (!response.ok) {
          throw new Error(`Ranking API error: ${response.status}`);
        }
  
        const result = await response.json();
        return {
          success: true,
          rankings: result.ranked_cardholders,
          totalCardholders: result.total_cardholders,
          processingTime: result.processing_time_ms,
          requestId: result.request_id
        };
  
      } catch (error) {
        console.error('Batch cardholder ranking failed:', error);
        return {
          success: false,
          error: error.message,
          rankings: cardholders.map((cardholder, index) => ({
            ...this.getFallbackRanking(cardholder),
            rank: index + 1
          }))
        };
      }
    }
  
    /**
     * Get top K cardholders
     */
    async getTopCardholders(cardholders, requestHistories = {}, topK = 10, merchantCategory = null) {
      try {
        const health = await this.checkHealth();
        if (!health.isHealthy) {
          throw new Error('Ranking service is not available');
        }
  
        const batchData = {
          cardholders: cardholders.map(cardholder => 
            this.prepareCardholderData(cardholder, requestHistories[cardholder.userId] || [])
          ),
          merchant_category: merchantCategory
        };
  
        const response = await fetch(`${this.baseURL}/rank-top?top_k=${topK}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchData),
          signal: AbortSignal.timeout(this.timeout * 2)
        });
  
        if (!response.ok) {
          throw new Error(`Ranking API error: ${response.status}`);
        }
  
        const result = await response.json();
        return {
          success: true,
          topCardholders: result.top_cardholders,
          totalEvaluated: result.total_cardholders,
          topK: result.top_k,
          processingTime: result.processing_time_ms,
          requestId: result.request_id
        };
  
      } catch (error) {
        console.error('Top cardholders ranking failed:', error);
        // Fallback: sort by simple heuristic
        const fallbackRankings = cardholders
          .map(cardholder => ({
            ...this.getFallbackRanking(cardholder),
            cardholder_id: cardholder.userId
          }))
          .sort((a, b) => b.health_score - a.health_score)
          .slice(0, topK)
          .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
  
        return {
          success: false,
          error: error.message,
          topCardholders: fallbackRankings,
          totalEvaluated: cardholders.length,
          topK: Math.min(topK, cardholders.length)
        };
      }
    }
  
    /**
     * Get model information
     */
    async getModelInfo() {
      try {
        const response = await fetch(`${this.baseURL}/model-info`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(this.timeout)
        });
  
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error('Failed to get model info:', error);
        return null;
      }
    }
  
    /**
     * Fallback ranking when ML service is unavailable
     */
    getFallbackRanking(cardholder) {
      // Simple heuristic-based scoring
      let score = 0.5; // Base score
  
      // Online status bonus
      if (cardholder.isOnline) score += 0.2;
  
      // Recent activity bonus
      const hoursSinceActive = cardholder.lastActiveAt 
        ? (Date.now() - new Date(cardholder.lastActiveAt).getTime()) / (1000 * 60 * 60)
        : 24;
      if (hoursSinceActive < 1) score += 0.15;
      else if (hoursSinceActive < 24) score += 0.1;
  
      // Card availability bonus
      const activeCards = cardholder.cards ? cardholder.cards.filter(card => card.isActive).length : 0;
      score += Math.min(activeCards * 0.05, 0.15);
  
      // Earnings history bonus
      if (cardholder.earnings?.total > 1000) score += 0.1;
  
      return {
        cardholder_id: cardholder.userId,
        health_score: Math.min(Math.max(score, 0), 1),
        rank: 1, // Will be updated when sorting
        credit_limit: cardholder.cards?.[0]?.monthlyLimit || 50000,
        transaction_success_rate: 0.85, // Default fallback
        avg_repayment_days: cardholder.isOnline ? 2 : 8,
        response_time_sec: cardholder.isOnline ? 120 : 480,
        discount_hit_rate: 0.8,
        commission_acceptance: 0.85,
        user_rating: 4,
        default_count: 0
      };
    }
  
    /**
     * Enhanced cardholder data with ranking
     */
    enhanceCardholderWithRanking(cardholder, ranking) {
      return {
        ...cardholder,
        ranking: {
          healthScore: ranking.health_score,
          rank: ranking.rank,
          transactionSuccessRate: ranking.transaction_success_rate,
          avgRepaymentDays: ranking.avg_repayment_days,
          responseTimeSeconds: ranking.response_time_sec,
          discountHitRate: ranking.discount_hit_rate,
          commissionAcceptance: ranking.commission_acceptance,
          userRating: ranking.user_rating,
          defaultCount: ranking.default_count
        }
      };
    }
  }
  
  // Export singleton instance
  const cardRankingService = new CardRankingService();
  export default cardRankingService;
  
  // Named exports for specific functions
  export const {
    checkHealth,
    rankSingleCardholder,
    rankCardholders,
    getTopCardholders,
    getModelInfo,
    enhanceCardholderWithRanking
  } = cardRankingService;