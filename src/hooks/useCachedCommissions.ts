import { useState, useEffect, useCallback } from 'react'
import CachedCommissionsService from '../services/CommissionsService.cached'
import { CommissionEntry } from '../services/CommissionsService'

// Helper to parse "YYYY-MM" into year,month
const parseYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [y, m] = yearMonth.split('-')
  return { year: parseInt(y, 10), month: parseInt(m, 10) }
}

export const useCachedMonthlyCommissions = (yearMonth: string) => {
  const [{ year, month }, setYM] = useState(() => parseYearMonth(yearMonth))
  const [data, setData] = useState<CommissionEntry[]>([])
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
      const list = await CachedCommissionsService.list(year, month)
      setData(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Error loading commissions')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  // Mutations
  const create = useCallback(async (entry: Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    await CachedCommissionsService.create(entry)
    await load()
  }, [load])

  const update = useCallback(async (id: string, prev: CommissionEntry, patch: Partial<CommissionEntry>) => {
    await CachedCommissionsService.update(id, prev, patch)
    await load()
  }, [load])

  const remove = useCallback(async (id: string, entry: CommissionEntry) => {
    await CachedCommissionsService.remove(id, entry)
    await load()
  }, [load])

  return { data, loading, error, lastUpdated, refresh, create, update, remove }
}

export default useCachedMonthlyCommissions
