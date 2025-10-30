import { useState, useEffect, useCallback } from 'react'
import CachedPaidPrizesService from '../services/PaidPrizesService.cached'
import { PaidPrizeEntry } from '../services/PaidPrizesService'

/**
 * Helper to parse "YYYY-MM" into year, month
 */
const parseYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [y, m] = yearMonth.split('-')
  return { year: parseInt(y, 10), month: parseInt(m, 10) }
}

/**
 * Hook for fetching monthly paid prizes data with caching
 */
export const useCachedMonthlyPaidPrizes = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<PaidPrizeEntry[]>([])
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
      const list = await CachedPaidPrizesService.list(year, month)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading paid prizes')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  // Mutations
  const create = useCallback(async (entry: Omit<PaidPrizeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    await CachedPaidPrizesService.create(entry)
    await load()
  }, [load])

  const update = useCallback(async (id: string, prev: PaidPrizeEntry, patch: Partial<PaidPrizeEntry>) => {
    await CachedPaidPrizesService.update(id, prev, patch)
    await load()
  }, [load])

  const remove = useCallback(async (id: string, entry: PaidPrizeEntry) => {
    await CachedPaidPrizesService.remove(id, entry)
    await load()
  }, [load])

  return { data, loading, error, lastUpdated, refresh, create, update, remove }
}

/**
 * Hook for fetching weekly paid prizes data with caching
 */
export const useCachedWeeklyPaidPrizes = (week: string) => {
  const [data, setData] = useState<PaidPrizeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const list = await CachedPaidPrizesService.listByWeek(week)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading weekly paid prizes')
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    if (week) {
      load()
    }
  }, [load, week])

  const refresh = useCallback(() => load(), [load])

  return { data, loading, error, lastUpdated, refresh }
}

/**
 * Hook for fetching weekly totals with caching
 */
export const useCachedWeeklyTotals = (week: string) => {
  const [totals, setTotals] = useState<{
    totalAmount: number
    totalTickets: number
    entries: PaidPrizeEntry[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await CachedPaidPrizesService.getWeeklyTotals(week)
      setTotals(data)
    } catch (e: any) {
      setError(e?.message || 'Error loading weekly totals')
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    if (week) {
      load()
    }
  }, [load, week])

  const refresh = useCallback(() => load(), [load])

  return { totals, loading, error, refresh }
}

/**
 * Hook for fetching monthly totals with caching
 */
export const useCachedMonthlyTotals = (yearMonth: string) => {
  const [{ year, month }] = useState(() => parseYearMonth(yearMonth))
  const [totals, setTotals] = useState<{
    totalAmount: number
    totalTickets: number
    entries: PaidPrizeEntry[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await CachedPaidPrizesService.getMonthlyTotals(year, month)
      setTotals(data)
    } catch (e: any) {
      setError(e?.message || 'Error loading monthly totals')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { totals, loading, error, refresh }
}

export default useCachedMonthlyPaidPrizes
