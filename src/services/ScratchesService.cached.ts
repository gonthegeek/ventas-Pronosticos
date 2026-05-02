import { financesCache, CACHE_KEYS, CacheManager } from './CacheService'
import { ScratchesService, ScratchEntry } from './ScratchesService'

/**
 * Cached wrapper for ScratchesService
 * TTL: 1 hour for scratches data (event-based updates)
 * Current month: 1 hour TTL (more dynamic)
 * Historical months: 2 hours TTL (static data)
 */
export class CachedScratchesService {
  /**
   * List all scratch entries for a specific month (with caching)
   */
  static async list(year: number, month: number): Promise<ScratchEntry[]> {
    const key = CACHE_KEYS.scratchesMonthlyList(year, month)
    const cached = financesCache.get<ScratchEntry[]>(key)
    if (cached) return cached

    const data = await ScratchesService.list(year, month)
    
    // Adaptive TTL: current month shorter, historical longer
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 120 // 1hr current, 2hrs historical
    
    financesCache.set(key, data, ttl)
    return data
  }

  /**
   * Get scratch entries for a specific week (with caching)
   */
  static async listByWeek(week: string): Promise<ScratchEntry[]> {
    const key = CACHE_KEYS.scratchesWeeklyList(week)
    const cached = financesCache.get<ScratchEntry[]>(key)
    if (cached) return cached

    const data = await ScratchesService.listByWeek(week)
    financesCache.set(key, data, 60) // 1hr TTL
    return data
  }

  /**
   * Get scratch entries by lottery type (with caching)
   */
  static async listByLottery(year: number, month: number, lottery: string): Promise<ScratchEntry[]> {
    const key = CACHE_KEYS.scratchesLotteryList(year, month, lottery)
    const cached = financesCache.get<ScratchEntry[]>(key)
    if (cached) return cached

    const data = await ScratchesService.listByLottery(year, month, lottery)
    
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 120 // 1hr current, 2hrs historical
    
    financesCache.set(key, data, ttl)
    return data
  }

  /**
   * Get monthly statistics (with caching)
   */
  static async getMonthlyStats(year: number, month: number): Promise<{
    totalPrizes: number
    totalAmount: number
    averagePrize: number
    lotteryBreakdown: Map<string, { count: number; amount: number }>
    weeklyBreakdown: Map<string, { count: number; amount: number }>
    topPrizes: ScratchEntry[]
  }> {
    const key = CACHE_KEYS.scratchesMonthlyStats(year, month)
    
    // Note: Map doesn't serialize well to localStorage, so we convert to/from plain object
    const cached = financesCache.get<any>(key)
    if (cached) {
      return {
        ...cached,
        lotteryBreakdown: new Map(Object.entries(cached.lotteryBreakdown || {})),
        weeklyBreakdown: new Map(Object.entries(cached.weeklyBreakdown || {}))
      }
    }

    const stats = await ScratchesService.getMonthlyStats(year, month)
    
    // Convert Maps to plain objects for caching
    const cacheableStats = {
      ...stats,
      lotteryBreakdown: Object.fromEntries(stats.lotteryBreakdown),
      weeklyBreakdown: Object.fromEntries(stats.weeklyBreakdown)
    }
    
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 120 // 1hr current, 2hrs historical
    
    financesCache.set(key, cacheableStats, ttl)
    return stats
  }

  /**
   * Get all unique lottery types (with caching)
   */
  static async getLotteryTypes(year: number, month: number): Promise<string[]> {
    const key = CACHE_KEYS.scratchesLotteryTypes(year, month)
    const cached = financesCache.get<string[]>(key)
    if (cached) return cached

    const types = await ScratchesService.getLotteryTypes(year, month)
    
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 120 // 1hr current, 2hrs historical
    
    financesCache.set(key, types, ttl)
    return types
  }

  /**
   * Get year-to-date statistics (with caching)
   */
  static async getYearToDateStats(year: number, currentMonth: number): Promise<{
    totalPrizes: number
    totalAmount: number
    monthlyTotals: Map<number, { count: number; amount: number }>
  }> {
    const key = `scratches:ytd:stats:${year}-${currentMonth}`
    
    const cached = financesCache.get<any>(key)
    if (cached) {
      return {
        ...cached,
        monthlyTotals: new Map(Object.entries(cached.monthlyTotals || {}).map(([k, v]) => [parseInt(k), v]))
      }
    }

    const stats = await ScratchesService.getYearToDateStats(year, currentMonth)
    
    // Convert Map to plain object for caching
    const cacheableStats = {
      ...stats,
      monthlyTotals: Object.fromEntries(stats.monthlyTotals)
    }
    
    // YTD data: 30 min TTL for current year, 2 hours for historical
    const now = new Date()
    const isCurrent = now.getFullYear() === year
    const ttl = isCurrent ? 30 : 120
    
    financesCache.set(key, cacheableStats, ttl)
    return stats
  }

  /**
   * Create a new scratch entry (invalidates cache)
   */
  static async create(entry: Omit<ScratchEntry, 'id' | 'createdAt' | 'updatedAt' | 'week'>): Promise<string> {
    const id = await ScratchesService.create(entry)
    
    // Invalidate caches
    const { year, month } = ScratchesService.parseYearMonth(entry.date)
    CacheManager.invalidateScratchesData(year, month)
    
    // Also invalidate weekly cache
    const week = ScratchesService.getISOWeek(entry.date)
    financesCache.invalidatePattern(`scratches:weekly:.*:${week}`)
    
    // Invalidate lottery-specific cache
    financesCache.delete(CACHE_KEYS.scratchesLotteryList(year, month, entry.lottery))
    financesCache.delete(CACHE_KEYS.scratchesLotteryTypes(year, month))
    
    return id
  }

  /**
   * Update an existing scratch entry (invalidates cache)
   */
  static async update(id: string, prev: ScratchEntry, patch: Partial<ScratchEntry>): Promise<void> {
    await ScratchesService.update(id, prev, patch)
    
    // Invalidate caches for affected months
    const { year, month } = ScratchesService.parseYearMonth(prev.date)
    CacheManager.invalidateScratchesData(year, month)
    
    // If date changed, invalidate new month too
    if (patch.date) {
      const newYM = ScratchesService.parseYearMonth(patch.date)
      if (newYM.year !== year || newYM.month !== month) {
        CacheManager.invalidateScratchesData(newYM.year, newYM.month)
      }
      
      // Invalidate both weeks
      const oldWeek = prev.week
      const newWeek = ScratchesService.getISOWeek(patch.date)
      financesCache.invalidatePattern(`scratches:weekly:.*:${oldWeek}`)
      if (newWeek !== oldWeek) {
        financesCache.invalidatePattern(`scratches:weekly:.*:${newWeek}`)
      }
    } else {
      // Just invalidate the current week
      financesCache.invalidatePattern(`scratches:weekly:.*:${prev.week}`)
    }
    
    // If lottery changed, invalidate both lottery caches
    if (patch.lottery && patch.lottery !== prev.lottery) {
      financesCache.delete(CACHE_KEYS.scratchesLotteryList(year, month, prev.lottery))
      financesCache.delete(CACHE_KEYS.scratchesLotteryList(year, month, patch.lottery))
      financesCache.delete(CACHE_KEYS.scratchesLotteryTypes(year, month))
    } else if (patch.lottery) {
      financesCache.delete(CACHE_KEYS.scratchesLotteryList(year, month, patch.lottery))
    }
  }

  /**
   * Delete a scratch entry (invalidates cache)
   */
  static async remove(id: string, entry: ScratchEntry): Promise<void> {
    await ScratchesService.remove(id, entry)
    
    const { year, month } = ScratchesService.parseYearMonth(entry.date)
    CacheManager.invalidateScratchesData(year, month)
    
    // Invalidate weekly cache
    financesCache.invalidatePattern(`scratches:weekly:.*:${entry.week}`)
    
    // Invalidate lottery-specific cache
    financesCache.delete(CACHE_KEYS.scratchesLotteryList(year, month, entry.lottery))
    financesCache.delete(CACHE_KEYS.scratchesLotteryTypes(year, month))
  }

  /**
   * Cleanup cache manually
   */
  static cleanupCache(): void {
    financesCache.cleanup()
  }
}

export default CachedScratchesService
