import { 
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDocs,
  doc
} from 'firebase/firestore'
import { db } from './firebase'
import { financesCache, CACHE_KEYS, CACHE_CONFIG, CacheManager } from './CacheService'
import { CommissionsService, CommissionEntry } from './CommissionsService'

/**
 * Cached wrapper for CommissionsService
 * TTL: 4 hours (historical/monthly data)
 */
export class CachedCommissionsService {
  static async list(year: number, month: number): Promise<CommissionEntry[]> {
    const key = CACHE_KEYS.commissionsMonthlyList(year, month)
    const cached = financesCache.get<CommissionEntry[]>(key)
    if (cached) return cached

    const data = await CommissionsService.list(year, month)
    // Current month might change more often; use a shorter TTL (2h) else 6h
    const now = new Date()
    const isCurrent = now.getFullYear() === year && (now.getMonth() + 1) === month
    const ttl = isCurrent ? Math.max(120, CACHE_CONFIG.COMMISSIONS_MONTHLY.ttl / 2) : Math.max(360, CACHE_CONFIG.COMMISSIONS_MONTHLY.ttl)
    financesCache.set(key, data, ttl)
    return data
  }

  static async create(entry: Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await CommissionsService.create(entry)
    CacheManager.invalidateCommissionsData(entry.year, entry.month)
    return id
  }

  static async update(id: string, prev: CommissionEntry, patch: Partial<CommissionEntry>): Promise<void> {
    await CommissionsService.update(id, prev, patch)
    CacheManager.invalidateCommissionsData(prev.year, prev.month)
  }

  static async remove(id: string, entry: CommissionEntry): Promise<void> {
    await CommissionsService.remove(id, entry)
    CacheManager.invalidateCommissionsData(entry.year, entry.month)
  }

  static cleanupCache(): void {
    financesCache.cleanup()
  }
}

export default CachedCommissionsService
