import { useState, useEffect, useCallback } from 'react'
import CachedTicketAveragesService from '../services/TicketAveragesService.cached'
import { 
  TicketAverageEntry, 
  DailyAverageStats,
  MonthlyAverageStats
} from '../services/TicketAveragesService'

/**
 * Helper to parse "YYYY-MM" into year, month
 */
const parseYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [y, m] = yearMonth.split('-')
  return { year: parseInt(y, 10), month: parseInt(m, 10) }
}

/**
 * Hook to fetch and manage monthly ticket average entries with caching
 * @param yearMonth Format: "YYYY-MM"
 * 
 * SRS #6: Promedio por boleto
 */
export const useCachedMonthlyTicketAverages = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<TicketAverageEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setYM(parseYearMonth(yearMonth))
  }, [yearMonth])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const list = await CachedTicketAveragesService.list(year, month)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading ticket averages')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  // Mutations
  const create = useCallback(async (entry: Omit<TicketAverageEntry, 'id' | 'createdAt' | 'updatedAt' | 'week' | 'averagePerTicket'>) => {
    await CachedTicketAveragesService.create(entry)
    await load()
  }, [load])

  const update = useCallback(async (id: string, prev: TicketAverageEntry, patch: Partial<TicketAverageEntry>) => {
    await CachedTicketAveragesService.update(id, prev, patch)
    await load()
  }, [load])

  const remove = useCallback(async (id: string, entry: TicketAverageEntry) => {
    await CachedTicketAveragesService.remove(id, entry)
    await load()
  }, [load])

  return { data, loading, error, lastUpdated, refresh, create, update, remove }
}

/**
 * Hook to calculate and fetch daily averages from sales and tickets data
 * This is the core calculation that combines SRS #1 and SRS #5 data
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedDailyAverages = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<DailyAverageStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setYM(parseYearMonth(yearMonth))
  }, [yearMonth])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const dailyStats = await CachedTicketAveragesService.calculateDailyAverages(year, month)
      setData(dailyStats)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error calculating daily averages')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { data, loading, error, lastUpdated, refresh }
}

/**
 * Hook to fetch comprehensive monthly statistics
 * Includes overall averages, machine breakdowns, best/worst days, and weekly trends
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedMonthlyAverageStats = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [stats, setStats] = useState<MonthlyAverageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setYM(parseYearMonth(yearMonth))
  }, [yearMonth])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const monthlyStats = await CachedTicketAveragesService.getMonthlyStats(year, month)
      setStats(monthlyStats)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading monthly statistics')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { stats, loading, error, lastUpdated, refresh }
}

/**
 * Combined hook that provides all ticket average data for a month
 * Useful for comprehensive views that need multiple data sources
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedTicketAveragesComplete = (yearMonth: string) => {
  const entries = useCachedMonthlyTicketAverages(yearMonth)
  const dailyAverages = useCachedDailyAverages(yearMonth)
  const monthlyStats = useCachedMonthlyAverageStats(yearMonth)

  const loading = entries.loading || dailyAverages.loading || monthlyStats.loading
  const error = entries.error || dailyAverages.error || monthlyStats.error

  const refreshAll = useCallback(() => {
    entries.refresh()
    dailyAverages.refresh()
    monthlyStats.refresh()
  }, [entries, dailyAverages, monthlyStats])

  return {
    entries: entries.data,
    dailyAverages: dailyAverages.data,
    monthlyStats: monthlyStats.stats,
    loading,
    error,
    refresh: refreshAll,
    // Expose individual refresh functions
    refreshEntries: entries.refresh,
    refreshDailyAverages: dailyAverages.refresh,
    refreshMonthlyStats: monthlyStats.refresh,
    // Expose CRUD operations
    create: entries.create,
    update: entries.update,
    remove: entries.remove,
  }
}

export default useCachedMonthlyTicketAverages
