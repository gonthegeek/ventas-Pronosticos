import { useState, useEffect, useCallback } from 'react'
import CachedScratchesService from '../services/ScratchesService.cached'
import { ScratchEntry } from '../services/ScratchesService'

/**
 * Helper to parse "YYYY-MM" into year, month
 */
const parseYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [y, m] = yearMonth.split('-')
  return { year: parseInt(y, 10), month: parseInt(m, 10) }
}

/**
 * Hook to fetch and manage monthly scratch entries with caching
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedMonthlyScratches = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<ScratchEntry[]>([])
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
      const list = await CachedScratchesService.list(year, month)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading scratches')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  // Mutations
  const create = useCallback(async (entry: Omit<ScratchEntry, 'id' | 'createdAt' | 'updatedAt' | 'week'>) => {
    await CachedScratchesService.create(entry)
    await load()
  }, [load])

  const update = useCallback(async (id: string, prev: ScratchEntry, patch: Partial<ScratchEntry>) => {
    await CachedScratchesService.update(id, prev, patch)
    await load()
  }, [load])

  const remove = useCallback(async (id: string, entry: ScratchEntry) => {
    await CachedScratchesService.remove(id, entry)
    await load()
  }, [load])

  return { data, loading, error, lastUpdated, refresh, create, update, remove }
}

/**
 * Hook to fetch and manage weekly scratch entries with caching
 * @param week Format: "YYYY-Www" (ISO week)
 */
export const useCachedWeeklyScratches = (week: string) => {
  const [data, setData] = useState<ScratchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const list = await CachedScratchesService.listByWeek(week)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading weekly scratches')
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
 * Hook to fetch monthly scratch statistics with caching
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedMonthlyScratchStats = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [stats, setStats] = useState<{
    totalPrizes: number
    totalAmount: number
    averagePrize: number
    lotteryBreakdown: Map<string, { count: number; amount: number }>
    weeklyBreakdown: Map<string, { count: number; amount: number }>
    topPrizes: ScratchEntry[]
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
      const data = await CachedScratchesService.getMonthlyStats(year, month)
      setStats(data)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading scratch statistics')
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
 * Hook to fetch scratch entries by lottery type
 * @param yearMonth Format: "YYYY-MM"
 * @param lottery Lottery name/type
 */
export const useCachedScratchesByLottery = (yearMonth: string, lottery: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<ScratchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setYM(parseYearMonth(yearMonth))
  }, [yearMonth])

  const load = useCallback(async () => {
    if (!lottery) {
      setData([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const list = await CachedScratchesService.listByLottery(year, month, lottery)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading scratches by lottery')
    } finally {
      setLoading(false)
    }
  }, [year, month, lottery])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { data, loading, error, lastUpdated, refresh }
}

/**
 * Hook to fetch all unique lottery types for a month
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedLotteryTypes = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [lotteryTypes, setLotteryTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setYM(parseYearMonth(yearMonth))
  }, [yearMonth])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const types = await CachedScratchesService.getLotteryTypes(year, month)
      setLotteryTypes(types)
    } catch (e: any) {
      setError(e?.message || 'Error loading lottery types')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { lotteryTypes, loading, error, refresh }
}

/**
 * Hook to fetch year-to-date scratch statistics
 * @param year Year to fetch
 * @param currentMonth Current month (1-12)
 */
export const useCachedYearToDateScratchStats = (year: number, currentMonth: number) => {
  const [stats, setStats] = useState<{
    totalPrizes: number
    totalAmount: number
    monthlyTotals: Map<number, { count: number; amount: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await CachedScratchesService.getYearToDateStats(year, currentMonth)
      setStats(data)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading year-to-date statistics')
    } finally {
      setLoading(false)
    }
  }, [year, currentMonth])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { stats, loading, error, lastUpdated, refresh }
}

export default useCachedMonthlyScratches
