// utils/trustScoreGenerator.js
// Comprehensive Rule-Based Trust Score Generator for Next.js Integration
// Replaces ML API calls with local utility functions

/**
 * Main Trust Score Generator Class
 * Analyzes user behavior patterns for credit card discount platform
 */
class TrustScoreGenerator {
    riskFactors: any;
    categoryRiskWeights: any;
    deviceRiskWeights: any;
    cityRiskLevels: any;
    constructor() {
      this.riskFactors = {
        FREQUENT_CITY_CHANGES: { weight: 25, threshold: 3, description: "Frequent city changes" },
        UNUSUAL_LOCATION: { weight: 15, threshold: 1, description: "Unusual delivery location" },
        RAPID_REQUESTS: { weight: 30, threshold: 3, description: "Multiple requests in short time" },
        AMOUNT_ESCALATION: { weight: 20, threshold: 2, description: "Suspicious amount escalation" },
        HIGH_VALUE_REQUESTS: { weight: 15, threshold: 1, description: "Unusually high-value requests" },
        DEVICE_SWITCHING: { weight: 20, threshold: 2, description: "Frequent device switching" },
        PAYMENT_METHOD_CHANGES: { weight: 10, threshold: 2, description: "Multiple payment methods" },
        OFF_HOURS_ACTIVITY: { weight: 15, threshold: 3, description: "Unusual time patterns" },
        WEEKEND_HEAVY: { weight: 10, threshold: 5, description: "Excessive weekend activity" },
        HIGH_DECLINE_RATE: { weight: 35, threshold: 0.3, description: "High request decline rate" },
        ACCOUNT_AGE: { weight: 20, threshold: 7, description: "Very new account" },
        CATEGORY_JUMPING: { weight: 15, threshold: 4, description: "Inconsistent purchase categories" },
        LUXURY_FOCUS: { weight: 10, threshold: 0.7, description: "Excessive luxury purchases" }
      };
  
      this.categoryRiskWeights = {
        'electronics': 0.8,
        'jewelery': 0.9,
        "men's clothing": 0.3,
        "women's clothing": 0.3,
        'unknown': 0.5
      };
  
      this.deviceRiskWeights = {
        'mobile': 0.3,
        'desktop': 0.1,
        'tablet': 0.2,
        'unknown': 0.5
      };
  
      this.cityRiskLevels = {
        'new delhi': 0.2,
        'delhi': 0.2,
        'mumbai': 0.2,
        'bangalore': 0.2,
        'chennai': 0.2,
        'hyderabad': 0.2,
        'pune': 0.2,
        'kolkata': 0.2,
        'unknown': 0.7
      };
    }
  
    /**
     * Main function to generate trust report for a user
     * Compatible with your existing PaymentRequest model structure
     */
    generateTrustReport(userId, transactions) {
      try {
        // Validate input
        if (!userId || !Array.isArray(transactions) || transactions.length === 0) {
          return this.createDefaultReport(userId, "Insufficient transaction data");
        }
  
        // Convert PaymentRequest data to standardized format
        const standardizedTransactions = this.standardizeTransactions(transactions);
  
        // Analyze various patterns
        const analysis = {
          geographic: this.analyzeGeographicPatterns(standardizedTransactions),
          temporal: this.analyzeTemporalPatterns(standardizedTransactions),
          transaction: this.analyzeTransactionPatterns(standardizedTransactions),
          device: this.analyzeDevicePatterns(standardizedTransactions),
          category: this.analyzeCategoryPatterns(standardizedTransactions),
          historical: this.analyzeHistoricalPatterns(standardizedTransactions)
        };
  
        // Calculate risk scores
        const riskScores = this.calculateRiskScores(analysis);
        
        // Generate overall assessment
        const riskAssessment = this.generateRiskAssessment(riskScores, analysis);
        
        // Create behavioral insights
        const behavioralInsights = this.generateBehavioralInsights(analysis, standardizedTransactions);
  
        // Generate recommendations
        const recommendations = this.generateRecommendations(riskAssessment, analysis);
  
        return {
          user_id: userId,
          timestamp: new Date().toISOString(),
          trust_score: Math.max(0, Math.min(100, 100 - riskAssessment.total_risk_score)),
          risk_assessment: riskAssessment,
          behavioral_analysis: analysis,
          behavioral_insights: behavioralInsights,
          recommendations: recommendations,
          analysis_metadata: {
            transactions_analyzed: standardizedTransactions.length,
            time_span_days: this.calculateTimeSpan(standardizedTransactions),
            analysis_version: "1.0.0"
          }
        };
  
      } catch (error) {
        console.error('Trust score generation error:', error);
        return this.createDefaultReport(userId, `Analysis failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error'}`);
      }
    }
  
    /**
     * Convert PaymentRequest documents to standardized transaction format
     */
    standardizeTransactions(paymentRequests) {
      return paymentRequests.map(req => ({
        transaction_id: req.requestId || req._id,
        amount: req.orderAmount || req.totalPayable || 0,
        merchant_category: req.merchant_category || this.extractCategoryFromProducts(req.productDetails) || 'unknown',
        city: req.city || 'unknown',
        device_type: req.device_type || 'unknown',
        payment_method: req.payment_method || 'unknown',
        hour_of_day: req.createdAt ? new Date(req.createdAt).getHours() : 12,
        timestamp: req.createdAt ? req.createdAt : new Date().toISOString(),
        status: req.status || 'unknown',
        is_fraud: 0, // Default to not fraud for rule-based analysis
        userEmail: req.userEmail || req.userId,
        productDetails: req.productDetails || []
      }));
    }
  
    /**
     * Extract category from productDetails array
     */
    extractCategoryFromProducts(productDetails) {
      if (!productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
        return 'unknown';
      }
      
      // Return the category of the first product, or most common category
      const categories = productDetails.map(p => p.category).filter(Boolean);
      if (categories.length === 0) return 'unknown';
      
      // Find most frequent category
      const categoryCount = {};
      categories.forEach(cat => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      
      return Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b
      );
    }
  
    /**
     * Analyze geographic behavior patterns
     */
    analyzeGeographicPatterns(transactions) {
      const cities = transactions.map(t => (t.city || 'unknown').toLowerCase());
      const uniqueCities = [...new Set(cities)];
      
      // City change frequency
      let cityChanges = 0;
      for (let i = 1; i < cities.length; i++) {
        if (cities[i] !== cities[i-1]) cityChanges++;
      }
  
      const changeFrequency = cityChanges / Math.max(1, transactions.length - 1);
      const spreadRisk = uniqueCities.length > 3 ? 0.8 : uniqueCities.length * 0.2;
      
      // Unusual location risk
      const unusualLocationRisk = cities.reduce((risk, city) => {
        return Math.max(risk, this.cityRiskLevels[city] || 0.7);
      }, 0);
  
      // City frequency distribution
      const cityFrequency = {};
      cities.forEach(city => {
        cityFrequency[city] = (cityFrequency[city] || 0) + 1;
      });
  
      return {
        unique_cities: uniqueCities.length,
        city_changes: cityChanges,
        change_frequency: changeFrequency,
        most_frequent_city: Object.keys(cityFrequency).reduce((a, b) => 
          cityFrequency[a] > cityFrequency[b] ? a : b, cities[0] || 'unknown'
        ),
        geographic_spread_risk: spreadRisk,
        unusual_location_risk: unusualLocationRisk,
        city_distribution: cityFrequency,
        risk_score: Math.min(100, (changeFrequency * 60) + (spreadRisk * 30) + (unusualLocationRisk * 40))
      };
    }
  
    /**
     * Analyze temporal behavior patterns
     */
    analyzeTemporalPatterns(transactions) {
      const timestamps = transactions.map(t => new Date(t.timestamp || Date.now()));
      const hours = timestamps.map(t => t.getHours());
      const days = timestamps.map(t => t.getDay()); // 0 = Sunday
  
      // Time distribution analysis
      const hourDistribution = {};
      const dayDistribution = {};
      
      hours.forEach(hour => hourDistribution[hour] = (hourDistribution[hour] || 0) + 1);
      days.forEach(day => dayDistribution[day] = (dayDistribution[day] || 0) + 1);
  
      // Off-hours activity (11PM - 6AM)
      const offHoursCount = hours.filter(h => h >= 23 || h <= 6).length;
      const offHoursRatio = offHoursCount / transactions.length;
  
      // Weekend activity (Saturday = 6, Sunday = 0)
      const weekendCount = days.filter(d => d === 0 || d === 6).length;
      const weekendRatio = weekendCount / transactions.length;
  
      // Rapid transaction detection
      let rapidTransactions = 0;
      for (let i = 1; i < timestamps.length; i++) {
        const timeDiff = (timestamps[i] - timestamps[i-1]) / (1000 * 60); // minutes
        if (timeDiff < 30) rapidTransactions++; // Less than 30 minutes apart
      }
  
      const rapidRatio = rapidTransactions / Math.max(1, transactions.length - 1);
  
      return {
        time_span_hours: this.calculateTimeSpan(transactions) * 24,
        off_hours_ratio: offHoursRatio,
        weekend_ratio: weekendRatio,
        rapid_transaction_ratio: rapidRatio,
        peak_hour: Object.keys(hourDistribution).reduce((a, b) => 
          hourDistribution[a] > hourDistribution[b] ? a : b, '12'
        ),
        hour_distribution: hourDistribution,
        day_distribution: dayDistribution,
        risk_score: Math.min(100, (offHoursRatio * 60) + (weekendRatio * 30) + (rapidRatio * 80))
      };
    }
  
    /**
     * Analyze transaction amount and frequency patterns
     */
    analyzeTransactionPatterns(transactions) {
      const amounts = transactions.map(t => parseFloat(t.amount || 0));
      
      if (amounts.length === 0) {
        return { risk_score: 50, error: "No transaction amounts found" };
      }
  
      // Statistical analysis
      const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
      const avgAmount = totalAmount / amounts.length;
      const maxAmount = Math.max(...amounts);
      const minAmount = Math.min(...amounts);
      
      // Amount escalation detection
      let escalations = 0;
      let significantJumps = 0;
      
      for (let i = 1; i < amounts.length; i++) {
        if (amounts[i] > amounts[i-1]) escalations++;
        if (amounts[i] > amounts[i-1] * 2) significantJumps++; // More than double
      }
  
      const escalationRate = escalations / Math.max(1, amounts.length - 1);
      const jumpRate = significantJumps / Math.max(1, amounts.length - 1);
  
      // High value detection (amounts > 10000)
      const highValueCount = amounts.filter(amt => amt > 10000).length;
      const highValueRatio = highValueCount / amounts.length;
  
      // Variance analysis
      const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgAmount > 0 ? stdDev / avgAmount : 0;
  
      return {
        transaction_count: amounts.length,
        total_amount: totalAmount,
        average_amount: avgAmount,
        max_amount: maxAmount,
        min_amount: minAmount,
        amount_variance: variance,
        coefficient_of_variation: coefficientOfVariation,
        escalation_rate: escalationRate,
        significant_jump_rate: jumpRate,
        high_value_ratio: highValueRatio,
        amount_trend: this.detectAmountTrend(amounts),
        risk_score: Math.min(100, (escalationRate * 40) + (jumpRate * 50) + (highValueRatio * 60) + (coefficientOfVariation * 30))
      };
    }
  
    /**
     * Analyze device usage patterns
     */
    analyzeDevicePatterns(transactions) {
      const devices = transactions.map(t => (t.device_type || 'unknown').toLowerCase());
      const uniqueDevices = [...new Set(devices)];
      
      let deviceSwitches = 0;
      for (let i = 1; i < devices.length; i++) {
        if (devices[i] !== devices[i-1]) deviceSwitches++;
      }
  
      const switchFrequency = deviceSwitches / Math.max(1, transactions.length - 1);
      
      // Device risk assessment
      const deviceRiskScore = devices.reduce((risk, device) => {
        return Math.max(risk, (this.deviceRiskWeights[device] || 0.5) * 100);
      }, 0);
  
      const deviceDistribution = {};
      devices.forEach(device => {
        deviceDistribution[device] = (deviceDistribution[device] || 0) + 1;
      });
  
      return {
        unique_devices: uniqueDevices.length,
        device_switches: deviceSwitches,
        switch_frequency: switchFrequency,
        most_used_device: Object.keys(deviceDistribution).reduce((a, b) => 
          deviceDistribution[a] > deviceDistribution[b] ? a : b, devices[0] || 'unknown'
        ),
        device_distribution: deviceDistribution,
        device_risk_score: deviceRiskScore,
        risk_score: Math.min(100, (switchFrequency * 70) + (deviceRiskScore * 0.3))
      };
    }
  
    /**
     * Analyze purchase category patterns
     */
    analyzeCategoryPatterns(transactions) {
      const categories = transactions.map(t => (t.merchant_category || 'unknown').toLowerCase());
      const uniqueCategories = [...new Set(categories)];
      
      // Category switching analysis
      let categorySwitches = 0;
      for (let i = 1; i < categories.length; i++) {
        if (categories[i] !== categories[i-1]) categorySwitches++;
      }
  
      const switchFrequency = categorySwitches / Math.max(1, categories.length - 1);
  
      // Category distribution
      const categoryDistribution = {};
      categories.forEach(cat => {
        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
      });
  
      // Luxury/high-risk category focus
      const luxuryCategories = ['jewelery', 'electronics'];
      const luxuryCount = categories.filter(cat => luxuryCategories.includes(cat)).length;
      const luxuryRatio = luxuryCount / categories.length;
  
      // Category risk assessment
      const categoryRiskScore = categories.reduce((risk, category) => {
        return Math.max(risk, (this.categoryRiskWeights[category] || 0.5) * 100);
      }, 0);
  
      return {
        unique_categories: uniqueCategories.length,
        category_switches: categorySwitches,
        switch_frequency: switchFrequency,
        luxury_ratio: luxuryRatio,
        most_frequent_category: Object.keys(categoryDistribution).reduce((a, b) => 
          categoryDistribution[a] > categoryDistribution[b] ? a : b, categories[0] || 'unknown'
        ),
        category_distribution: categoryDistribution,
        category_risk_score: categoryRiskScore,
        risk_score: Math.min(100, (switchFrequency * 50) + (luxuryRatio * 40) + (categoryRiskScore * 0.3))
      };
    }
  
    /**
     * Analyze historical patterns
     */
    analyzeHistoricalPatterns(transactions) {
      // Account age simulation (days since first transaction)
      const timestamps = transactions.map(t => new Date(t.timestamp || Date.now()));
      const firstTransaction = new Date(Math.min(...timestamps.map(ts => Number(ts))));
      const accountAge = (Date.now() - firstTransaction.getTime()) / (1000 * 60 * 60 * 24); // days
  
      // Decline rate analysis
      const statusTransactions = transactions.filter(t => t.status && t.status !== 'unknown');
      let declineRate = 0;
      
      if (statusTransactions.length > 0) {
        const declinedCount = statusTransactions.filter(t => 
          ['declined', 'expired', 'cancelled'].includes(t.status)
        ).length;
        declineRate = declinedCount / statusTransactions.length;
      }
  
      // Success rate for completed transactions
      const completedCount = statusTransactions.filter(t => t.status === 'completed').length;
      const successRate = statusTransactions.length > 0 ? completedCount / statusTransactions.length : 0;
  
      return {
        account_age_days: accountAge,
        total_requests: transactions.length,
        decline_rate: declineRate,
        success_rate: successRate,
        requests_with_status: statusTransactions.length,
        risk_score: Math.min(100, 
          (accountAge < 7 ? 60 : 0) + 
          (declineRate * 80) + 
          (successRate < 0.3 ? 40 : 0)
        )
      };
    }
  
    /**
     * Calculate overall risk scores with weighted components
     */
    calculateRiskScores(analysis) {
      const weights = {
        geographic: 0.20,
        temporal: 0.15,
        transaction: 0.25,
        device: 0.15,
        category: 0.10,
        historical: 0.15
      };
  
      const scores = {};
      let totalRiskScore = 0;
  
      Object.keys(weights).forEach(key => {
        const score = analysis[key]?.risk_score || 0;
        scores[key] = score;
        totalRiskScore += score * weights[key];
      });
  
      return {
        individual_scores: scores,
        weights: weights,
        total_risk_score: Math.min(100, totalRiskScore),
        risk_distribution: this.calculateRiskDistribution(scores)
      };
    }
  
    /**
     * Generate comprehensive risk assessment
     */
    generateRiskAssessment(riskScores, analysis) {
      const totalRisk = riskScores.total_risk_score;
      let riskLevel, riskColor;
  
      if (totalRisk >= 80) {
        riskLevel = 'critical';
        riskColor = '#dc2626';
      } else if (totalRisk >= 60) {
        riskLevel = 'high';
        riskColor = '#ea580c';
      } else if (totalRisk >= 40) {
        riskLevel = 'medium';
        riskColor = '#d97706';
      } else if (totalRisk >= 20) {
        riskLevel = 'low';
        riskColor = '#65a30d';
      } else {
        riskLevel = 'minimal';
        riskColor = '#16a34a';
      }
  
      // Identify specific risk factors
      const riskFactors = this.identifyRiskFactors(analysis);
      const positiveFactors = this.identifyPositiveFactors(analysis);
  
      return {
        overall_risk_level: riskLevel,
        risk_color: riskColor,
        total_risk_score: totalRisk,
        risk_factors: riskFactors,
        positive_factors: positiveFactors,
        primary_concerns: this.getPrimaryConcerns(riskScores.individual_scores),
        confidence_level: this.calculateConfidenceLevel(analysis)
      };
    }
  
    /**
     * Generate actionable behavioral insights
     */
    generateBehavioralInsights(analysis, transactions) {
      const insights: any[] = [];
  
      // Geographic insights
      if (analysis.geographic.unique_cities > 3) {
        insights.push({
          type: 'geographic',
          level: 'warning',
          message: `User has shipped to ${analysis.geographic.unique_cities} different cities`,
          impact: 'medium'
        });
      }
  
      // Temporal insights
      if (analysis.temporal.off_hours_ratio > 0.6) {
        insights.push({
          type: 'temporal',
          level: 'warning',
          message: `${Math.round(analysis.temporal.off_hours_ratio * 100)}% of activity during off-hours`,
          impact: 'medium'
        });
      }
  
      // Transaction insights
      if (analysis.transaction.escalation_rate > 0.7) {
        insights.push({
          type: 'transaction',
          level: 'alert',
          message: 'Strong pattern of increasing transaction amounts',
          impact: 'high'
        });
      }
  
      // Device insights
      if (analysis.device.unique_devices > 3) {
        insights.push({
          type: 'device',
          level: 'warning',
          message: `User has used ${analysis.device.unique_devices} different device types`,
          impact: 'medium'
        });
      }
  
      // Positive insights
      if (analysis.historical.success_rate > 0.8) {
        insights.push({
          type: 'positive',
          level: 'info',
          message: `High success rate: ${Math.round(analysis.historical.success_rate * 100)}%`,
          impact: 'positive'
        });
      }
  
      return insights;
    }
  
    /**
     * Generate recommendations for cardholders
     */
    generateRecommendations(riskAssessment, analysis) {
      const recommendations: any[] = [];
  
      if (riskAssessment.overall_risk_level === 'critical' || riskAssessment.overall_risk_level === 'high') {
        recommendations.push({
          priority: 'high',
          action: 'decline',
          reason: 'High risk profile detected',
          details: 'Multiple red flags indicate potential fraudulent behavior'
        });
      } else if (riskAssessment.overall_risk_level === 'medium') {
        recommendations.push({
          priority: 'medium',
          action: 'proceed_with_caution',
          reason: 'Moderate risk detected',
          details: 'Consider accepting with enhanced monitoring'
        });
      } else {
        recommendations.push({
          priority: 'low',
          action: 'accept',
          reason: 'Low risk profile',
          details: 'User shows normal behavior patterns'
        });
      }
  
      // Specific recommendations based on analysis
      if (analysis.geographic.change_frequency > 0.5) {
        recommendations.push({
          priority: 'medium',
          action: 'verify_address',
          reason: 'Frequent location changes',
          details: 'Request additional address verification'
        });
      }
  
      if (analysis.transaction.high_value_ratio > 0.3) {
        recommendations.push({
          priority: 'medium',
          action: 'limit_amount',
          reason: 'High-value transaction pattern',
          details: 'Consider setting transaction limits'
        });
      }
  
      return recommendations;
    }
  
    // Helper methods
    calculateTimeSpan(transactions) {
      if (transactions.length < 2) return 0;
      
      const timestamps = transactions.map(t => new Date(t.timestamp || Date.now()));
      const earliest = new Date(Math.min(...timestamps));
      const latest = new Date(Math.max(...timestamps));
      
      return (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24); // days
    }
  
    detectAmountTrend(amounts) {
      if (amounts.length < 3) return 'insufficient_data';
      
      let increasing = 0;
      let decreasing = 0;
      
      for (let i = 1; i < amounts.length; i++) {
        if (amounts[i] > amounts[i-1]) increasing++;
        else if (amounts[i] < amounts[i-1]) decreasing++;
      }
      
      const total = amounts.length - 1;
      if (increasing / total > 0.6) return 'increasing';
      if (decreasing / total > 0.6) return 'decreasing';
      return 'stable';
    }
  
    calculateRiskDistribution(scores: { [key: string]: number }) {
      const distribution: { [key: string]: number } = {};
      const total = Object.values(scores).reduce((sum: number, score: number) => sum + score, 0);
      Object.keys(scores).forEach(key => {
        distribution[key] = total > 0 ? (scores[key] / total) * 100 : 0;
      });
      return distribution;
    }
  
    identifyRiskFactors(analysis: any): string[] {
      const factors: string[] = [];
      if (analysis.geographic.change_frequency > 0.3) {
        factors.push('Frequent location changes');
      }
      if (analysis.temporal.off_hours_ratio > 0.5) {
        factors.push('Unusual time patterns');
      }
      if (analysis.transaction.escalation_rate > 0.6) {
        factors.push('Amount escalation pattern');
      }
      if (analysis.device.switch_frequency > 0.4) {
        factors.push('Frequent device switching');
      }
      if (analysis.historical.decline_rate > 0.4) {
        factors.push('High decline rate');
      }
      return factors;
    }
  
    identifyPositiveFactors(analysis: any): string[] {
      const factors: string[] = [];
      if (analysis.historical.success_rate > 0.8) {
        factors.push('High success rate');
      }
      if (analysis.geographic.unique_cities <= 2) {
        factors.push('Consistent delivery locations');
      }
      if (analysis.device.unique_devices <= 2) {
        factors.push('Consistent device usage');
      }
      if (analysis.historical.account_age_days > 30) {
        factors.push('Established account');
      }
      return factors;
    }
  
    getPrimaryConcerns(scores: { [key: string]: number }) {
      const concerns: { category: string; score: number; severity: string }[] = [];
      const sortedScores: [string, number][] = Object.entries(scores)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 3);
      sortedScores.forEach(([category, score]) => {
        if (Number(score) > 50) {
          concerns.push({
            category: category,
            score: Number(score),
            severity: Number(score) > 75 ? 'high' : 'medium'
          });
        }
      });
      return concerns;
    }
  
    calculateConfidenceLevel(analysis) {
      const transactionCount = analysis.transaction?.transaction_count || 0;
      const timeSpan = analysis.historical?.account_age_days || 0;
      
      if (transactionCount >= 10 && timeSpan >= 30) return 'high';
      if (transactionCount >= 5 && timeSpan >= 14) return 'medium';
      return 'low';
    }
  
    createDefaultReport(userId, message) {
      return {
        user_id: userId,
        error: false,
        message: message,
        trust_score: 50, // Default neutral score
        risk_assessment: {
          overall_risk_level: 'unknown',
          total_risk_score: 50,
          risk_factors: ['Insufficient data for analysis'],
          positive_factors: [],
          confidence_level: 'low'
        },
        behavioral_analysis: {
          geographic: { risk_score: 50 },
          temporal: { risk_score: 50 },
          transaction: { risk_score: 50 },
          device: { risk_score: 50 },
          category: { risk_score: 50 },
          historical: { risk_score: 50 }
        },
        behavioral_insights: [],
        recommendations: [{
          priority: 'medium',
          action: 'manual_review',
          reason: 'Insufficient data',
          details: 'Manual review recommended due to limited transaction history'
        }],
        analysis_metadata: {
          transactions_analyzed: 0,
          time_span_days: 0,
          analysis_version: "1.0.0"
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Export the class and utility functions
  export default TrustScoreGenerator;
  
  // Main utility function for easy integration
  export async function generateUserTrustReport(userId, transactions) {
    const generator = new TrustScoreGenerator();
    return generator.generateTrustReport(userId, transactions);
  }
  
  // Quick trust score calculation (simplified version)
  export function calculateQuickTrustScore(userId, transactions) {
    try {
      const generator = new TrustScoreGenerator();
      const report = generator.generateTrustReport(userId, transactions);
      
      return {
        trustScore: report.trust_score,
        riskLevel: report.risk_assessment.overall_risk_level,
        riskFactors: report.risk_assessment.risk_factors,
        recommendations: report.recommendations
      };
    } catch (error) {
      console.error('Quick trust score calculation error:', error);
      return {
        trustScore: 50,
        riskLevel: 'unknown',
        riskFactors: ['Analysis error'],
        recommendations: [{ action: 'manual_review', reason: 'System error' }]
      };
    }
  }
  
  // Utility to check if user is high risk
  export function isHighRiskUser(userId, transactions) {
    const quickScore = calculateQuickTrustScore(userId, transactions);
    return quickScore.trustScore < 40 || ['high', 'critical'].includes(quickScore.riskLevel);
  }