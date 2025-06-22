// /api/cardholder/available-cards-ranked - Enhanced version with ML ranking
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Cardholder from '../../../models/Cardholder';
import PaymentRequest from '../../../models/PaymentRequest';
import { expireOldRequests } from '../../../utils/expireOldRequests';
import cardRankingService from '../../../utils/cardRankingService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Clean up old requests before processing
  await expireOldRequests();
  await dbConnect();

  try {
    const { categories, requestType, useMLRanking = true } = req.body;

    console.log('Finding available cards with ranking:', { categories, requestType, useMLRanking });

    const THIRTY_SECONDS_AGO = new Date(Date.now() - 30 * 1000);

    // Build base query
    let query: any = {
      'cards.categories': { $in: categories },
      'cards.isActive': true,
    };

    // If it's an "immediate" request, only include truly live cardholders
    if (requestType === 'immediate') {
      query.lastActiveAt = { $gte: THIRTY_SECONDS_AGO };
    }

    const cardholders = await Cardholder.find(query);

    if (cardholders.length === 0) {
      return res.status(200).json([]);
    }

    // Extract available cards before ranking
    const availableCards = [];
    const cardholderMap = new Map();

    cardholders.forEach(cardholder => {
      cardholder.cards.forEach(card => {
        const categoryMatch = card.categories.some(cat => categories.includes(cat));
        if (card.isActive && categoryMatch) {
          const cardData = {
            id: card.id,
            cardholderEmail: cardholder.userId,
            cardholderName: cardholder.name,
            bankName: card.bankName,
            cardType: card.cardType,
            categories: card.categories,
            discountPercentage: card.discountPercentage,
            isOnline: requestType === 'immediate',
            lastFourDigits: card.lastFourDigits,
            monthlyLimit: card.monthlyLimit,
            cardholderData: cardholder
          };
          availableCards.push(cardData);
          cardholderMap.set(cardholder.userId, cardholder);
        }
      });
    });

    let rankedCards = availableCards;

    // Apply ML ranking if requested and service is available
    if (useMLRanking && availableCards.length > 1) {
      try {
        console.log('Applying ML ranking to', availableCards.length, 'cards');

        // Check if ranking service is healthy
        const health = await cardRankingService.checkHealth();
        console.log('Ranking service health:', health);

        if (health.isHealthy) {
          // Fetch request histories for performance calculation
          const cardholderEmails = [...cardholderMap.keys()];
          const requestHistories = {};

          // Get request history for each cardholder
          for (const email of cardholderEmails) {
            try {
              const history = await PaymentRequest.find({ 
                cardholderEmail: email 
              }).sort({ createdAt: -1 }).limit(50); // Last 50 requests
              requestHistories[email] = history;
            } catch (error) {
              console.warn(`Failed to fetch history for ${email}:`, error);
              requestHistories[email] = [];
            }
          }

          // Get top ranked cardholders
          const uniqueCardholders = Array.from(cardholderMap.values());
          const merchantCategory = categories[0] || 'general';
          
          const rankingResult = await cardRankingService.getTopCardholders(
            uniqueCardholders,
            requestHistories,
            Math.min(uniqueCardholders.length, 20), // Get top 20
            merchantCategory
          );

          console.log('Ranking result:', { 
            success: rankingResult.success, 
            topCount: rankingResult.topCardholders?.length,
            error: rankingResult.error 
          });

          if (rankingResult.success && rankingResult.topCardholders) {
            // Create ranking map
            const rankingMap = new Map();
            rankingResult.topCardholders.forEach(ranking => {
              rankingMap.set(ranking.cardholder_id, {
                rank: ranking.rank,
                healthScore: ranking.health_score,
                processingTime: rankingResult.processingTime,
                mlRanked: true
              });
            });

            // Apply rankings to cards and sort
            rankedCards = availableCards
              .map(card => ({
                ...card,
                ranking: rankingMap.get(card.cardholderEmail) || {
                  rank: 999,
                  healthScore: 0.3,
                  mlRanked: false
                }
              }))
              .sort((a, b) => {
                // Primary sort: by ML rank (lower is better)
                if (a.ranking.rank !== b.ranking.rank) {
                  return a.ranking.rank - b.ranking.rank;
                }
                // Secondary sort: by health score (higher is better)
                return b.ranking.healthScore - a.ranking.healthScore;
              });

            console.log('Applied ML ranking to cards. Top 3 health scores:', 
              rankedCards.slice(0, 3).map(c => ({
                email: c.cardholderEmail,
                rank: c.ranking.rank,
                score: c.ranking.healthScore
              }))
            );
          } else {
            console.warn('ML ranking failed, falling back to heuristic sorting');
            throw new Error(rankingResult.error || 'Ranking service failed');
          }
        } else {
          throw new Error('Ranking service not healthy');
        }
      } catch (rankingError) {
        console.warn('ML ranking failed, using fallback sorting:', rankingError.message);
        
        // Fallback: sort by heuristic scoring
        rankedCards = availableCards
          .map(card => ({
            ...card,
            ranking: {
              rank: 0,
              healthScore: calculateHeuristicScore(card.cardholderData),
              mlRanked: false,
              fallback: true
            }
          }))
          .sort((a, b) => {
            // Sort by discount percentage first, then heuristic score
            if (a.discountPercentage !== b.discountPercentage) {
              return b.discountPercentage - a.discountPercentage;
            }
            return b.ranking.healthScore - a.ranking.healthScore;
          });
      }
    } else {
      // No ML ranking requested - use simple sorting
      rankedCards = availableCards.sort((a, b) => b.discountPercentage - a.discountPercentage);
    }

    // Prepare response data (remove sensitive cardholder data)
    const responseCards = rankedCards.map((card, index) => ({
      id: card.id,
      cardholderEmail: card.cardholderEmail,
      bankName: card.bankName,
      cardType: card.cardType,
      categories: card.categories,
      discountPercentage: card.discountPercentage,
      isOnline: card.isOnline,
      lastFourDigits: card.lastFourDigits,
      // Add ranking information
      ...(card.ranking && {
        ranking: {
          rank: card.ranking.rank || index + 1,
          healthScore: card.ranking.healthScore,
          mlRanked: card.ranking.mlRanked || false,
          processingTime: card.ranking.processingTime
        }
      })
    }));

    console.log(`Returning ${responseCards.length} ranked cards`);

    res.status(200).json(responseCards);
  } catch (error) {
    console.error('Error fetching available cards with ranking:', error);
    res.status(500).json({ error: 'Failed to fetch available cards' });
  }
}

/**
 * Calculate heuristic score for fallback ranking
 */
function calculateHeuristicScore(cardholder) {
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

  // Account age bonus
  const accountAgeMonths = cardholder.registeredAt 
    ? (Date.now() - new Date(cardholder.registeredAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 0;
  if (accountAgeMonths > 6) score += 0.05;

  return Math.min(Math.max(score, 0), 1);
}