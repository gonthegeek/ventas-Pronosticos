import { useState, useEffect, useCallback } from 'react'
import CachedRollChangesService from '../services/RollChangesService.cached'
import { RollChangeEntry } from '../services/RollChangesService'

/**
 * Helper to parse "YYYY-MM" into year, month
 */
const parseYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [y, m] = yearMonth.split('-')
  return { year: parseInt(y, 10), month: parseInt(m, 10) }
}

/**
 * Hook to fetch and manage monthly roll change entries with caching
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedMonthlyRollChanges = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<RollChangeEntry[]>([])
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
      const list = await CachedRollChangesService.list(year, month)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading roll changes')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  // Mutations
  const create = useCallback(async (entry: Omit<RollChangeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    await CachedRollChangesService.create(entry)
    await load()
  }, [load])

  const update = useCallback(async (id: string, prev: RollChangeEntry, patch: Partial<RollChangeEntry>) => {
    await CachedRollChangesService.update(id, prev, patch)
    await load()
  }, [load])

  const remove = useCallback(async (id: string, entry: RollChangeEntry) => {
    await CachedRollChangesService.remove(id, entry)
    await load()
  }, [load])

  return { data, loading, error, lastUpdated, refresh, create, update, remove }
}

/**
 * Hook to fetch monthly roll change statistics with caching
 * @param yearMonth Format: "YYYY-MM"
 */
export const useCachedMonthlyRollChangeStats = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [stats, setStats] = useState<{
    totalChanges: number
    machine76: number
    machine79: number
    averageFrequency76: number
    averageFrequency79: number
    changesByDate: Map<string, number>
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
      const data = await CachedRollChangesService.getMonthlyStats(year, month)
      setStats(data)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading roll change statistics')
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
 * Hook to get time between changes for a specific machine
 * @param yearMonth Format: "YYYY-MM"
 * @param machineId '76' or '79'
 */
export const useCachedMachineIntervals = (yearMonth: string, machineId: '76' | '79') => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [intervals, setIntervals] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setYM(parseYearMonth(yearMonth))
  }, [yearMonth])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await CachedRollChangesService.getTimeBetweenChanges(year, month, machineId)
      setIntervals(data)
    } catch (e: any) {
      setError(e?.message || 'Error calculating machine intervals')
    } finally {
      setLoading(false)
    }
  }, [year, month, machineId])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { intervals, loading, error, refresh }
}

/**
 * Hook to fetch roll changes across a date range
 * @param startYearMonth Format: "YYYY-MM"
 * @param endYearMonth Format: "YYYY-MM"
 */
export const useCachedRollChangesRange = (startYearMonth: string, endYearMonth: string) => {
  const [data, setData] = useState<RollChangeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { year: startYear, month: startMonth } = parseYearMonth(startYearMonth)
      const { year: endYear, month: endMonth } = parseYearMonth(endYearMonth)
      const list = await CachedRollChangesService.listRange(startYear, startMonth, endYear, endMonth)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading roll changes range')
    } finally {
      setLoading(false)
    }
  }, [startYearMonth, endYearMonth])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { data, loading, error, lastUpdated, refresh }
}

export default useCachedMonthlyRollChanges
