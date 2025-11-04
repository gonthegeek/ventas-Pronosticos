import { financesCache, CACHE_KEYS, CacheManager } from './CacheService'
import { RollChangesService, RollChangeEntry } from './RollChangesService'

/**
 * Cached wrapper for RollChangesService
 * TTL: 2 hours for roll changes data (event-based)
 * SRS #3: Cambio de rollo
 */
export class CachedRollChangesService {
  /**
   * List all roll change entries for a specific month (with caching)
   */
  static async list(year: number, month: number): Promise<RollChangeEntry[]> {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`
    const key = `rollChanges:monthly:list:${yearMonth}`
    const cached = financesCache.get<RollChangeEntry[]>(key)
    if (cached) return cached

    const data = await RollChangesService.list(year, month)
    
    // 2 hour TTL for event-based data
    financesCache.set(key, data, 120)
    return data
  }

  /**
   * Get a single roll change entry (with caching)
   */
  static async get(id: string, year: number, month: number): Promise<RollChangeEntry | null> {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`
    const key = `rollChanges:entry:${id}:${yearMonth}`
    const cached = financesCache.get<RollChangeEntry | null>(key)
    if (cached !== undefined) return cached

    const data = await RollChangesService.get(id, year, month)
    financesCache.set(key, data, 120) // 2hr TTL
    return data
  }

  /**
   * Get monthly statistics (with caching)
   */
  static async getMonthlyStats(year: number, month: number): Promise<{
    totalChanges: number
    machine76: number
    machine79: number
    averageFrequency76: number
    averageFrequency79: number
    changesByDate: Map<string, number>
  }> {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`
    const key = `rollChanges:monthly:stats:${yearMonth}`
    
    // Note: Map doesn't serialize well to localStorage, so we convert to/from plain object
    const cached = financesCache.get<any>(key)
    if (cached) {
      return {
        ...cached,
        changesByDate: new Map(Object.entries(cached.changesByDate || {}))
      }
    }

    const stats = await RollChangesService.getMonthlyStats(year, month)
    
    // Convert Map to plain object for caching
    const cacheableStats = {
      ...stats,
      changesByDate: Object.fromEntries(stats.changesByDate)
    }
    
    financesCache.set(key, cacheableStats, 120) // 2hr TTL
    return stats
  }

  /**
   * Get time between changes for a specific machine (with caching)
   */
  static async getTimeBetweenChanges(
    year: number, 
    month: number, 
    machineId: '76' | '79'
  ): Promise<number[]> {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`
    const key = `rollChanges:intervals:${machineId}:${yearMonth}`
    const cached = financesCache.get<number[]>(key)
    if (cached) return cached

    const intervals = await RollChangesService.getTimeBetweenChanges(year, month, machineId)
    financesCache.set(key, intervals, 120) // 2hr TTL
    return intervals
  }

  /**
   * List roll changes across multiple months (with caching)
   */
  static async listRange(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<RollChangeEntry[]> {
    const key = `rollChanges:range:${startYear}-${startMonth}:${endYear}-${endMonth}`
    const cached = financesCache.get<RollChangeEntry[]>(key)
    if (cached) return cached

    const data = await RollChangesService.listRange(startYear, startMonth, endYear, endMonth)
    financesCache.set(key, data, 120) // 2hr TTL
    return data
  }

  /**
   * Create a new roll change entry (invalidates cache)
   */
  static async create(entry: Omit<RollChangeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await RollChangesService.create(entry)
    
    // Invalidate caches
    const { year, month } = RollChangesService.parseYearMonth(entry.date)
    CacheManager.invalidateRollChangesData(year, month)
    
    return id
  }

  /**
   * Update an existing roll change entry (invalidates cache)
   */
  static async update(id: string, prev: RollChangeEntry, patch: Partial<RollChangeEntry>): Promise<void> {
    await RollChangesService.update(id, prev, patch)
    
    // Invalidate caches for affected months
    const { year, month } = RollChangesService.parseYearMonth(prev.date)
    CacheManager.invalidateRollChangesData(year, month)
    
    // If date changed to different month, invalidate new month too
    if (patch.date) {
      const newYM = RollChangesService.parseYearMonth(patch.date)
      if (newYM.year !== year || newYM.month !== month) {
        CacheManager.invalidateRollChangesData(newYM.year, newYM.month)
      }
    }
  }

  /**
   * Delete a roll change entry (invalidates cache)
   */
  static async remove(id: string, entry: RollChangeEntry): Promise<void> {
    await RollChangesService.remove(id, entry)
    
    const { year, month } = RollChangesService.parseYearMonth(entry.date)
    CacheManager.invalidateRollChangesData(year, month)
  }

  /**
   * Cleanup cache manually
   */
  static cleanupCache(): void {
    financesCache.cleanup()
  }
}

export default CachedRollChangesService
