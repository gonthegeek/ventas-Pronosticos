/**
 * Simple cache for Casa Pronósticos
 * Reduces Firebase queries for dashboard and general app usage
 */

interface CacheItem {
  data: any
  timestamp: number
  expiry: number
}

class SimpleCache {
  private cache = new Map<string, CacheItem>()
  private stats = { hits: 0, misses: 0 }

  get(key: string): any | null {
    const item = this.cache.get(key)
    
    if (!item || Date.now() > item.expiry) {
      if (item) this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    this.stats.hits++
    return item.data
  }

  set(key: string, data: any, ttlMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    })
  }

  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      size: this.cache.size,
      efficiency: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0
    }
  }
}

// Global cache instance
export const appCache = new SimpleCache()

// Cache keys
export const CACHE_KEYS = {
  dailyTotal: (date: string) => `daily-total:${date}`,
  weeklyTotal: (startDate: string) => `weekly-total:${startDate}`,
  monthlyTotal: (month: string) => `monthly-total:${month}`,
  salesData: (date: string) => `sales-data:${date}`,
  userProfile: (userId: string) => `user-profile:${userId}`
}

export default appCache
