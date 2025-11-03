import { financesCache, CACHE_KEYS, CACHE_CONFIG, CacheManager } from './CacheService'
import { TicketsService, TicketEntry } from './TicketsService'

/**
 * Cached wrapper for TicketsService
 * TTL: 2 hours for tickets data (daily tracking)
 * Current month: 1 hour TTL (more dynamic)
 * Historical months: 3 hours TTL (static data)
 */
export class CachedTicketsService {
  /**
   * List all ticket entries for a specific month (with caching)
   */
  static async list(year: number, month: number): Promise<TicketEntry[]> {
    const key = CACHE_KEYS.ticketsMonthlyList(year, month)
    const cached = financesCache.get<TicketEntry[]>(key)
    if (cached) return cached

    const data = await TicketsService.list(year, month)
    
    // Adaptive TTL: current month shorter, historical longer
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 180 // 1hr current, 3hrs historical
    
    financesCache.set(key, data, ttl)
    return data
  }

  /**
   * Get tickets for a specific week (with caching)
   */
  static async listByWeek(week: string): Promise<TicketEntry[]> {
    const key = CACHE_KEYS.ticketsWeeklyList(week)
    const cached = financesCache.get<TicketEntry[]>(key)
    if (cached) return cached

    const data = await TicketsService.listByWeek(week)
    financesCache.set(key, data, 120) // 2hr TTL
    return data
  }

  /**
   * Calculate weekly total for a specific week and machine (with caching)
   */
  static async calculateWeeklyTotal(week: string, machineId: '76' | '79'): Promise<number> {
    const key = `${CACHE_KEYS.ticketsWeeklyTotals(week)}:${machineId}`
    const cached = financesCache.get<number>(key)
    if (cached !== null) return cached

    const total = await TicketsService.calculateWeeklyTotal(week, machineId)
    financesCache.set(key, total, 120) // 2hr TTL
    return total
  }

  /**
   * Get monthly statistics (with caching)
   */
  static async getMonthlyStats(year: number, month: number): Promise<{
    totalTickets: number
    machine76: number
    machine79: number
    dailyAverage: number
    weeklyBreakdown: Map<string, number>
  }> {
    const key = CACHE_KEYS.ticketsMonthlyStats(year, month)
    
    // Note: Map doesn't serialize well to localStorage, so we convert to/from plain object
    const cached = financesCache.get<any>(key)
    if (cached) {
      return {
        ...cached,
        weeklyBreakdown: new Map(Object.entries(cached.weeklyBreakdown || {}))
      }
    }

    const stats = await TicketsService.getMonthlyStats(year, month)
    
    // Convert Map to plain object for caching
    const cacheableStats = {
      ...stats,
      weeklyBreakdown: Object.fromEntries(stats.weeklyBreakdown)
    }
    
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 180 // 1hr current, 3hrs historical
    
    financesCache.set(key, cacheableStats, ttl)
    return stats
  }

  /**
   * Create a new ticket entry (invalidates cache)
   */
  static async create(entry: Omit<TicketEntry, 'id' | 'createdAt' | 'updatedAt' | 'week' | 'ticketsTotal'>): Promise<string> {
    const id = await TicketsService.create(entry)
    
    // Invalidate caches
    const { year, month } = TicketsService.parseYearMonth(entry.date)
    CacheManager.invalidateTicketsData(year, month)
    
    // Also invalidate weekly cache
    const week = TicketsService.getISOWeek(entry.date)
    financesCache.invalidatePattern(`tickets:weekly:.*:${week}`)
    
    return id
  }

  /**
   * Update an existing ticket entry (invalidates cache)
   */
  static async update(id: string, prev: TicketEntry, patch: Partial<TicketEntry>): Promise<void> {
    await TicketsService.update(id, prev, patch)
    
    // Invalidate caches for affected months
    const { year, month } = TicketsService.parseYearMonth(prev.date)
    CacheManager.invalidateTicketsData(year, month)
    
    // If date changed, invalidate new month too
    if (patch.date) {
      const newYM = TicketsService.parseYearMonth(patch.date)
      if (newYM.year !== year || newYM.month !== month) {
        CacheManager.invalidateTicketsData(newYM.year, newYM.month)
      }
      
      // Invalidate both weeks
      const oldWeek = prev.week
      const newWeek = TicketsService.getISOWeek(patch.date)
      financesCache.invalidatePattern(`tickets:weekly:.*:${oldWeek}`)
      if (newWeek !== oldWeek) {
        financesCache.invalidatePattern(`tickets:weekly:.*:${newWeek}`)
      }
    } else {
      // Just invalidate the current week
      financesCache.invalidatePattern(`tickets:weekly:.*:${prev.week}`)
    }
  }

  /**
   * Delete a ticket entry (invalidates cache)
   */
  static async remove(id: string, entry: TicketEntry): Promise<void> {
    await TicketsService.remove(id, entry)
    
    const { year, month } = TicketsService.parseYearMonth(entry.date)
    CacheManager.invalidateTicketsData(year, month)
    
    // Invalidate weekly cache
    financesCache.invalidatePattern(`tickets:weekly:.*:${entry.week}`)
  }

  /**
   * Cleanup cache manually
   */
  static cleanupCache(): void {
    financesCache.cleanup()
  }
}

export default CachedTicketsService
