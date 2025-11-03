import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { CacheManager } from './CacheService'
import { SalesService } from './SalesService'
import { TicketsService } from './TicketsService'

export interface TicketAverageEntry {
  id?: string
  date: string // YYYY-MM-DD
  week: string // YYYY-Www format (ISO week)
  machineId: '76' | '79'
  ticketsSold: number // From SRS #5
  totalSale: number // From SRS #1
  averagePerTicket: number // Calculated: totalSale / ticketsSold
  operatorId: string
  notes?: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}

export interface DailyAverageStats {
  date: string
  machineId: '76' | '79'
  ticketsSold: number
  totalSale: number
  averagePerTicket: number
}

export interface WeeklyAverageStats {
  week: string
  machineId: '76' | '79'
  ticketsSold: number
  totalSale: number
  averagePerTicket: number
}

export interface MonthlyAverageStats {
  totalTickets: number
  totalSales: number
  overallAverage: number
  machine76Average: number
  machine79Average: number
  bestDay: DailyAverageStats | null
  worstDay: DailyAverageStats | null
  dailyAverages: DailyAverageStats[]
  weeklyAverages: WeeklyAverageStats[]
}

/**
 * TicketAveragesService
 * Firestore hierarchical path: data/ticketAverages/{year}/{month}/entries/{id}
 * Mexico City timezone aware
 * 
 * SRS #6: Promedio por boleto
 * Calculates average spending per ticket by combining SRS #1 (sales) and SRS #5 (tickets) data
 */
export class TicketAveragesService {
  /**
   * Get the hierarchical collection path for ticket averages
   * Pattern: data/ticketAverages/{year}/{month}/entries
   */
  static getCollectionPath(year: number, month: number): string {
    const m = String(month).padStart(2, '0')
    return `data/ticketAverages/${year}/${m}/entries`
  }

  /**
   * Parse year and month from date string
   */
  static parseYearMonth(dateString: string): { year: number; month: number } {
    const [year, month] = dateString.split('-')
    return { year: parseInt(year, 10), month: parseInt(month, 10) }
  }

  /**
   * Calculate ISO week number from date string
   * @param dateString YYYY-MM-DD format
   * @returns ISO week string in YYYY-Www format
   */
  static getISOWeek(dateString: string): string {
    return TicketsService.getISOWeek(dateString)
  }

  /**
   * Calculate average per ticket for given sales and tickets
   */
  static calculateAverage(totalSale: number, ticketsSold: number): number {
    if (ticketsSold === 0) return 0
    return Math.round((totalSale / ticketsSold) * 100) / 100 // Round to 2 decimals
  }

  /**
   * List all ticket average entries for a specific month
   */
  static async list(year: number, month: number): Promise<TicketAverageEntry[]> {
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
          ticketsSold: data.ticketsSold || 0,
          totalSale: data.totalSale || 0,
          averagePerTicket: data.averagePerTicket || 0,
          operatorId: data.operatorId || '',
          notes: data.notes || '',
          timestamp: data.timestamp?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        } as TicketAverageEntry
      })
    } catch (e) {
      console.error('Error listing ticket averages:', e)
      return []
    }
  }

  /**
   * Create a new ticket average entry
   */
  static async create(entry: Omit<TicketAverageEntry, 'id' | 'createdAt' | 'updatedAt' | 'week' | 'averagePerTicket'>): Promise<string> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    // Auto-calculate ISO week
    const week = this.getISOWeek(entry.date)
    
    // Auto-calculate average
    const averagePerTicket = this.calculateAverage(entry.totalSale, entry.ticketsSold)
    
    const payload = {
      ...entry,
      week,
      averagePerTicket,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    }
    
    const ref = await addDoc(collection(db, colPath), payload as any)
    
    // Invalidate cache for this month
    CacheManager.invalidateTicketAveragesData(year, month)
    
    return ref.id
  }

  /**
   * Update an existing ticket average entry
   * If date changes to a different month, the entry is moved to the new month's collection
   */
  static async update(id: string, prev: TicketAverageEntry, patch: Partial<TicketAverageEntry>): Promise<void> {
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
      
      // Recalculate average if sales or tickets changed
      if (patch.totalSale !== undefined || patch.ticketsSold !== undefined) {
        const sale = patch.totalSale ?? mergedData.totalSale
        const tickets = patch.ticketsSold ?? mergedData.ticketsSold
        mergedData.averagePerTicket = this.calculateAverage(sale, tickets)
      }
      
      // Create payload without id, createdAt, updatedAt
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
      CacheManager.invalidateTicketAveragesData(oldYear, oldMonth)
      CacheManager.invalidateTicketAveragesData(newYM.year, newYM.month)
    } else {
      // Same month - just update in place
      const colPath = this.getCollectionPath(oldYear, oldMonth)
      const docRef = doc(db, colPath, id)
      
      // Prepare update data
      const data: any = { 
        ...patch, 
        updatedAt: Timestamp.now() 
      }
      
      // If date changed (but same month), recalculate week
      if (patch.date) {
        data.week = this.getISOWeek(patch.date)
      }
      
      // Recalculate average if sales or tickets changed
      if (patch.totalSale !== undefined || patch.ticketsSold !== undefined) {
        const sale = patch.totalSale ?? prev.totalSale
        const tickets = patch.ticketsSold ?? prev.ticketsSold
        data.averagePerTicket = this.calculateAverage(sale, tickets)
      }
      
      await updateDoc(docRef, data)
      
      // Invalidate cache
      CacheManager.invalidateTicketAveragesData(oldYear, oldMonth)
    }
  }

  /**
   * Delete a ticket average entry
   */
  static async remove(id: string, entry: TicketAverageEntry): Promise<void> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    await deleteDoc(doc(db, colPath, id))
    
    // Invalidate cache
    CacheManager.invalidateTicketAveragesData(year, month)
  }

  /**
   * Calculate daily averages from SRS #1 (sales) and SRS #5 (tickets) data
   * This is the core calculation that combines both data sources
   */
  static async calculateDailyAverages(year: number, month: number): Promise<DailyAverageStats[]> {
    try {
      // Get tickets data for the month
      const tickets = await TicketsService.list(year, month)
      
      // Group tickets by date and machine
      const ticketsByDateMachine = new Map<string, { machine76: number; machine79: number }>()
      tickets.forEach(ticket => {
        const key = ticket.date
        const current = ticketsByDateMachine.get(key) || { machine76: 0, machine79: 0 }
        if (ticket.machineId === '76') {
          current.machine76 += ticket.ticketsDay
        } else {
          current.machine79 += ticket.ticketsDay
        }
        ticketsByDateMachine.set(key, current)
      })
      
      // Get sales data for the month by iterating through days
      const dailyAverages: DailyAverageStats[] = []
      
      for (const [dateStr, ticketsData] of ticketsByDateMachine.entries()) {
        // Get hourly sales for this day and sum by machine
        const hourlyData = await SalesService.getSalesForDate(dateStr)
        
        const salesByMachine = { machine76: 0, machine79: 0 }
        hourlyData.forEach((sale: any) => {
          if (sale.machineId === '76') {
            salesByMachine.machine76 += sale.amount || 0
          } else if (sale.machineId === '79') {
            salesByMachine.machine79 += sale.amount || 0
          }
        })
        
        // Calculate averages for each machine if they have tickets
        if (ticketsData.machine76 > 0) {
          dailyAverages.push({
            date: dateStr,
            machineId: '76',
            ticketsSold: ticketsData.machine76,
            totalSale: salesByMachine.machine76,
            averagePerTicket: this.calculateAverage(salesByMachine.machine76, ticketsData.machine76)
          })
        }
        
        if (ticketsData.machine79 > 0) {
          dailyAverages.push({
            date: dateStr,
            machineId: '79',
            ticketsSold: ticketsData.machine79,
            totalSale: salesByMachine.machine79,
            averagePerTicket: this.calculateAverage(salesByMachine.machine79, ticketsData.machine79)
          })
        }
      }
      
      return dailyAverages.sort((a, b) => a.date.localeCompare(b.date))
    } catch (e) {
      console.error('Error calculating daily averages:', e)
      return []
    }
  }

  /**
   * Calculate weekly averages from daily averages
   */
  static calculateWeeklyAverages(dailyAverages: DailyAverageStats[]): WeeklyAverageStats[] {
    const weeklyMap = new Map<string, { 
      ticketsSold: number
      totalSale: number
      machineId: '76' | '79'
    }>()
    
    dailyAverages.forEach(day => {
      const week = this.getISOWeek(day.date)
      const key = `${week}-${day.machineId}`
      const current = weeklyMap.get(key) || { ticketsSold: 0, totalSale: 0, machineId: day.machineId }
      
      current.ticketsSold += day.ticketsSold
      current.totalSale += day.totalSale
      
      weeklyMap.set(key, current)
    })
    
    return Array.from(weeklyMap.entries()).map(([key, data]) => {
      const week = key.split('-').slice(0, 2).join('-') // Extract YYYY-Www
      return {
        week,
        machineId: data.machineId,
        ticketsSold: data.ticketsSold,
        totalSale: data.totalSale,
        averagePerTicket: this.calculateAverage(data.totalSale, data.ticketsSold)
      }
    }).sort((a, b) => a.week.localeCompare(b.week))
  }

  /**
   * Get comprehensive monthly statistics
   */
  static async getMonthlyStats(year: number, month: number): Promise<MonthlyAverageStats> {
    try {
      const dailyAverages = await this.calculateDailyAverages(year, month)
      const weeklyAverages = this.calculateWeeklyAverages(dailyAverages)
      
      // Calculate totals
      const totalTickets = dailyAverages.reduce((sum, d) => sum + d.ticketsSold, 0)
      const totalSales = dailyAverages.reduce((sum, d) => sum + d.totalSale, 0)
      const overallAverage = this.calculateAverage(totalSales, totalTickets)
      
      // Calculate machine-specific averages
      const machine76Data = dailyAverages.filter(d => d.machineId === '76')
      const machine76Tickets = machine76Data.reduce((sum, d) => sum + d.ticketsSold, 0)
      const machine76Sales = machine76Data.reduce((sum, d) => sum + d.totalSale, 0)
      const machine76Average = this.calculateAverage(machine76Sales, machine76Tickets)
      
      const machine79Data = dailyAverages.filter(d => d.machineId === '79')
      const machine79Tickets = machine79Data.reduce((sum, d) => sum + d.ticketsSold, 0)
      const machine79Sales = machine79Data.reduce((sum, d) => sum + d.totalSale, 0)
      const machine79Average = this.calculateAverage(machine79Sales, machine79Tickets)
      
      // Find best and worst days (by average per ticket)
      let bestDay: DailyAverageStats | null = null
      let worstDay: DailyAverageStats | null = null
      
      dailyAverages.forEach(day => {
        if (!bestDay || day.averagePerTicket > bestDay.averagePerTicket) {
          bestDay = day
        }
        if (!worstDay || day.averagePerTicket < worstDay.averagePerTicket) {
          worstDay = day
        }
      })
      
      return {
        totalTickets,
        totalSales,
        overallAverage,
        machine76Average,
        machine79Average,
        bestDay,
        worstDay,
        dailyAverages,
        weeklyAverages
      }
    } catch (e) {
      console.error('Error getting monthly stats:', e)
      return {
        totalTickets: 0,
        totalSales: 0,
        overallAverage: 0,
        machine76Average: 0,
        machine79Average: 0,
        bestDay: null,
        worstDay: null,
        dailyAverages: [],
        weeklyAverages: []
      }
    }
  }
}

export default TicketAveragesService
