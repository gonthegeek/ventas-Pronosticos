import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { CacheManager } from './CacheService'

export interface PaidPrizeEntry {
  id?: string
  date: string // YYYY-MM-DD
  week: string // YYYY-Www format (e.g., "2024-W01")
  machineId: '76' | '79'
  amountPaid: number
  ticketCount: number
  notes?: string
  operatorId: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}

/**
 * PaidPrizesService
 * Firestore hierarchical path: data/paidPrizes/{year}/{month}/entries/{id}
 * Tracks paid out prize tickets with weekly reconciliation
 * Mexico City timezone aware
 */
export class PaidPrizesService {
  /**
   * Get the collection path for paid prizes
   * Pattern: data/paidPrizes/{year}/{month}/entries
   */
  static getCollectionPath(year: number, month: number): string {
    const m = String(month).padStart(2, '0')
    return `data/paidPrizes/${year}/${m}/entries`
  }

  /**
   * List all paid prize entries for a specific month
   */
  static async list(year: number, month: number): Promise<PaidPrizeEntry[]> {
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
          amountPaid: data.amountPaid || 0,
          ticketCount: data.ticketCount || 0,
          notes: data.notes || '',
          operatorId: data.operatorId || '',
          timestamp: data.timestamp?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        } as PaidPrizeEntry
      })
    } catch (e) {
      console.error('Error listing paid prizes:', e)
      return []
    }
  }

  /**
   * List paid prize entries for a specific week
   */
  static async listByWeek(week: string): Promise<PaidPrizeEntry[]> {
    try {
      // Extract year and month from week string (e.g., "2024-W01")
      const year = parseInt(week.split('-')[0])
      const colPath = this.getCollectionPath(year, 1) // Start with January
      
      // Query across multiple months if needed
      const entries: PaidPrizeEntry[] = []
      for (let month = 1; month <= 12; month++) {
        const monthPath = this.getCollectionPath(year, month)
        const q = query(
          collection(db, monthPath),
          where('week', '==', week),
          orderBy('date', 'desc')
        )
        const snap = await getDocs(q)
        snap.docs.forEach((d) => {
          const data = d.data() as any
          entries.push({
            id: d.id,
            date: data.date || '',
            week: data.week || '',
            machineId: data.machineId || '76',
            amountPaid: data.amountPaid || 0,
            ticketCount: data.ticketCount || 0,
            notes: data.notes || '',
            operatorId: data.operatorId || '',
            timestamp: data.timestamp?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || undefined,
          } as PaidPrizeEntry)
        })
      }
      return entries
    } catch (e) {
      console.error('Error listing paid prizes by week:', e)
      return []
    }
  }

  /**
   * Get a single paid prize entry by ID
   */
  static async getById(id: string, year: number, month: number): Promise<PaidPrizeEntry | null> {
    try {
      const colPath = this.getCollectionPath(year, month)
      const docRef = doc(db, colPath, id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return null
      }

      const data = docSnap.data() as any
      return {
        id: docSnap.id,
        date: data.date || '',
        week: data.week || '',
        machineId: data.machineId || '76',
        amountPaid: data.amountPaid || 0,
        ticketCount: data.ticketCount || 0,
        notes: data.notes || '',
        operatorId: data.operatorId || '',
        timestamp: data.timestamp?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || undefined,
      } as PaidPrizeEntry
    } catch (e) {
      console.error('Error getting paid prize by ID:', e)
      return null
    }
  }

  /**
   * Create a new paid prize entry
   */
  static async create(entry: Omit<PaidPrizeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Extract year and month from date (YYYY-MM-DD)
    const [year, month] = entry.date.split('-').map(Number)
    const colPath = this.getCollectionPath(year, month)
    
    const payload = {
      date: entry.date,
      week: entry.week,
      machineId: entry.machineId,
      amountPaid: Number(entry.amountPaid),
      ticketCount: Number(entry.ticketCount),
      notes: entry.notes || '',
      operatorId: entry.operatorId,
      timestamp: entry.timestamp ? Timestamp.fromDate(entry.timestamp) : Timestamp.now(),
      createdAt: Timestamp.now(),
    }
    
    const ref = await addDoc(collection(db, colPath), payload as any)
    
    // Invalidate cache for that month and week
    CacheManager.invalidatePaidPrizesData(year, month)
    
    return ref.id
  }

  /**
   * Update an existing paid prize entry
   */
  static async update(
    id: string, 
    prev: PaidPrizeEntry, 
    patch: Partial<PaidPrizeEntry>
  ): Promise<void> {
    const [year, month] = prev.date.split('-').map(Number)
    const colPath = this.getCollectionPath(year, month)
    const docRef = doc(db, colPath, id)
    
    const current = await getDoc(docRef)
    if (!current.exists()) {
      throw new Error('Paid prize entry not found')
    }

    const data: any = { 
      ...patch,
      updatedAt: Timestamp.now() 
    }

    // Ensure numeric fields are numbers
    if (patch.amountPaid !== undefined) {
      data.amountPaid = Number(patch.amountPaid)
    }
    if (patch.ticketCount !== undefined) {
      data.ticketCount = Number(patch.ticketCount)
    }

    await updateDoc(docRef, data)
    
    // Invalidate cache
    CacheManager.invalidatePaidPrizesData(year, month)
  }

  /**
   * Delete a paid prize entry
   */
  static async remove(id: string, entry: PaidPrizeEntry): Promise<void> {
    const [year, month] = entry.date.split('-').map(Number)
    const colPath = this.getCollectionPath(year, month)
    
    await deleteDoc(doc(db, colPath, id))
    
    // Invalidate cache
    CacheManager.invalidatePaidPrizesData(year, month)
  }

  /**
   * Get weekly totals for paid prizes
   */
  static async getWeeklyTotals(week: string): Promise<{
    totalAmount: number
    totalTickets: number
    entries: PaidPrizeEntry[]
  }> {
    const entries = await this.listByWeek(week)
    
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amountPaid, 0)
    const totalTickets = entries.reduce((sum, entry) => sum + entry.ticketCount, 0)
    
    return {
      totalAmount,
      totalTickets,
      entries
    }
  }

  /**
   * Get monthly totals for paid prizes
   */
  static async getMonthlyTotals(year: number, month: number): Promise<{
    totalAmount: number
    totalTickets: number
    entries: PaidPrizeEntry[]
  }> {
    const entries = await this.list(year, month)
    
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amountPaid, 0)
    const totalTickets = entries.reduce((sum, entry) => sum + entry.ticketCount, 0)
    
    return {
      totalAmount,
      totalTickets,
      entries
    }
  }
}

export default PaidPrizesService
