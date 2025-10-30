import { useState, useEffect, useCallback } from 'react'
import CachedSalesService from '../services/SalesService.cached'
import { CacheManager } from '../services/CacheService'
import { HourlySalesData } from '../state/slices/salesSlice'

/**
 * Hook for cached dashboard data with automatic refresh
 */
export const useCachedDashboard = (autoRefreshMinutes: number = 10) => {
  const [data, setData] = useState({
    todaysSales: null as number | null,
    weekSales: null as number | null,
    monthSales: null as number | null,
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      if (forceRefresh) {
        CacheManager.invalidateDashboard()
      }
      
      const [todaysTotal, weekTotal, monthTotal] = await Promise.all([
        CachedSalesService.getTodaysSalesTotal(),
        CachedSalesService.getThisWeekTotal(),
        CachedSalesService.getThisMonthTotal()
      ])
      
      setData({
        todaysSales: todaysTotal,
        weekSales: weekTotal,
        monthSales: monthTotal,
      })
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshMinutes > 0) {
      const interval = setInterval(() => {
        loadData()
      }, autoRefreshMinutes * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [loadData, autoRefreshMinutes])

  const refresh = useCallback(() => loadData(true), [loadData])

  return {
    ...data,
    loading,
    lastUpdated,
    error,
    refresh,
  }
}

/**
 * Hook for cached hourly sales data
 */
export const useCachedHourlySales = (date: string) => {
  const [data, setData] = useState<HourlySalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      if (forceRefresh) {
        CacheManager.invalidateSalesData(date)
      }
      
      const hourlySales = await CachedSalesService.getHourlySalesForDate(date)
      setData(hourlySales)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hourly sales')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refresh = useCallback(() => loadData(true), [loadData])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  }
}

/**
 * Hook for cache statistics monitoring
 */
export const useCacheStats = () => {
  const [stats, setStats] = useState({
    sales: { hits: 0, misses: 0, size: 0, efficiency: 0, totalRequests: 0, savedRequests: 0 },
    dashboard: { hits: 0, misses: 0, size: 0, efficiency: 0, totalRequests: 0, savedRequests: 0 },
    requestsSaved: 0,
    efficiency: 0,
  })

  const updateStats = useCallback(() => {
    const cacheStats = CachedSalesService.getCacheStats()
    setStats(cacheStats)
  }, [])

  useEffect(() => {
    updateStats()
    
    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000)
    return () => clearInterval(interval)
  }, [updateStats])

  const cleanup = useCallback(() => {
    CachedSalesService.cleanupCache()
    updateStats()
  }, [updateStats])

  return {
    stats,
    updateStats,
    cleanup,
  }
}

/**
 * Hook for preloading cache on app startup
 */
export const useCachePreloader = () => {
  const [preloaded, setPreloaded] = useState(false)
  const [preloading, setPreloading] = useState(false)

  const preloadCache = useCallback(async () => {
    if (preloaded || preloading) return

    try {
      setPreloading(true)
      
      // Preload dashboard data
      await CachedSalesService.preloadDashboardCache()
      
      // Warm up cache with recent dates
      await CachedSalesService.warmupCache()
      
      setPreloaded(true)
    } catch (error) {
    } finally {
      setPreloading(false)
    }
  }, [preloaded, preloading])

  useEffect(() => {
    preloadCache()
  }, [preloadCache])

  return {
    preloaded,
    preloading,
    preloadCache,
  }
}

/**
 * Hook for batch loading multiple dates
 */
export const useBatchSalesData = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBatch = useCallback(async (dates: string[]): Promise<Map<string, number>> => {
    try {
      setLoading(true)
      setError(null)
      
      const results = await CachedSalesService.batchLoadDates(dates)
      return results
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load batch data'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loadBatch,
    loading,
    error,
  }
}

/**
 * Hook for comparing sales at a specific hour on a specific weekday
 * Example: Compare all Wednesdays at 21:00 for the last 8 weeks
 */
export const useCachedWeekdayHourComparison = (
  dayOfWeek: number,
  hour: number,
  numberOfOccurrences: number
) => {
  const [data, setData] = useState<Array<{ date: string; displayName: string; hourData: HourlySalesData }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const results = await CachedSalesService.getWeekdayHourlyComparison(
        dayOfWeek,
        hour,
        numberOfOccurrences
      )
      
      setData(results)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekday-hour comparison')
    } finally {
      setLoading(false)
    }
  }, [dayOfWeek, hour, numberOfOccurrences])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refresh = useCallback(() => loadData(true), [loadData])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  }
}

/**
 * Hook for comparing full day patterns for a specific weekday
 * Returns all 24 hours for each occurrence
 */
export const useCachedWeekdayFullComparison = (
  dayOfWeek: number,
  numberOfOccurrences: number
) => {
  const [data, setData] = useState<Array<{ date: string; displayName: string; hourlyData: HourlySalesData[] }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const results = await CachedSalesService.getWeekdayFullComparison(
        dayOfWeek,
        numberOfOccurrences
      )
      
      setData(results)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekday full comparison')
    } finally {
      setLoading(false)
    }
  }, [dayOfWeek, numberOfOccurrences])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refresh = useCallback(() => loadData(true), [loadData])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  }
}
