/**
 * LotteryGamesService.ts
 * Service for managing lottery game types (e.g., "Melate", "Chispazo", etc.)
 * Supervisors can create/edit/delete game names for use in scratch prize tracking
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { CacheManager } from './CacheService'

export interface LotteryGame {
  id?: string
  name: string // Game name (e.g., "Melate", "Chispazo")
  isActive: boolean // Can be toggled without deletion
  displayOrder: number // For sorting in dropdowns
  createdAt: Date
  updatedAt?: Date
}

class LotteryGamesServiceClass {
  private collectionPath = 'lotteryGames'

  /**
   * Get reference to lottery games collection
   */
  private getCollectionRef() {
    return collection(db, this.collectionPath)
  }

  /**
   * List all lottery games (including inactive for admin purposes)
   */
  async list(): Promise<LotteryGame[]> {
    try {
      const q = query(this.getCollectionRef(), orderBy('displayOrder', 'asc'))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          isActive: data.isActive ?? true,
          displayOrder: data.displayOrder ?? 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        }
      })
    } catch (error) {
      console.error('Error listing lottery games:', error)
      throw error
    }
  }

  /**
   * List only active lottery games (for dropdowns)
   */
  async listActive(): Promise<LotteryGame[]> {
    const games = await this.list()
    return games.filter(g => g.isActive)
  }

  /**
   * Get a single lottery game by ID
   */
  async getById(id: string): Promise<LotteryGame | null> {
    try {
      const docRef = doc(db, this.collectionPath, id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) return null
      
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate()
      }
    } catch (error) {
      console.error('Error getting lottery game:', error)
      throw error
    }
  }

  /**
   * Create a new lottery game
   */
  async create(game: Omit<LotteryGame, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(this.getCollectionRef(), {
        name: game.name.trim(),
        isActive: game.isActive ?? true,
        displayOrder: game.displayOrder ?? 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      // Invalidate cache
      CacheManager.invalidateLotteryGamesData()
      
      return docRef.id
    } catch (error) {
      console.error('Error creating lottery game:', error)
      throw error
    }
  }

  /**
   * Update an existing lottery game
   */
  async update(id: string, updates: Partial<Omit<LotteryGame, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id)
      
      const updateData: any = {
        updatedAt: Timestamp.now()
      }
      
      if (updates.name !== undefined) updateData.name = updates.name.trim()
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive
      if (updates.displayOrder !== undefined) updateData.displayOrder = updates.displayOrder
      
      await updateDoc(docRef, updateData)

      // Invalidate cache
      CacheManager.invalidateLotteryGamesData()
    } catch (error) {
      console.error('Error updating lottery game:', error)
      throw error
    }
  }

  /**
   * Delete a lottery game (only if not used in any scratch entries)
   */
  async remove(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionPath, id)
      await deleteDoc(docRef)

      // Invalidate cache
      CacheManager.invalidateLotteryGamesData()
    } catch (error) {
      console.error('Error deleting lottery game:', error)
      throw error
    }
  }

  /**
   * Reorder games by updating displayOrder for all
   */
  async reorder(gameIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db)
      
      gameIds.forEach((id, index) => {
        const docRef = doc(db, this.collectionPath, id)
        batch.update(docRef, {
          displayOrder: index,
          updatedAt: Timestamp.now()
        })
      })
      
      await batch.commit()

      // Invalidate cache
      CacheManager.invalidateLotteryGamesData()
    } catch (error) {
      console.error('Error reordering lottery games:', error)
      throw error
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<void> {
    try {
      const game = await this.getById(id)
      if (!game) throw new Error('Game not found')
      
      await this.update(id, { isActive: !game.isActive })
    } catch (error) {
      console.error('Error toggling game active status:', error)
      throw error
    }
  }
}

export const LotteryGamesService = new LotteryGamesServiceClass()
