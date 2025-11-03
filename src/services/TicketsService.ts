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

export interface TicketEntry {
  id?: string
  date: string // YYYY-MM-DD
  week: string // YYYY-Www format (ISO week)
  machineId: '76' | '79'
  ticketsDay: number // Tickets sold that day
  ticketsTotal: number // Calculated weekly total
  operatorId: string
  notes?: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}

/**
 * TicketsService
 * Firestore hierarchical path: data/tickets/{year}/{month}/entries/{id}
 * Mexico City timezone aware
 * 
 * SRS #5: Boletos vendidos
 * Tracks tickets sold by machine with daily/weekly aggregation
 */
export class TicketsService {
  /**
   * Get the hierarchical collection path for tickets
   * Pattern: data/tickets/{year}/{month}/entries
   */
  static getCollectionPath(year: number, month: number): string {
    const m = String(month).padStart(2, '0')
    return `data/tickets/${year}/${m}/entries`
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
   * List all ticket entries for a specific month
   */
  static async list(year: number, month: number): Promise<TicketEntry[]> {
    try {
      const colPath = this.getCollectionPath(year, month)
      const snap = await getDocs(collection(db, colPath))
      
      return snap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          date: data.date || '',
          week: data.week || '',
          machineId: data.machineId || '76',
          ticketsDay: data.ticketsDay || 0,
          ticketsTotal: data.ticketsTotal || 0,
          operatorId: data.operatorId || '',
          notes: data.notes || '',
          timestamp: data.timestamp?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        } as TicketEntry
      })
    } catch (e) {
      console.error('Error listing tickets:', e)
      return []
    }
  }

  /**
   * Get tickets for a specific week across multiple months
   */
  static async listByWeek(week: string): Promise<TicketEntry[]> {
    try {
      // Extract year from week string (YYYY-Www)
      const year = parseInt(week.split('-')[0], 10)
      
      // Week might span two months, so we need to check multiple paths
      // For simplicity, check the current month and next month
      const allEntries: TicketEntry[] = []
      
      for (let month = 1; month <= 12; month++) {
        const entries = await this.list(year, month)
        const weekEntries = entries.filter(e => e.week === week)
        allEntries.push(...weekEntries)
      }
      
      return allEntries
    } catch (e) {
      console.error('Error listing tickets by week:', e)
      return []
    }
  }

  /**
   * Calculate weekly total for a specific week and machine
   */
  static async calculateWeeklyTotal(week: string, machineId: '76' | '79'): Promise<number> {
    const entries = await this.listByWeek(week)
    return entries
      .filter(e => e.machineId === machineId)
      .reduce((sum, e) => sum + e.ticketsDay, 0)
  }

  /**
   * Create a new ticket entry
   */
  static async create(entry: Omit<TicketEntry, 'id' | 'createdAt' | 'updatedAt' | 'week' | 'ticketsTotal'>): Promise<string> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    // Auto-calculate ISO week
    const week = this.getISOWeek(entry.date)
    
    // Calculate weekly total for this machine/week
    const weeklyTotal = await this.calculateWeeklyTotal(week, entry.machineId)
    const ticketsTotal = weeklyTotal + entry.ticketsDay
    
    const payload = {
      ...entry,
      week,
      ticketsTotal,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    }
    
    const ref = await addDoc(collection(db, colPath), payload as any)
    
    // Invalidate cache for this month
    CacheManager.invalidateTicketsData(year, month)
    
    return ref.id
  }

  /**
   * Update an existing ticket entry
   * If date changes to a different month, the entry is moved to the new month's collection
   */
  static async update(id: string, prev: TicketEntry, patch: Partial<TicketEntry>): Promise<void> {
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
      
      // Calculate weekly total for new location
      const weeklyTotal = await this.calculateWeeklyTotal(
        mergedData.week, 
        mergedData.machineId
      )
      mergedData.ticketsTotal = weeklyTotal + mergedData.ticketsDay
      
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
      CacheManager.invalidateTicketsData(oldYear, oldMonth)
      CacheManager.invalidateTicketsData(newYM.year, newYM.month)
    } else {
      // Same month - just update in place
      const colPath = this.getCollectionPath(oldYear, oldMonth)
      const docRef = doc(db, colPath, id)
      
      const current = await getDoc(docRef)
      if (!current.exists()) {
        throw new Error('Ticket entry not found')
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
      
      // Recalculate weekly total if ticketsDay changed
      if (patch.ticketsDay !== undefined) {
        const week = patch.date ? this.getISOWeek(patch.date) : prev.week
        const machineId = patch.machineId || prev.machineId
        
        // Get all entries for this week except current one
        const weekEntries = await this.listByWeek(week)
        const otherEntries = weekEntries.filter(e => e.id !== id && e.machineId === machineId)
        const otherTotal = otherEntries.reduce((sum, e) => sum + e.ticketsDay, 0)
        
        data.ticketsTotal = otherTotal + patch.ticketsDay
      }
      
      await updateDoc(docRef, data)
      
      // Invalidate cache
      CacheManager.invalidateTicketsData(oldYear, oldMonth)
    }
  }

  /**
   * Delete a ticket entry
   */
  static async remove(id: string, entry: TicketEntry): Promise<void> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    await deleteDoc(doc(db, colPath, id))
    
    // Invalidate cache
    CacheManager.invalidateTicketsData(year, month)
  }

  /**
   * Get aggregated statistics for a month
   */
  static async getMonthlyStats(year: number, month: number): Promise<{
    totalTickets: number
    machine76: number
    machine79: number
    dailyAverage: number
    weeklyBreakdown: Map<string, number>
  }> {
    const entries = await this.list(year, month)
    
    const machine76 = entries
      .filter(e => e.machineId === '76')
      .reduce((sum, e) => sum + e.ticketsDay, 0)
    
    const machine79 = entries
      .filter(e => e.machineId === '79')
      .reduce((sum, e) => sum + e.ticketsDay, 0)
    
    const totalTickets = machine76 + machine79
    
    // Calculate daily average (only count days with data)
    const uniqueDays = new Set(entries.map(e => e.date))
    const dailyAverage = uniqueDays.size > 0 ? totalTickets / uniqueDays.size : 0
    
    // Weekly breakdown
    const weeklyBreakdown = new Map<string, number>()
    entries.forEach(entry => {
      const current = weeklyBreakdown.get(entry.week) || 0
      weeklyBreakdown.set(entry.week, current + entry.ticketsDay)
    })
    
    return {
      totalTickets,
      machine76,
      machine79,
      dailyAverage,
      weeklyBreakdown
    }
  }
}

export default TicketsService
