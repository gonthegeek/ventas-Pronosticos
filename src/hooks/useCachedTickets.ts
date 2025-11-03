import { useState, useEffect, useCallback } from 'react'
import CachedTicketsService from '../services/TicketsService.cached'
import { TicketEntry } from '../services/TicketsService'

/**
 * Helper to parse "YYYY-MM" into year, month
 */
const parseYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [y, m] = yearMonth.split('-')
  return { year: parseInt(y, 10), month: parseInt(m, 10) }
}

/**
 * Hook to fetch and manage monthly ticket entries with caching
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedMonthlyTickets = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<TicketEntry[]>([])
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
      const list = await CachedTicketsService.list(year, month)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading tickets')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  // Mutations
  const create = useCallback(async (entry: Omit<TicketEntry, 'id' | 'createdAt' | 'updatedAt' | 'week' | 'ticketsTotal'>) => {
    await CachedTicketsService.create(entry)
    await load()
  }, [load])

  const update = useCallback(async (id: string, prev: TicketEntry, patch: Partial<TicketEntry>) => {
    await CachedTicketsService.update(id, prev, patch)
    await load()
  }, [load])

  const remove = useCallback(async (id: string, entry: TicketEntry) => {
    await CachedTicketsService.remove(id, entry)
    await load()
  }, [load])

  return { data, loading, error, lastUpdated, refresh, create, update, remove }
}

/**
 * Hook to fetch and manage weekly ticket entries with caching
 * @param week Format: "YYYY-Www" (ISO week)
 */
export const useCachedWeeklyTickets = (week: string) => {
  const [data, setData] = useState<TicketEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const list = await CachedTicketsService.listByWeek(week)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading weekly tickets')
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { data, loading, error, lastUpdated, refresh }
}

/**
 * Hook to fetch monthly ticket statistics with caching
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedMonthlyTicketStats = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [stats, setStats] = useState<{
    totalTickets: number
    machine76: number
    machine79: number
    dailyAverage: number
    weeklyBreakdown: Map<string, number>
  } | null>(null)
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
      const data = await CachedTicketsService.getMonthlyStats(year, month)
      setStats(data)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading ticket statistics')
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
 * Hook to calculate weekly total for a specific machine
 * @param week Format: "YYYY-Www"
 * @param machineId '76' or '79'
 */
export const useCachedWeeklyTotal = (week: string, machineId: '76' | '79') => {
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await CachedTicketsService.calculateWeeklyTotal(week, machineId)
      setTotal(result)
    } catch (e: any) {
      setError(e?.message || 'Error calculating weekly total')
    } finally {
      setLoading(false)
    }
  }, [week, machineId])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { total, loading, error, refresh }
}

export default useCachedMonthlyTickets
