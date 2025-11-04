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
  orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import { CacheManager } from './CacheService'

export interface RollChangeEntry {
  id?: string
  date: string // YYYY-MM-DD
  machineId: '76' | '79'
  operatorId: string
  notes?: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}

/**
 * RollChangesService
 * Firestore hierarchical path: data/rollChanges/{year}/{month}/{id}
 * Mexico City timezone aware
 * 
 * SRS #3: Cambio de rollo
 * Tracks paper roll changes for each machine
 */
export class RollChangesService {
  /**
   * Get the hierarchical collection path for roll changes
   * Pattern: data/rollChanges/{year}/{month}/entries
   */
  static getCollectionPath(year: number, month: number): string {
    const m = String(month).padStart(2, '0')
    return `data/rollChanges/${year}/${m}/entries`
  }

  /**
   * Parse year and month from date string
   */
  static parseYearMonth(dateString: string): { year: number; month: number } {
    const [year, month] = dateString.split('-')
    return { year: parseInt(year, 10), month: parseInt(month, 10) }
  }

  /**
   * List all roll change entries for a specific month
   */
  static async list(year: number, month: number): Promise<RollChangeEntry[]> {
    try {
      const colPath = this.getCollectionPath(year, month)
      const q = query(collection(db, colPath), orderBy('timestamp', 'desc'))
      const snap = await getDocs(q)
      
      return snap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          date: data.date || '',
          machineId: data.machineId || '76',
          operatorId: data.operatorId || '',
          notes: data.notes || '',
          timestamp: data.timestamp?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        } as RollChangeEntry
      })
    } catch (e) {
      console.error('Error listing roll changes:', e)
      return []
    }
  }

  /**
   * Get a single roll change entry
   */
  static async get(id: string, year: number, month: number): Promise<RollChangeEntry | null> {
    try {
      const colPath = this.getCollectionPath(year, month)
      const docRef = doc(db, colPath, id)
      const snap = await getDoc(docRef)
      
      if (!snap.exists()) {
        return null
      }
      
      const data = snap.data() as any
      return {
        id: snap.id,
        date: data.date || '',
        machineId: data.machineId || '76',
        operatorId: data.operatorId || '',
        notes: data.notes || '',
        timestamp: data.timestamp?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || undefined,
      } as RollChangeEntry
    } catch (e) {
      console.error('Error getting roll change:', e)
      return null
    }
  }

  /**
   * Create a new roll change entry
   */
  static async create(entry: Omit<RollChangeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    const payload = {
      ...entry,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    }
    
    const ref = await addDoc(collection(db, colPath), payload as any)
    
    // Invalidate cache for this month
    CacheManager.invalidateRollChangesData(year, month)
    
    return ref.id
  }

  /**
   * Update an existing roll change entry
   * If date changes to a different month, the entry is moved to the new month's collection
   */
  static async update(id: string, prev: RollChangeEntry, patch: Partial<RollChangeEntry>): Promise<void> {
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
      CacheManager.invalidateRollChangesData(oldYear, oldMonth)
      CacheManager.invalidateRollChangesData(newYM.year, newYM.month)
    } else {
      // Same month - just update in place
      const colPath = this.getCollectionPath(oldYear, oldMonth)
      const docRef = doc(db, colPath, id)
      
      const current = await getDoc(docRef)
      if (!current.exists()) {
        throw new Error('Roll change entry not found')
      }
      
      const data: any = { 
        ...patch, 
        updatedAt: Timestamp.now() 
      }
      
      await updateDoc(docRef, data)
      
      // Invalidate cache
      CacheManager.invalidateRollChangesData(oldYear, oldMonth)
    }
  }

  /**
   * Delete a roll change entry
   */
  static async remove(id: string, entry: RollChangeEntry): Promise<void> {
    const { year, month } = this.parseYearMonth(entry.date)
    const colPath = this.getCollectionPath(year, month)
    
    await deleteDoc(doc(db, colPath, id))
    
    // Invalidate cache
    CacheManager.invalidateRollChangesData(year, month)
  }

  /**
   * Get aggregated statistics for a month
   */
  static async getMonthlyStats(year: number, month: number): Promise<{
    totalChanges: number
    machine76: number
    machine79: number
    averageFrequency76: number
    averageFrequency79: number
    changesByDate: Map<string, number>
  }> {
    const entries = await this.list(year, month)
    
    const machine76Entries = entries.filter(e => e.machineId === '76')
    const machine79Entries = entries.filter(e => e.machineId === '79')
    const machine76 = machine76Entries.length
    const machine79 = machine79Entries.length
    const totalChanges = entries.length
    
    // Calculate average frequency for machine 76 (days between changes)
    let averageFrequency76 = 0
    if (machine76Entries.length > 1) {
      const sortedEntries = [...machine76Entries].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      let totalDays = 0
      for (let i = 1; i < sortedEntries.length; i++) {
        const prevDate = new Date(sortedEntries[i - 1].date)
        const currDate = new Date(sortedEntries[i].date)
        const daysDiff = Math.abs((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        totalDays += daysDiff
      }
      averageFrequency76 = totalDays / (sortedEntries.length - 1)
    }
    
    // Calculate average frequency for machine 79 (days between changes)
    let averageFrequency79 = 0
    if (machine79Entries.length > 1) {
      const sortedEntries = [...machine79Entries].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      let totalDays = 0
      for (let i = 1; i < sortedEntries.length; i++) {
        const prevDate = new Date(sortedEntries[i - 1].date)
        const currDate = new Date(sortedEntries[i].date)
        const daysDiff = Math.abs((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        totalDays += daysDiff
      }
      averageFrequency79 = totalDays / (sortedEntries.length - 1)
    }
    
    // Changes by date
    const changesByDate = new Map<string, number>()
    entries.forEach(entry => {
      const current = changesByDate.get(entry.date) || 0
      changesByDate.set(entry.date, current + 1)
    })
    
    return {
      totalChanges,
      machine76,
      machine79,
      averageFrequency76,
      averageFrequency79,
      changesByDate
    }
  }

  /**
   * Get time between changes for a specific machine
   */
  static async getTimeBetweenChanges(
    year: number, 
    month: number, 
    machineId: '76' | '79'
  ): Promise<number[]> {
    const entries = await this.list(year, month)
    const machineEntries = entries
      .filter(e => e.machineId === machineId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    if (machineEntries.length < 2) {
      return []
    }
    
    const intervals: number[] = []
    for (let i = 1; i < machineEntries.length; i++) {
      const prevDate = new Date(machineEntries[i - 1].date)
      const currDate = new Date(machineEntries[i].date)
      const daysDiff = Math.abs((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      intervals.push(daysDiff)
    }
    
    return intervals
  }

  /**
   * List roll changes across multiple months
   */
  static async listRange(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<RollChangeEntry[]> {
    const allEntries: RollChangeEntry[] = []
    
    let year = startYear
    let month = startMonth
    
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const entries = await this.list(year, month)
      allEntries.push(...entries)
      
      month++
      if (month > 12) {
        month = 1
        year++
      }
    }
    
    return allEntries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }
}

export default RollChangesService
