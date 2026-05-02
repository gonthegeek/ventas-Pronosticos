/**
 * LotteryGamesService.cached.ts
 * Cached wrapper for lottery games service with 24hr TTL
 * Game lists change infrequently, so longer cache duration is appropriate
 */

import { LotteryGame, LotteryGamesService } from './LotteryGamesService'
import { CACHE_KEYS } from './CacheService'
import { salesCache, financesCache } from './CacheService'

// Use financesCache for lottery games (longer TTL - 24 hours)
const LOTTERY_GAMES_TTL = 60 * 24 // 24 hours in minutes

class LotteryGamesServiceCachedClass {
  /**
   * Get all lottery games (cached, 24hr TTL)
   */
  async list(): Promise<LotteryGame[]> {
    const cacheKey = CACHE_KEYS.lotteryGamesList()
    
    const cached = financesCache.get<LotteryGame[]>(cacheKey)
    if (cached) return cached
    
    const games = await LotteryGamesService.list()
    financesCache.set(cacheKey, games, LOTTERY_GAMES_TTL)
    
    return games
  }

  /**
   * Get only active lottery games (cached, 24hr TTL)
   */
  async listActive(): Promise<LotteryGame[]> {
    const cacheKey = CACHE_KEYS.lotteryGamesActive()
    
    const cached = financesCache.get<LotteryGame[]>(cacheKey)
    if (cached) return cached
    
    const games = await LotteryGamesService.listActive()
    financesCache.set(cacheKey, games, LOTTERY_GAMES_TTL)
    
    return games
  }

  /**
   * Get a single lottery game by ID (no cache, used for editing)
   */
  async getById(id: string): Promise<LotteryGame | null> {
    return LotteryGamesService.getById(id)
  }

  /**
   * Create a new lottery game
   */
  async create(game: Omit<LotteryGame, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return LotteryGamesService.create(game)
    // Cache is automatically invalidated by base service
  }

  /**
   * Update an existing lottery game
   */
  async update(id: string, updates: Partial<Omit<LotteryGame, 'id' | 'createdAt'>>): Promise<void> {
    return LotteryGamesService.update(id, updates)
    // Cache is automatically invalidated by base service
  }

  /**
   * Delete a lottery game
   */
  async remove(id: string): Promise<void> {
    return LotteryGamesService.remove(id)
    // Cache is automatically invalidated by base service
  }

  /**
   * Reorder games
   */
  async reorder(gameIds: string[]): Promise<void> {
    return LotteryGamesService.reorder(gameIds)
    // Cache is automatically invalidated by base service
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<void> {
    return LotteryGamesService.toggleActive(id)
    // Cache is automatically invalidated by base service
  }
}

export const LotteryGamesServiceCached = new LotteryGamesServiceCachedClass()
