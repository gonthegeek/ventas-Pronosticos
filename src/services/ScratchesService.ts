import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  Timestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import { CacheManager } from './CacheService'

export interface ScratchEntry {
  id?: string
  date: string // YYYY-MM-DD
  week: string // YYYY-Www format (ISO week)
  lottery: string // Lottery name/type
  sorteoNumber: string // Sorteo/draw number
  winningTicket: string // Winning ticket number
  prizeAmount: number // Prize amount won
  operatorId: string
  notes?: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}

/**
 * ScratchesService
 * Firestore hierarchical path: data/scratches/{year}/{month}/entries/{id}
 * Mexico City timezone aware
 * 
 * SRS #7: Raspados premiados
 * Tracks scratch-off lottery prizes by lottery type
 */
export class ScratchesService {
  /**
   * Get the hierarchical collection path for scratches
   * Pattern: data/scratches/{year}/{month}/entries
   */
  static getCollectionPath(year: number, month: number): string {
    const m = String(month).padStart(2, '0')
    return `data/scratches/${year}/${m}/entries`
  }

  /**
   * Calculate ISO week number from date string
   * @param dateString YYYY-MM-DD format
   * @returns ISO week string in YYYY-Www format
   */
  static getISOWeek(dateString: string): string {
    const date = new Date(dateString + 'T12:00:00.000-06:00') // Mexico timezone noon
    
    // ISO week calculation
    const thursday = new Date(date)
    thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)))
    
    const yearStart = new Date(thursday.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    
    return `${thursday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
  }

  /**
   * Parse year and month from date string
   */
  static parseYearMonth(dateString: string): { year: number; month: number } {
    const [year, month] = dateString.split('-')
    return { year: parseInt(year, 10), month: parseInt(month, 10) }
  }

  /**
   * List all scratch entries for a specific month
   */
  static async list(year: number, month: number): Promise<ScratchEntry[]> {
    try {
      const colPath = this.getCollectionPath(year, month)
      const snap = await getDocs(collection(db, colPath))
      
      return snap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          date: data.date || '',
          week: data.week || '',
          lottery: data.lottery || '',
          sorteoNumber: data.sorteoNumber || '',
          winningTicket: data.winningTicket || '',
          prizeAmount: data.prizeAmount || 0,
          operatorId: data.operatorId || '',
          notes: data.notes || '',
          timestamp: data.timestamp?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        } as ScratchEntry
      })
    } catch (e) {
      console.error('Error listing scratches:', e)
      return []
    }
  }

  /**
   * Get scratch entries for a specific week across multiple months
   */
  static async listByWeek(week: string): Promise<ScratchEntry[]> {
    try {
      // Extract year from week string (YYYY-Www)
      const year = parseInt(week.split('-')[0], 10)
      
      // Week might span two months, so check multiple months
      const allEntries: ScratchEntry[] = []
      
      for (let month = 1; month <= 12; month++) {
        const entries = await this.list(year, month)
        const weekEntries = entries.filter(e => e.week === week)
        allEntries.push(...weekEntries)
      }
      
      return allEntries
    } catch (e) {
      console.error('Error listing scratches by week:', e)
      return []
    }
  }

  /**
   * Get scratch entries by lottery type for a month
   */
  static async listByLottery(year: number, month: number, lottery: string): Promise<ScratchEntry[]> {
    const entries = await this.list(year, month)
    return entries.filter(e => e.lottery === lottery)
  }

  /**
   * Create a new scratch entry
   */
  static async create(entry: Omit<ScratchEntry, 'id' | 'createdAt' | 'updatedAt' | 'week'>): Promise<string> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    // Auto-calculate ISO week
    const week = this.getISOWeek(entry.date)
    
    const payload = {
      ...entry,
      week,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    }
    
    const ref = await addDoc(collection(db, colPath), payload as any)
    
    // Invalidate cache for this month
    CacheManager.invalidateScratchesData(year, month)
    
    return ref.id
  }

  /**
   * Update an existing scratch entry
   * If date changes to a different month, the entry is moved to the new month's collection
   */
  static async update(id: string, prev: ScratchEntry, patch: Partial<ScratchEntry>): Promise<void> {
    const { year: oldYear, month: oldMonth } = this.parseYearMonth(prev.date)
    
    // Check if date changed to a different month
    const dateChanged = patch.date && patch.date !== prev.date
    const newYM = dateChanged ? this.parseYearMonth(patch.date!) : { year: oldYear, month: oldMonth }
    const monthChanged = dateChanged && (newYM.year !== oldYear || newYM.month !== oldMonth)
    
    if (monthChanged) {
      // Date changed to a different month - need to delete old entry and create new one
      const mergedData = {
        ...prev,
        ...patch,
        week: this.getISOWeek(patch.date!),
      }
      
      // Create payload without id, createdAt, updatedAt (will be set by Firestore)
      const { id: _, createdAt: __, updatedAt: ___, ...payload } = mergedData
      
      // Create in new location
      const newColPath = this.getCollectionPath(newYM.year, newYM.month)
      await addDoc(collection(db, newColPath), {
        ...payload,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      // Delete from old location
      const oldColPath = this.getCollectionPath(oldYear, oldMonth)
      await deleteDoc(doc(db, oldColPath, id))
      
      // Invalidate both caches
      CacheManager.invalidateScratchesData(oldYear, oldMonth)
      CacheManager.invalidateScratchesData(newYM.year, newYM.month)
    } else {
      // Same month - just update in place
      const colPath = this.getCollectionPath(oldYear, oldMonth)
      const docRef = doc(db, colPath, id)
      
      const current = await getDoc(docRef)
      if (!current.exists()) {
        throw new Error('Scratch entry not found')
      }
      
      // Prepare update data
      const data: any = { 
        ...patch, 
        updatedAt: Timestamp.now() 
      }
      
      // If date changed (but same month), recalculate week
      if (patch.date) {
        data.week = this.getISOWeek(patch.date)
      }
      
      await updateDoc(docRef, data)
      
      // Invalidate cache
      CacheManager.invalidateScratchesData(oldYear, oldMonth)
    }
  }

  /**
   * Delete a scratch entry
   */
  static async remove(id: string, entry: ScratchEntry): Promise<void> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    await deleteDoc(doc(db, colPath, id))
    
    // Invalidate cache
    CacheManager.invalidateScratchesData(year, month)
  }

  /**
   * Get aggregated statistics for a month
   */
  static async getMonthlyStats(year: number, month: number): Promise<{
    totalPrizes: number
    totalAmount: number
    averagePrize: number
    lotteryBreakdown: Map<string, { count: number; amount: number }>
    weeklyBreakdown: Map<string, { count: number; amount: number }>
    topPrizes: ScratchEntry[]
  }> {
    const entries = await this.list(year, month)
    
    const totalPrizes = entries.length
    const totalAmount = entries.reduce((sum, e) => sum + e.prizeAmount, 0)
    const averagePrize = totalPrizes > 0 ? totalAmount / totalPrizes : 0
    
    // Lottery breakdown
    const lotteryBreakdown = new Map<string, { count: number; amount: number }>()
    entries.forEach(entry => {
      const current = lotteryBreakdown.get(entry.lottery) || { count: 0, amount: 0 }
      lotteryBreakdown.set(entry.lottery, {
        count: current.count + 1,
        amount: current.amount + entry.prizeAmount
      })
    })
    
    // Weekly breakdown
    const weeklyBreakdown = new Map<string, { count: number; amount: number }>()
    entries.forEach(entry => {
      const current = weeklyBreakdown.get(entry.week) || { count: 0, amount: 0 }
      weeklyBreakdown.set(entry.week, {
        count: current.count + 1,
        amount: current.amount + entry.prizeAmount
      })
    })
    
    // Top 5 prizes
    const topPrizes = [...entries]
      .sort((a, b) => b.prizeAmount - a.prizeAmount)
      .slice(0, 5)
    
    return {
      totalPrizes,
      totalAmount,
      averagePrize,
      lotteryBreakdown,
      weeklyBreakdown,
      topPrizes
    }
  }

  /**
   * Get all unique lottery types from a month
   */
  static async getLotteryTypes(year: number, month: number): Promise<string[]> {
    const entries = await this.list(year, month)
    const uniqueLotteries = new Set(entries.map(e => e.lottery))
    return Array.from(uniqueLotteries).sort()
  }

  /**
   * Get year-to-date statistics
   */
  static async getYearToDateStats(year: number, currentMonth: number): Promise<{
    totalPrizes: number
    totalAmount: number
    monthlyTotals: Map<number, { count: number; amount: number }>
  }> {
    const monthlyTotals = new Map<number, { count: number; amount: number }>()
    let totalPrizes = 0
    let totalAmount = 0
    
    for (let month = 1; month <= currentMonth; month++) {
      const stats = await this.getMonthlyStats(year, month)
      monthlyTotals.set(month, {
        count: stats.totalPrizes,
        amount: stats.totalAmount
      })
      totalPrizes += stats.totalPrizes
      totalAmount += stats.totalAmount
    }
    
    return {
      totalPrizes,
      totalAmount,
      monthlyTotals
    }
  }
}

export default ScratchesService
