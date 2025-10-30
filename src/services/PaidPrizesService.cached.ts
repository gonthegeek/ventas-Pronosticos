import { financesCache, CACHE_KEYS, CACHE_CONFIG, CacheManager } from './CacheService'
import { PaidPrizesService, PaidPrizeEntry } from './PaidPrizesService'

/**
 * Cached wrapper for PaidPrizesService
 * TTL: 2 hours for weekly aggregation
 * Intelligent caching with adaptive TTL for current vs historical data
 */
export class CachedPaidPrizesService {
  /**
   * List all paid prize entries for a specific month (cached)
   */
  static async list(year: number, month: number): Promise<PaidPrizeEntry[]> {
    const key = CACHE_KEYS.paidPrizesMonthlyList(year, month)
    const cached = financesCache.get<PaidPrizeEntry[]>(key)
    if (cached) return cached

    const data = await PaidPrizesService.list(year, month)
    
    // Current month might change more often; use a shorter TTL
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent 
      ? CACHE_CONFIG.PAID_PRIZES_MONTHLY.ttl / 2  // 1 hour for current month
      : CACHE_CONFIG.PAID_PRIZES_MONTHLY.ttl      // 2 hours for historical
    
    financesCache.set(key, data, ttl)
    return data
  }

  /**
   * List paid prize entries for a specific week (cached)
   */
  static async listByWeek(week: string): Promise<PaidPrizeEntry[]> {
    const key = CACHE_KEYS.paidPrizesWeeklyList(week)
    const cached = financesCache.get<PaidPrizeEntry[]>(key)
    if (cached) return cached

    const data = await PaidPrizesService.listByWeek(week)
    
    // Use weekly cache TTL
    financesCache.set(key, data, CACHE_CONFIG.PAID_PRIZES_WEEKLY.ttl)
    return data
  }

  /**
   * Get a single paid prize entry by ID (cached)
   */
  static async getById(id: string, year: number, month: number): Promise<PaidPrizeEntry | null> {
    // For single items, rely on the list cache
    const allEntries = await this.list(year, month)
    return allEntries.find(entry => entry.id === id) || null
  }

  /**
   * Create a new paid prize entry
   */
  static async create(entry: Omit<PaidPrizeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await PaidPrizesService.create(entry)
    
    // Invalidate cache for the affected month and week
    const [year, month] = entry.date.split('-').map(Number)
    CacheManager.invalidatePaidPrizesData(year, month)
    
    // Also invalidate the specific week cache
    financesCache.delete(CACHE_KEYS.paidPrizesWeeklyList(entry.week))
    financesCache.delete(CACHE_KEYS.paidPrizesWeeklyTotals(entry.week))
    
    return id
  }

  /**
   * Update an existing paid prize entry
   */
  static async update(
    id: string, 
    prev: PaidPrizeEntry, 
    patch: Partial<PaidPrizeEntry>
  ): Promise<void> {
    await PaidPrizesService.update(id, prev, patch)
    
    // Invalidate cache for the affected month
    const [year, month] = prev.date.split('-').map(Number)
    CacheManager.invalidatePaidPrizesData(year, month)
    
    // Invalidate week caches
    financesCache.delete(CACHE_KEYS.paidPrizesWeeklyList(prev.week))
    financesCache.delete(CACHE_KEYS.paidPrizesWeeklyTotals(prev.week))
    
    // If the week changed, also invalidate the new week
    if (patch.week && patch.week !== prev.week) {
      financesCache.delete(CACHE_KEYS.paidPrizesWeeklyList(patch.week))
      financesCache.delete(CACHE_KEYS.paidPrizesWeeklyTotals(patch.week))
    }
  }

  /**
   * Delete a paid prize entry
   */
  static async remove(id: string, entry: PaidPrizeEntry): Promise<void> {
    await PaidPrizesService.remove(id, entry)
    
    // Invalidate cache for the affected month
    const [year, month] = entry.date.split('-').map(Number)
    CacheManager.invalidatePaidPrizesData(year, month)
    
    // Invalidate week caches
    financesCache.delete(CACHE_KEYS.paidPrizesWeeklyList(entry.week))
    financesCache.delete(CACHE_KEYS.paidPrizesWeeklyTotals(entry.week))
  }

  /**
   * Get weekly totals for paid prizes (cached)
   */
  static async getWeeklyTotals(week: string): Promise<{
    totalAmount: number
    totalTickets: number
    entries: PaidPrizeEntry[]
  }> {
    const key = CACHE_KEYS.paidPrizesWeeklyTotals(week)
    const cached = financesCache.get<{
      totalAmount: number
      totalTickets: number
      entries: PaidPrizeEntry[]
    }>(key)
    if (cached) return cached

    const data = await PaidPrizesService.getWeeklyTotals(week)
    
    // Use weekly cache TTL
    financesCache.set(key, data, CACHE_CONFIG.PAID_PRIZES_WEEKLY.ttl)
    return data
  }

  /**
   * Get monthly totals for paid prizes (cached)
   */
  static async getMonthlyTotals(year: number, month: number): Promise<{
    totalAmount: number
    totalTickets: number
    entries: PaidPrizeEntry[]
  }> {
    const key = CACHE_KEYS.paidPrizesMonthlyTotals(year, month)
    const cached = financesCache.get<{
      totalAmount: number
      totalTickets: number
      entries: PaidPrizeEntry[]
    }>(key)
    if (cached) return cached

    const data = await PaidPrizesService.getMonthlyTotals(year, month)
    
    // Use monthly cache TTL with adaptive behavior
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent 
      ? CACHE_CONFIG.PAID_PRIZES_MONTHLY.ttl / 2  // 1 hour for current month
      : CACHE_CONFIG.PAID_PRIZES_MONTHLY.ttl      // 2 hours for historical
    
    financesCache.set(key, data, ttl)
    return data
  }

  /**
   * Cleanup expired cache entries
   */
  static cleanupCache(): void {
    financesCache.cleanup()
  }

  /**
   * Clear all paid prizes cache
   */
  static clearCache(): void {
    CacheManager.invalidatePaidPrizesData()
  }
}

export default CachedPaidPrizesService
