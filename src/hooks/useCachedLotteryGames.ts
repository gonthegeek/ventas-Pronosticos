/**
 * useCachedLotteryGames.ts
 * React hooks for lottery games management with caching
 */

import { useState, useEffect } from 'react'
import { LotteryGame } from '../services/LotteryGamesService'
import { LotteryGamesServiceCached } from '../services/LotteryGamesService.cached'

interface UseLotteryGamesResult {
  games: LotteryGame[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (game: Omit<LotteryGame, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  update: (id: string, updates: Partial<Omit<LotteryGame, 'id' | 'createdAt'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  reorder: (gameIds: string[]) => Promise<void>
  toggleActive: (id: string) => Promise<void>
}

/**
 * Hook for all lottery games (including inactive)
 */
export function useCachedLotteryGames(): UseLotteryGamesResult {
  const [games, setGames] = useState<LotteryGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await LotteryGamesServiceCached.list()
      setGames(data)
    } catch (err) {
      console.error('Error loading lottery games:', err)
      setError(err instanceof Error ? err.message : 'Error loading lottery games')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const create = async (game: Omit<LotteryGame, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await LotteryGamesServiceCached.create(game)
      await loadData() // Refresh after create
    } catch (err) {
      console.error('Error creating lottery game:', err)
      throw err
    }
  }

  const update = async (id: string, updates: Partial<Omit<LotteryGame, 'id' | 'createdAt'>>) => {
    try {
      await LotteryGamesServiceCached.update(id, updates)
      await loadData() // Refresh after update
    } catch (err) {
      console.error('Error updating lottery game:', err)
      throw err
    }
  }

  const remove = async (id: string) => {
    try {
      await LotteryGamesServiceCached.remove(id)
      await loadData() // Refresh after delete
    } catch (err) {
      console.error('Error deleting lottery game:', err)
      throw err
    }
  }

  const reorder = async (gameIds: string[]) => {
    try {
      await LotteryGamesServiceCached.reorder(gameIds)
      await loadData() // Refresh after reorder
    } catch (err) {
      console.error('Error reordering lottery games:', err)
      throw err
    }
  }

  const toggleActive = async (id: string) => {
    try {
      await LotteryGamesServiceCached.toggleActive(id)
      await loadData() // Refresh after toggle
    } catch (err) {
      console.error('Error toggling lottery game:', err)
      throw err
    }
  }

  return {
    games,
    loading,
    error,
    refresh: loadData,
    create,
    update,
    remove,
    reorder,
    toggleActive
  }
}

/**
 * Hook for only active lottery games (for dropdowns in forms)
 */
export function useCachedActiveLotteryGames() {
  const [games, setGames] = useState<LotteryGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await LotteryGamesServiceCached.listActive()
      setGames(data)
    } catch (err) {
      console.error('Error loading active lottery games:', err)
      setError(err instanceof Error ? err.message : 'Error loading active lottery games')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return {
    games,
    loading,
    error,
    refresh: loadData
  }
}
