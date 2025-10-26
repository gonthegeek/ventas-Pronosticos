import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { CacheManager } from './CacheService'

export interface CommissionEntry {
  id?: string
  year: number
  month: number // 1-12
  machineId: '76' | '79'
  systemTotal: number
  paperTotal: number
  difference: number
  notes?: string
  createdAt: Date
  updatedAt?: Date
}

/**
 * CommissionsService
 * Firestore hierarchical path: data/commissions/{year}/{month}/{id}
 * Mexico City timezone aware (pass year/month already derived from helpers/UI)
 */
export class CommissionsService {
  static getCollectionPath(year: number, month: number): string {
    const m = String(month).padStart(2, '0')
    // Must point to a collection (odd number of segments)
    // Pattern: data (col) / commissions (doc) / {year} (col) / {month} (doc) / entries (col)
    return `data/commissions/${year}/${m}/entries`
  }

  static async list(year: number, month: number): Promise<CommissionEntry[]> {
    try {
      const colPath = this.getCollectionPath(year, month)
      const snap = await getDocs(collection(db, colPath))
      return snap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          year: data.year,
          month: data.month,
          machineId: data.machineId,
          systemTotal: data.systemTotal || 0,
          paperTotal: data.paperTotal || 0,
          difference: (data.systemTotal || 0) - (data.paperTotal || 0),
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        } as CommissionEntry
      })
    } catch (e) {
      return []
    }
  }

  static async create(entry: Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { year, month } = entry
    const colPath = this.getCollectionPath(year, month)
    const payload = {
      ...entry,
      difference: Number(entry.systemTotal) - Number(entry.paperTotal),
      createdAt: Timestamp.now(),
    }
    const ref = await addDoc(collection(db, colPath), payload as any)
    // Invalidate cache for that month
    CacheManager.invalidateCommissionsData(year, month)
    return ref.id
  }

  static async update(id: string, prev: CommissionEntry, patch: Partial<CommissionEntry>): Promise<void> {
    const year = prev.year
    const month = prev.month
    const colPath = this.getCollectionPath(year, month)
    const docRef = doc(db, colPath, id)
    const current = await getDoc(docRef)
    if (!current.exists()) {
      // If not in expected path, do nothing (or search across months if needed later)
    }
    const data: any = { ...patch, updatedAt: Timestamp.now() }
    if (patch.systemTotal !== undefined || patch.paperTotal !== undefined) {
      const newSystem = patch.systemTotal ?? prev.systemTotal
      const newPaper = patch.paperTotal ?? prev.paperTotal
      data.difference = Number(newSystem) - Number(newPaper)
    }
    await updateDoc(docRef, data)
    CacheManager.invalidateCommissionsData(year, month)
  }

  static async remove(id: string, entry: CommissionEntry): Promise<void> {
    const colPath = this.getCollectionPath(entry.year, entry.month)
    await deleteDoc(doc(db, colPath, id))
    CacheManager.invalidateCommissionsData(entry.year, entry.month)
  }
}

export default CommissionsService
