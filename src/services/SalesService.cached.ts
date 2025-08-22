import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { SaleEntry, HourlySalesData } from '../state/slices/salesSlice'
import { getMexicoDateRange } from '../utils/timezone'
import { 
  salesCache, 
  dashboardCache, 
  CacheManager, 
  CACHE_KEYS, 
  CACHE_CONFIG 
} from './CacheService'

/**
 * Enhanced SalesService with comprehensive caching
 * Minimizes Firestore requests while maintaining data consistency
 */
export class CachedSalesService {
  // Hierarchical collection structure: data/sales/{year}/{month}/{day}
  private static getCollectionPath(date: string): string {
    const mexicoDateString = date.includes('T') ? date : `${date}T12:00:00-06:00`
    const dateObj = new Date(mexicoDateString)
    
    const mexicoTimeString = dateObj.toLocaleString('en-CA', { 
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    const [year, month, day] = mexicoTimeString.split('-')
    return `data/sales/${year}/${month}/${day}`
  }

  /**
   * Add new sale entry with cache invalidation
   */
  static async addSale(saleData: Omit<SaleEntry, 'id'>): Promise<string> {
    try {
      const saleDate = saleData.timestamp.toLocaleDateString('en-CA', { 
        timeZone: 'America/Mexico_City' 
      })
      const collectionPath = this.getCollectionPath(saleDate)
      
      const year = saleData.timestamp.getFullYear()
      const month = String(saleData.timestamp.getMonth() + 1).padStart(2, '0')

      const docRef = await addDoc(collection(db, collectionPath), {
        machineId: saleData.machineId,
        amount: saleData.amount,
        totalSales: (saleData as any).totalSales || saleData.amount,
        timestamp: Timestamp.fromDate(saleData.timestamp),
        hour: saleData.hour || saleData.timestamp.getHours(),
        date: saleDate,
        yearMonth: `${year}-${month}`,
        operatorId: saleData.operatorId,
        notes: saleData.notes || '',
        createdAt: Timestamp.now(),
      })
      
      // Invalidate relevant caches
      this.invalidateCachesForDate(saleDate)
      
      return docRef.id
    } catch (error) {
      console.error('Error adding sale:', error)
      throw error
    }
  }

  /**
   * Get sales for specific date with caching
   */
  static async getSalesForDate(date: string): Promise<SaleEntry[]> {
    const cacheKey = CACHE_KEYS.salesForDate(date)
    
    // Try cache first
    const cachedData = salesCache.get<SaleEntry[]>(cacheKey)
    if (cachedData) {
      console.log(`📋 Cache hit for sales data: ${date}`)
      return cachedData
    }

    try {
      console.log(`🔥 Firestore query for sales data: ${date}`)
      const collectionPath = this.getCollectionPath(date)
      const querySnapshot = await getDocs(collection(db, collectionPath))
      
      const results = querySnapshot.docs.map((doc: any) => {
        const data = doc.data()
        
        let numericHour = data.hour;
        if (typeof data.hour === 'string' && data.hour.includes(':')) {
          numericHour = parseInt(data.hour.split(':')[0]);
        } else if (typeof data.hour === 'number') {
          numericHour = data.hour;
        } else {
          numericHour = data.timestamp.toDate().getHours();
        }
        
        return {
          id: doc.id,
          machineId: data.machineId,
          amount: data.amount,
          totalSales: data.totalSales || data.amount,
          timestamp: data.timestamp.toDate(),
          hour: numericHour,
          operatorId: data.operatorId,
          notes: data.notes || '',
        }
      }) as SaleEntry[]
      
      // Cache the results
      salesCache.set(cacheKey, results, CACHE_CONFIG.SALES_DAILY.ttl)
      
      return results
    } catch (error) {
      console.error('Error getting sales for date:', error)
      return []
    }
  }

  /**
   * Get hourly sales data with caching
   */
  static async getHourlySalesForDate(date: string): Promise<HourlySalesData[]> {
    const cacheKey = CACHE_KEYS.hourlySales(date)
    
    // Try cache first
    const cachedData = salesCache.get<HourlySalesData[]>(cacheKey)
    if (cachedData) {
      console.log(`📊 Cache hit for hourly sales: ${date}`)
      return cachedData
    }

    try {
      console.log(`🔥 Firestore query for hourly sales: ${date}`)
      const collectionPath = this.getCollectionPath(date)
      const { start: startDate, end: endDate } = getMexicoDateRange(date)

      const querySnapshot = await getDocs(collection(db, collectionPath))
      const hoursWithData = new Map<number, HourlySalesData>()

      querySnapshot.docs.forEach((doc: any) => {
        const data = doc.data()
        const saleTimestamp = data.timestamp.toDate()
        
        let saleHour = data.hour;
        if (typeof data.hour === 'string' && data.hour.includes(':')) {
          saleHour = parseInt(data.hour.split(':')[0]);
        } else if (typeof data.hour === 'number') {
          saleHour = data.hour;
        } else {
          const mexicoTime = new Date(saleTimestamp.toLocaleString("en-US", {timeZone: "America/Mexico_City"}))
          saleHour = mexicoTime.getHours()
        }
        
        const machineId = data.machineId
        const amount = data.amount || 0
        
        if (saleHour >= 0 && saleHour < 24) {
          if (!hoursWithData.has(saleHour)) {
            hoursWithData.set(saleHour, {
              hour: saleHour,
              machine76: 0,
              machine79: 0,
              total: 0,
              lastUpdated: saleTimestamp.toISOString(),
            })
          }
          
          const hourData = hoursWithData.get(saleHour)!
          
          if (machineId === '76') {
            hourData.machine76 += amount
          } else if (machineId === '79') {
            hourData.machine79 += amount
          }
          hourData.total = hourData.machine76 + hourData.machine79
          hourData.lastUpdated = saleTimestamp.toISOString()
        }
      })

      const hourlySales = Array.from(hoursWithData.values()).sort((a, b) => a.hour - b.hour)
      
      // Cache the results
      salesCache.set(cacheKey, hourlySales, CACHE_CONFIG.SALES_HOURLY.ttl)
      
      return hourlySales
    } catch (error) {
      console.error('Error getting hourly sales:', error)
      return []
    }
  }

  /**
   * Get daily total sales with caching
   */
  static async getDailySalesTotal(date: string): Promise<number> {
    const cacheKey = CACHE_KEYS.dailyTotal(date)
    
    // Try cache first
    const cachedTotal = salesCache.get<number>(cacheKey)
    if (cachedTotal !== null) {
      console.log(`💰 Cache hit for daily total: ${date}`)
      return cachedTotal
    }

    try {
      console.log(`🔥 Calculating daily total from Firestore: ${date}`)
      const hourlySales = await this.getHourlySalesForDate(date)
      const total = hourlySales.reduce((sum, hourData) => sum + hourData.total, 0)
      
      // Cache the total
      salesCache.set(cacheKey, total, CACHE_CONFIG.SALES_DAILY.ttl)
      
      return total
    } catch (error) {
      console.error('Error getting daily sales total:', error)
      return 0
    }
  }

  /**
   * Get today's sales total with caching
   */
  static async getTodaysSalesTotal(): Promise<number> {
    const cacheKey = CACHE_KEYS.todaysSales()
    
    // Try dashboard cache first (shorter TTL for current data)
    const cachedTotal = dashboardCache.get<number>(cacheKey)
    if (cachedTotal !== null) {
      console.log(`🎯 Cache hit for today's sales`)
      return cachedTotal
    }

    try {
      const mexicoNow = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'America/Mexico_City' 
      })
      
      console.log(`🔥 Fetching today's sales from Firestore`)
      const total = await this.getDailySalesTotal(mexicoNow)
      
      // Cache with shorter TTL since it's current data
      dashboardCache.set(cacheKey, total, CACHE_CONFIG.DASHBOARD_STATS.ttl)
      
      return total
    } catch (error) {
      console.error('Error getting today\'s sales total:', error)
      return 0
    }
  }

  /**
   * Get this week's sales total with caching
   */
  static async getThisWeekTotal(): Promise<number> {
    const cacheKey = CACHE_KEYS.thisWeekSales()
    
    // Try dashboard cache first
    const cachedTotal = dashboardCache.get<number>(cacheKey)
    if (cachedTotal !== null) {
      console.log(`📅 Cache hit for this week's sales`)
      return cachedTotal
    }

    try {
      console.log(`🔥 Calculating this week's sales from Firestore`)
      const mexicoNow = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}))
      
      const dayOfWeek = mexicoNow.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart = new Date(mexicoNow)
      weekStart.setDate(mexicoNow.getDate() - daysFromMonday)
      
      let weeklyTotal = 0
      const currentDate = new Date(weekStart)
      
      // Use Promise.all for parallel requests
      const datePromises: Promise<number>[] = []
      const dates: string[] = []
      
      while (currentDate <= mexicoNow) {
        const dateString = currentDate.toLocaleDateString('en-CA')
        dates.push(dateString)
        datePromises.push(this.getDailySalesTotal(dateString))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      const dailyTotals = await Promise.all(datePromises)
      weeklyTotal = dailyTotals.reduce((sum, total) => sum + total, 0)
      
      // Cache the weekly total
      dashboardCache.set(cacheKey, weeklyTotal, CACHE_CONFIG.SALES_WEEKLY.ttl)
      
      return weeklyTotal
    } catch (error) {
      console.error('Error getting this week\'s sales total:', error)
      return 0
    }
  }

  /**
   * Get monthly total with caching and batch optimization
   */
  static async getMonthlyTotal(year?: number, month?: number): Promise<number> {
    const now = new Date()
    const targetYear = year ?? now.getFullYear()
    const targetMonth = month ?? (now.getMonth() + 1)
    
    const cacheKey = CACHE_KEYS.monthlyTotal(targetYear, targetMonth)
    
    // Try cache first
    const cachedTotal = salesCache.get<number>(cacheKey)
    if (cachedTotal !== null) {
      console.log(`📅 Cache hit for monthly total: ${targetYear}-${targetMonth}`)
      return cachedTotal
    }

    try {
      console.log(`🔥 Calculating monthly total from Firestore: ${targetYear}-${targetMonth}`)
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
      
      // Use Promise.all for parallel daily requests
      const dailyPromises: Promise<number>[] = []
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        dailyPromises.push(this.getDailySalesTotal(dateString))
      }
      
      const dailyTotals = await Promise.all(dailyPromises)
      const monthlyTotal = dailyTotals.reduce((sum, total) => sum + total, 0)
      
      // Cache with longer TTL for historical data
      const ttl = (targetYear === now.getFullYear() && targetMonth === (now.getMonth() + 1)) 
        ? CACHE_CONFIG.SALES_MONTHLY.ttl / 2  // Current month: shorter TTL
        : CACHE_CONFIG.SALES_MONTHLY.ttl * 2  // Historical month: longer TTL
      
      salesCache.set(cacheKey, monthlyTotal, ttl)
      
      return monthlyTotal
    } catch (error) {
      console.error('Error getting monthly sales total:', error)
      return 0
    }
  }

  /**
   * Get this month's sales total with caching
   */
  static async getThisMonthTotal(): Promise<number> {
    const cacheKey = CACHE_KEYS.thisMonthSales()
    
    // Try dashboard cache first
    const cachedTotal = dashboardCache.get<number>(cacheKey)
    if (cachedTotal !== null) {
      console.log(`📊 Cache hit for this month's sales`)
      return cachedTotal
    }

    try {
      const mexicoNow = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}))
      const total = await this.getMonthlyTotal(mexicoNow.getFullYear(), mexicoNow.getMonth() + 1)
      
      // Cache in dashboard cache
      dashboardCache.set(cacheKey, total, CACHE_CONFIG.DASHBOARD_STATS.ttl)
      
      return total
    } catch (error) {
      console.error('Error getting this month\'s sales total:', error)
      return 0
    }
  }

  /**
   * Update sale entry with cache invalidation
   */
  static async updateSale(saleId: string, oldData: SaleEntry, newData: Partial<SaleEntry>): Promise<void> {
    try {
      const dateStr = oldData.timestamp.toISOString().split('T')[0]
      const collectionPath = this.getCollectionPath(dateStr)
      
      const updateData: any = {
        updatedAt: Timestamp.now(),
      }
      
      if (newData.amount !== undefined) updateData.amount = newData.amount
      if (newData.totalSales !== undefined) updateData.totalSales = newData.totalSales
      if (newData.machineId !== undefined) updateData.machineId = newData.machineId
      if (newData.notes !== undefined) updateData.notes = newData.notes
      
      await updateDoc(doc(db, collectionPath, saleId), updateData)
      
      // Invalidate relevant caches
      this.invalidateCachesForDate(dateStr)
      
    } catch (error) {
      console.error('Error updating sale:', error)
      throw error
    }
  }

  /**
   * Delete sale entry with cache invalidation
   */
  static async deleteSale(saleId: string, saleData: SaleEntry): Promise<void> {
    try {
      const dateStr = saleData.timestamp.toISOString().split('T')[0]
      const collectionPath = this.getCollectionPath(dateStr)
      await deleteDoc(doc(db, collectionPath, saleId))
      
      // Invalidate relevant caches
      this.invalidateCachesForDate(dateStr)
      
    } catch (error) {
      console.error('Error deleting sale:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time updates (disables caching for subscribed data)
   */
  static subscribeToHourlySales(
    date: string, 
    callback: (data: HourlySalesData[]) => void
  ): () => void {
    // Clear cache for this date since we're getting real-time updates
    const cacheKey = CACHE_KEYS.hourlySales(date)
    salesCache.delete(cacheKey)
    
    const q = query(
      collection(db, 'hourlySales'), // Using old collection for compatibility
      where('date', '==', date),
      orderBy('hour', 'asc')
    )

    return onSnapshot(q, (querySnapshot: any) => {
      const hourlySales: HourlySalesData[] = []

      for (let hour = 0; hour < 24; hour++) {
        hourlySales.push({
          hour,
          machine76: 0,
          machine79: 0,
          total: 0,
          lastUpdated: new Date().toISOString(),
        })
      }

      querySnapshot.docs.forEach((doc: any) => {
        const data = doc.data()
        const hourIndex = data.hour
        if (hourIndex >= 0 && hourIndex < 24) {
          hourlySales[hourIndex] = {
            hour: data.hour,
            machine76: data.machine76 || 0,
            machine79: data.machine79 || 0,
            total: (data.machine76 || 0) + (data.machine79 || 0),
            lastUpdated: data.lastUpdated?.toDate().toISOString() || new Date().toISOString(),
          }
        }
      })

      callback(hourlySales)
    })
  }

  /**
   * Batch load multiple dates efficiently
   */
  static async batchLoadDates(dates: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>()
    const uncachedDates: string[] = []
    
    // Check cache for each date
    for (const date of dates) {
      const cacheKey = CACHE_KEYS.dailyTotal(date)
      const cachedTotal = salesCache.get<number>(cacheKey)
      
      if (cachedTotal !== null) {
        results.set(date, cachedTotal)
      } else {
        uncachedDates.push(date)
      }
    }
    
    console.log(`📦 Batch load: ${results.size} from cache, ${uncachedDates.length} from Firestore`)
    
    // Fetch uncached dates in parallel
    if (uncachedDates.length > 0) {
      const fetchPromises = uncachedDates.map(async (date) => {
        const total = await this.getDailySalesTotal(date)
        results.set(date, total)
        return { date, total }
      })
      
      await Promise.all(fetchPromises)
    }
    
    return results
  }

  /**
   * Preload cache for common dashboard queries
   */
  static async preloadDashboardCache(): Promise<void> {
    console.log('🚀 Preloading dashboard cache...')
    
    try {
      // Preload current period data
      const promises = [
        this.getTodaysSalesTotal(),
        this.getThisWeekTotal(), 
        this.getThisMonthTotal()
      ]
      
      await Promise.all(promises)
      console.log('✅ Dashboard cache preloaded')
    } catch (error) {
      console.error('❌ Failed to preload dashboard cache:', error)
    }
  }

  /**
   * Cache warmup for frequently accessed dates
   */
  static async warmupCache(): Promise<void> {
    console.log('🔥 Warming up cache...')
    
    try {
      const now = new Date()
      const dates: string[] = []
      
      // Last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        dates.push(date.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }))
      }
      
      // Load in batch
      await this.batchLoadDates(dates)
      console.log('✅ Cache warmed up for last 7 days')
    } catch (error) {
      console.error('❌ Cache warmup failed:', error)
    }
  }

  /**
   * Invalidate caches for a specific date and related aggregations
   */
  private static invalidateCachesForDate(date: string): void {
    const dateObj = new Date(date)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    
    // Invalidate specific date caches
    salesCache.delete(CACHE_KEYS.dailyTotal(date))
    salesCache.delete(CACHE_KEYS.hourlySales(date))
    salesCache.delete(CACHE_KEYS.salesForDate(date))
    
    // Invalidate monthly cache
    salesCache.delete(CACHE_KEYS.monthlyTotal(year, month))
    
    // Invalidate dashboard caches (they aggregate data)
    dashboardCache.clear()
    
    console.log(`🗑️ Invalidated caches for date: ${date}`)
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): {
    sales: any
    dashboard: any
    requestsSaved: number
    efficiency: number
  } {
    const salesStats = salesCache.getStats()
    const dashboardStats = dashboardCache.getStats()
    
    const totalRequests = salesStats.totalRequests + dashboardStats.totalRequests
    const totalSaved = salesStats.savedRequests + dashboardStats.savedRequests
    
    return {
      sales: salesStats,
      dashboard: dashboardStats,
      requestsSaved: totalSaved,
      efficiency: totalRequests > 0 ? Math.round((totalSaved / totalRequests) * 100) : 0
    }
  }

  /**
   * Manual cache cleanup
   */
  static cleanupCache(): void {
    console.log('🧹 Cleaning up caches...')
    CacheManager.cleanup()
  }
}

export default CachedSalesService
