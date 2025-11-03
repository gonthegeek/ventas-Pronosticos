import { financesCache, CACHE_KEYS, CacheManager } from './CacheService'
import { 
  TicketAveragesService, 
  TicketAverageEntry, 
  DailyAverageStats,
  MonthlyAverageStats
} from './TicketAveragesService'

/**
 * Cached wrapper for TicketAveragesService
 * TTL: 2 hours for ticket averages data (calculated metrics)
 * Current month: 1 hour TTL (more dynamic)
 * Historical months: 2 hours TTL (static data)
 * 
 * SRS #6: Promedio por boleto - Cached implementation
 */
export class CachedTicketAveragesService {
  /**
   * List all ticket average entries for a specific month (with caching)
   */
  static async list(year: number, month: number): Promise<TicketAverageEntry[]> {
    const key = `${CACHE_KEYS.ticketAveragesMonthlyList(year, month)}`
    const cached = financesCache.get<TicketAverageEntry[]>(key)
    if (cached) return cached

    const data = await TicketAveragesService.list(year, month)
    
    // Adaptive TTL: current month shorter, historical longer
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 120 // 1hr current, 2hrs historical
    
    financesCache.set(key, data, ttl)
    return data
  }

  /**
   * Calculate daily averages from sales and tickets data (with caching)
   */
  static async calculateDailyAverages(year: number, month: number): Promise<DailyAverageStats[]> {
    const key = `${CACHE_KEYS.ticketAveragesDailyStats(year, month)}`
    const cached = financesCache.get<DailyAverageStats[]>(key)
    if (cached) return cached

    const data = await TicketAveragesService.calculateDailyAverages(year, month)
    
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 120 // 1hr current, 2hrs historical
    
    financesCache.set(key, data, ttl)
    return data
  }

  /**
   * Get comprehensive monthly statistics (with caching)
   */
  static async getMonthlyStats(year: number, month: number): Promise<MonthlyAverageStats> {
    const key = `${CACHE_KEYS.ticketAveragesMonthlyStats(year, month)}`
    const cached = financesCache.get<MonthlyAverageStats>(key)
    if (cached) return cached

    const stats = await TicketAveragesService.getMonthlyStats(year, month)
    
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? 60 : 120 // 1hr current, 2hrs historical
    
    financesCache.set(key, stats, ttl)
    return stats
  }

  /**
   * Create a new ticket average entry (invalidates cache)
   */
  static async create(entry: Omit<TicketAverageEntry, 'id' | 'createdAt' | 'updatedAt' | 'week' | 'averagePerTicket'>): Promise<string> {
    const id = await TicketAveragesService.create(entry)
    
    // Invalidate caches
    const { year, month } = TicketAveragesService.parseYearMonth(entry.date)
    CacheManager.invalidateTicketAveragesData(year, month)
    
    return id
  }

  /**
   * Update an existing ticket average entry (invalidates cache)
   */
  static async update(id: string, prev: TicketAverageEntry, patch: Partial<TicketAverageEntry>): Promise<void> {
    await TicketAveragesService.update(id, prev, patch)
    
    // Invalidate caches for affected months
    const { year, month } = TicketAveragesService.parseYearMonth(prev.date)
    CacheManager.invalidateTicketAveragesData(year, month)
    
    // If date changed, invalidate new month too
    if (patch.date) {
      const newYM = TicketAveragesService.parseYearMonth(patch.date)
      if (newYM.year !== year || newYM.month !== month) {
        CacheManager.invalidateTicketAveragesData(newYM.year, newYM.month)
      }
    }
  }

  /**
   * Delete a ticket average entry (invalidates cache)
   */
  static async remove(id: string, entry: TicketAverageEntry): Promise<void> {
    await TicketAveragesService.remove(id, entry)
    
    const { year, month } = TicketAveragesService.parseYearMonth(entry.date)
    CacheManager.invalidateTicketAveragesData(year, month)
  }

  /**
   * Cleanup cache manually
   */
  static cleanupCache(): void {
    financesCache.cleanup()
  }
}

export default CachedTicketAveragesService
