/**
 * Enhanced Cache Service for Casa Pronósticos
 * Multi-layer caching system to minimize Firestore requests and stay within free tier
 */

interface CacheItem<T = any> {
  data: T
  timestamp: number
  expiry: number
  accessCount: number
  lastAccessed: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  efficiency: number
  totalRequests: number
  savedRequests: number
}

interface CacheOptions {
  maxSize?: number
  defaultTTL?: number
  enableCompression?: boolean
  enablePersistence?: boolean
}

/**
 * Smart Cache Service with multiple optimization strategies
 */
export class CacheService {
  private cache = new Map<string, CacheItem>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    efficiency: 0,
    totalRequests: 0,
    savedRequests: 0
  }
  
  private options: Required<CacheOptions>
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 100,
      defaultTTL: options.defaultTTL || 5, // 5 minutes default
      enableCompression: options.enableCompression || false,
      enablePersistence: options.enablePersistence || true
    }

    // Start cleanup interval
    this.startCleanupInterval()
    
    // Load from localStorage if persistence is enabled
    if (this.options.enablePersistence) {
      this.loadFromStorage()
    }
  }

  /**
   * Get cached data with smart invalidation
   */
  get<T = any>(key: string): T | null {
    this.stats.totalRequests++
    
    const item = this.cache.get(key)
    
    if (!item || this.isExpired(item)) {
      if (item) {
        this.cache.delete(key)
      }
      this.stats.misses++
      this.updateStats()
      return null
    }
    
    // Update access tracking
    item.accessCount++
    item.lastAccessed = Date.now()
    
    this.stats.hits++
    this.stats.savedRequests++
    this.updateStats()
    
    return item.data
  }

  /**
   * Set cached data with smart eviction
   */
  set<T = any>(key: string, data: T, ttlMinutes?: number): void {
    const ttl = (ttlMinutes || this.options.defaultTTL) * 60 * 1000
    
    // Handle cache size limit
    if (this.cache.size >= this.options.maxSize) {
      this.evictLeastUsed()
    }
    
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
      accessCount: 1,
      lastAccessed: Date.now()
    }
    
    this.cache.set(key, item)
    this.updateStats()
    
    // Persist to storage if enabled
    if (this.options.enablePersistence) {
      this.persistToStorage(key, item)
    }
  }

  /**
   * Check if item exists and is valid
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    return item ? !this.isExpired(item) : false
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (result) {
      this.updateStats()
      this.removeFromStorage(key)
    }
    return result
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      efficiency: 0,
      totalRequests: 0,
      savedRequests: 0
    }
    this.clearStorage()
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let count = 0
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        this.removeFromStorage(key)
        count++
      }
    }
    
    this.updateStats()
    return count
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get detailed cache info for debugging
   */
  getDebugInfo(): {
    entries: Array<{ key: string; item: CacheItem; isExpired: boolean }>
    stats: CacheStats
    options: Required<CacheOptions>
  } {
    const entries = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      item,
      isExpired: this.isExpired(item)
    }))
    
    return {
      entries,
      stats: this.getStats(),
      options: this.options
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let cleaned = 0
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key)
        this.removeFromStorage(key)
        cleaned++
      }
    }
    
    this.updateStats()
    return cleaned
  }

  /**
   * Destroy cache service and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }

  // Private methods

  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiry
  }

  private evictLeastUsed(): void {
    if (this.cache.size === 0) return
    
    let leastUsedKey = ''
    let leastUsedScore = Infinity
    
    for (const [key, item] of this.cache.entries()) {
      // Score based on access count and recency
      const ageWeight = (Date.now() - item.lastAccessed) / 1000 / 60 // minutes
      const score = item.accessCount - (ageWeight * 0.1)
      
      if (score < leastUsedScore) {
        leastUsedScore = score
        leastUsedKey = key
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
      this.removeFromStorage(leastUsedKey)
    }
  }

  private updateStats(): void {
    this.stats.size = this.cache.size
    const total = this.stats.hits + this.stats.misses
    this.stats.efficiency = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0
  }

  private startCleanupInterval(): void {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup()
      if (cleaned > 0) {
      }
    }, 5 * 60 * 1000)
  }

  private persistToStorage(key: string, item: CacheItem): void {
    try {
      const storageKey = `casa_cache_${key}`
      localStorage.setItem(storageKey, JSON.stringify(item))
    } catch (error) {
      // Storage quota exceeded or not available
    }
  }

  private removeFromStorage(key: string): void {
    try {
      const storageKey = `casa_cache_${key}`
      localStorage.removeItem(storageKey)
    } catch (error) {
    }
  }

  private loadFromStorage(): void {
    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith('casa_cache_'))
      
      for (const storageKey of cacheKeys) {
        const key = storageKey.replace('casa_cache_', '')
        const itemStr = localStorage.getItem(storageKey)
        
        if (itemStr) {
          const item: CacheItem = JSON.parse(itemStr)
          
          // Only load if not expired
          if (!this.isExpired(item)) {
            this.cache.set(key, item)
          } else {
            localStorage.removeItem(storageKey)
          }
        }
      }
      
      this.updateStats()
    } catch (error) {
    }
  }

  private clearStorage(): void {
    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith('casa_cache_'))
      
      for (const key of cacheKeys) {
        localStorage.removeItem(key)
      }
    } catch (error) {
    }
  }
}

// Cache configuration for different data types
export const CACHE_CONFIG = {
  // Sales data caching (varies by data type)
  SALES_DAILY: { ttl: 30, pattern: 'sales:daily:*' },      // 30 minutes
  SALES_WEEKLY: { ttl: 60, pattern: 'sales:weekly:*' },    // 1 hour  
  SALES_MONTHLY: { ttl: 120, pattern: 'sales:monthly:*' }, // 2 hours
  SALES_HOURLY: { ttl: 5, pattern: 'sales:hourly:*' },     // 5 minutes
  
  // User data caching
  USER_PROFILE: { ttl: 30, pattern: 'user:profile:*' },    // 30 minutes
  USER_PERMISSIONS: { ttl: 60, pattern: 'user:perms:*' },  // 1 hour
  
  // Dashboard data
  DASHBOARD_STATS: { ttl: 10, pattern: 'dashboard:*' },    // 10 minutes
  
  // Comparison data (can be cached longer since it's historical)
  COMPARISON_DATA: { ttl: 240, pattern: 'comparison:*' },  // 4 hours

  // Commissions (monthly data)
  COMMISSIONS_MONTHLY: { ttl: 240, pattern: 'commissions:monthly:*' }, // 4 hours

  // Paid prizes (weekly aggregation)
  PAID_PRIZES_WEEKLY: { ttl: 120, pattern: 'paidPrizes:weekly:*' }, // 2 hours
  PAID_PRIZES_MONTHLY: { ttl: 120, pattern: 'paidPrizes:monthly:*' }, // 2 hours
}

// Cache key generators
export const CACHE_KEYS = {
  // Sales data keys
  dailyTotal: (date: string) => `sales:daily:total:${date}`,
  weeklyTotal: (startDate: string) => `sales:weekly:total:${startDate}`,
  monthlyTotal: (year: number, month: number) => `sales:monthly:total:${year}-${month}`,
  hourlySales: (date: string) => `sales:hourly:data:${date}`,
  salesForDate: (date: string) => `sales:daily:entries:${date}`,
  
  // Dashboard keys
  todaysSales: () => `dashboard:today:${new Date().toDateString()}`,
  thisWeekSales: () => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
    return `dashboard:week:${weekStart.toDateString()}`
  },
  thisMonthSales: () => {
    const now = new Date()
    return `dashboard:month:${now.getFullYear()}-${now.getMonth() + 1}`
  },
  
  // User keys
  userProfile: (userId: string) => `user:profile:${userId}`,
  userPermissions: (userId: string) => `user:perms:${userId}`,
  
  // Comparison keys
  comparisonData: (startDate: string, endDate: string, type: string) => 
    `comparison:${type}:${startDate}:${endDate}`,

  // Commissions keys
  commissionsMonthlyList: (year: number, month: number) => `commissions:monthly:list:${year}-${String(month).padStart(2, '0')}`,

  // Paid prizes keys
  paidPrizesMonthlyList: (year: number, month: number) => `paidPrizes:monthly:list:${year}-${String(month).padStart(2, '0')}`,
  paidPrizesWeeklyList: (week: string) => `paidPrizes:weekly:list:${week}`,
  paidPrizesWeeklyTotals: (week: string) => `paidPrizes:weekly:totals:${week}`,
  paidPrizesMonthlyTotals: (year: number, month: number) => `paidPrizes:monthly:totals:${year}-${String(month).padStart(2, '0')}`,

  // Tickets keys
  ticketsMonthlyList: (year: number, month: number) => `tickets:monthly:list:${year}-${String(month).padStart(2, '0')}`,
  ticketsWeeklyList: (week: string) => `tickets:weekly:list:${week}`,
  ticketsWeeklyTotals: (week: string) => `tickets:weekly:totals:${week}`,
  ticketsMonthlyStats: (year: number, month: number) => `tickets:monthly:stats:${year}-${String(month).padStart(2, '0')}`,
}

// Global cache instances
export const salesCache = new CacheService({
  maxSize: 50,
  defaultTTL: 15, // 15 minutes default for sales data
  enablePersistence: true
})

export const userCache = new CacheService({
  maxSize: 20,
  defaultTTL: 30, // 30 minutes default for user data
  enablePersistence: true
})

export const dashboardCache = new CacheService({
  maxSize: 10,
  defaultTTL: 10, // 10 minutes default for dashboard data
  enablePersistence: false // Don't persist dashboard cache (too dynamic)
})

// Finances cache (commissions and related monthly data)
export const financesCache = new CacheService({
  maxSize: 50,
  defaultTTL: 240, // 4 hours default for monthly data
  enablePersistence: true
})

// Cache manager for coordinated invalidation
export class CacheManager {
  static invalidateSalesData(date?: string): void {
    if (date) {
      // Invalidate specific date data
      salesCache.invalidatePattern(`sales:.*:${date}`)
      dashboardCache.invalidatePattern('dashboard:.*')
    } else {
      // Invalidate all sales data
      salesCache.invalidatePattern('sales:.*')
      dashboardCache.clear()
    }
  }
  
  static invalidateCommissionsData(year?: number, month?: number): void {
    if (year && month) {
      financesCache.invalidatePattern(`commissions:monthly:.*:${year}-${String(month).padStart(2, '0')}`)
    } else {
      financesCache.invalidatePattern('commissions:.*')
    }
  }

  static invalidatePaidPrizesData(year?: number, month?: number): void {
    if (year && month) {
      financesCache.invalidatePattern(`paidPrizes:.*:${year}-${String(month).padStart(2, '0')}`)
    } else {
      financesCache.invalidatePattern('paidPrizes:.*')
    }
  }

  static invalidateTicketsData(year?: number, month?: number): void {
    if (year && month) {
      financesCache.invalidatePattern(`tickets:.*:${year}-${String(month).padStart(2, '0')}`)
    } else {
      financesCache.invalidatePattern('tickets:.*')
    }
  }
  
  static invalidateUserData(userId?: string): void {
    if (userId) {
      userCache.invalidatePattern(`user:.*:${userId}`)
    } else {
      userCache.clear()
    }
  }
  
  static invalidateDashboard(): void {
    dashboardCache.clear()
  }
  
  static getGlobalStats(): {
    sales: CacheStats
    finances: CacheStats
    user: CacheStats
    dashboard: CacheStats
    total: CacheStats
  } {
    const salesStats = salesCache.getStats()
    const financesStats = financesCache.getStats()
    const userStats = userCache.getStats()
    const dashboardStats = dashboardCache.getStats()
    
    return {
      sales: salesStats,
      finances: financesStats,
      user: userStats,
      dashboard: dashboardStats,
      total: {
        hits: salesStats.hits + financesStats.hits + userStats.hits + dashboardStats.hits,
        misses: salesStats.misses + financesStats.misses + userStats.misses + dashboardStats.misses,
        size: salesStats.size + financesStats.size + userStats.size + dashboardStats.size,
        efficiency: Math.round(
          ((salesStats.hits + financesStats.hits + userStats.hits + dashboardStats.hits) / 
           (salesStats.totalRequests + financesStats.totalRequests + userStats.totalRequests + dashboardStats.totalRequests)) * 100
        ) || 0,
        totalRequests: salesStats.totalRequests + financesStats.totalRequests + userStats.totalRequests + dashboardStats.totalRequests,
        savedRequests: salesStats.savedRequests + financesStats.savedRequests + userStats.savedRequests + dashboardStats.savedRequests
      }
    }
  }
  
  static cleanup(): void {
    salesCache.cleanup()
    financesCache.cleanup()
    userCache.cleanup()
    dashboardCache.cleanup()
  }
  
  static destroy(): void {
    salesCache.destroy()
    financesCache.destroy()
    userCache.destroy()
    dashboardCache.destroy()
  }
}

export default CacheService