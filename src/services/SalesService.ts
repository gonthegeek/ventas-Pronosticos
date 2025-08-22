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
  onSnapshot,
  Timestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import { SaleEntry, HourlySalesData } from '../state/slices/salesSlice'
import { getMexicoDateRange } from '../utils/timezone'

/**
 * SalesService - Production Ready
 * Handles sales data operations using hierarchical structure: data/sales/{year}/{month}/{day}
 * Optimized for performance and scalability
 */
export class SalesService {
  // Hierarchical collection structure: data/sales/{year}/{month}/{day}
  private static getCollectionPath(date: string): string {
    // Parse date as Mexico timezone to avoid UTC conversion issues
    // Append Mexico timezone to ensure correct interpretation
    const mexicoDateString = date.includes('T') ? date : `${date}T12:00:00-06:00`
    const dateObj = new Date(mexicoDateString)
    
    // Get the date parts in Mexico timezone
    const mexicoTimeString = dateObj.toLocaleString('en-CA', { 
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    const [year, month, day] = mexicoTimeString.split('-')
    const path = `data/sales/${year}/${month}/${day}`
    
    return path
  }

  private static readonly HOURLY_COLLECTION = 'hourlySales'

  /**
   * Add new sale entry to the hierarchical collection structure
   */
  static async addSale(saleData: Omit<SaleEntry, 'id'>): Promise<string> {
    try {
      // Get the date in Mexico timezone for correct collection path
      const saleDate = saleData.timestamp.toLocaleDateString('en-CA', { 
        timeZone: 'America/Mexico_City' 
      })
      const collectionPath = this.getCollectionPath(saleDate)
      
      const year = saleData.timestamp.getFullYear()
      const month = String(saleData.timestamp.getMonth() + 1).padStart(2, '0')
      
      const docRef = await addDoc(collection(db, collectionPath), {
        machineId: saleData.machineId,
        amount: saleData.amount,
        totalSales: (saleData as any).totalSales || saleData.amount,
        timestamp: Timestamp.fromDate(saleData.timestamp),
        hour: saleData.hour || saleData.timestamp.getHours(),
        date: saleDate,
        yearMonth: `${year}-${month}`,
        operatorId: saleData.operatorId,
        notes: saleData.notes || '',
        createdAt: Timestamp.now(),
      })
      
      return docRef.id
    } catch (error) {
      console.error('Error adding sale:', error)
      throw error
    }
  }

  /**
   * Get sales for specific date from the hierarchical collections
   */
  static async getSalesForDate(date: string): Promise<SaleEntry[]> {
    try {
      const collectionPath = this.getCollectionPath(date)

      // Get all documents in the day collection
      const querySnapshot = await getDocs(collection(db, collectionPath))
      
      const results = querySnapshot.docs.map(doc => {
        const data = doc.data()
        
        // Extract numeric hour from stored hour field
        let numericHour = data.hour;
        if (typeof data.hour === 'string' && data.hour.includes(':')) {
          // If hour is stored as "HH:MM", extract just the hour part
          numericHour = parseInt(data.hour.split(':')[0]);
        } else if (typeof data.hour === 'number') {
          numericHour = data.hour;
        } else {
          // Fallback to extracting from timestamp
          numericHour = data.timestamp.toDate().getHours();
        }
        
        const result = {
          id: doc.id,
          machineId: data.machineId,
          amount: data.amount,
          totalSales: data.totalSales || data.amount,
          timestamp: data.timestamp.toDate(),
          hour: numericHour, // Always ensure this is a number
          operatorId: data.operatorId,
          notes: data.notes || '',
        }
        return result
      }) as SaleEntry[]
      
      return results
    } catch (error) {
      console.error('Error getting sales for date:', error)
      return []
    }
  }

  /**
   * Get hourly sales data for dashboard using hierarchical collections
   */
  static async getHourlySalesForDate(date: string): Promise<HourlySalesData[]> {
    try {
      const collectionPath = this.getCollectionPath(date)
      
      // Use timezone utility for proper Mexico City date handling
      const { start: startDate, end: endDate } = getMexicoDateRange(date)

      // Get all documents from the day collection (no complex queries needed)
      const querySnapshot = await getDocs(collection(db, collectionPath))
      
      // Use a Map to track hours that have data
      const hoursWithData = new Map<number, HourlySalesData>()

      // Process actual sales data and aggregate by hour
      querySnapshot.docs.forEach(doc => {
        const data = doc.data()
        const saleTimestamp = data.timestamp.toDate()
        
        // Use the stored hour field (already converted to numeric in getSalesForDate)
        // Extract numeric hour from stored hour field
        let saleHour = data.hour;
        if (typeof data.hour === 'string' && data.hour.includes(':')) {
          // If hour is stored as "HH:MM", extract just the hour part
          saleHour = parseInt(data.hour.split(':')[0]);
        } else if (typeof data.hour === 'number') {
          saleHour = data.hour;
        } else {
          // Fallback to extracting from timestamp
          const mexicoTime = new Date(saleTimestamp.toLocaleString("en-US", {timeZone: "America/Mexico_City"}))
          saleHour = mexicoTime.getHours()
        }
        
        const machineId = data.machineId
        const amount = data.amount || 0
        
        if (saleHour >= 0 && saleHour < 24) {
          // Initialize hour data if not exists
          if (!hoursWithData.has(saleHour)) {
            hoursWithData.set(saleHour, {
              hour: saleHour,
              machine76: 0,
              machine79: 0,
              total: 0,
              lastUpdated: saleTimestamp.toISOString(),
            })
          }
          
          const hourData = hoursWithData.get(saleHour)!
          
          if (machineId === '76') {
            hourData.machine76 += amount
          } else if (machineId === '79') {
            hourData.machine79 += amount
          }
          hourData.total = hourData.machine76 + hourData.machine79
          hourData.lastUpdated = saleTimestamp.toISOString()
        }
      })

      // Convert Map to array and sort by hour
      const hourlySales = Array.from(hoursWithData.values()).sort((a, b) => a.hour - b.hour)

      return hourlySales
    } catch (error) {
      console.error('Error getting hourly sales:', error)
      console.error('Collection path attempted:', this.getCollectionPath(date))
      
      // Return empty data on error - only show hours with data
      return []
    }
  }

  /**
   * Subscribe to real-time hourly sales updates
   */
  static subscribeToHourlySales(
    date: string, 
    callback: (data: HourlySalesData[]) => void
  ): () => void {
    const q = query(
      collection(db, this.HOURLY_COLLECTION),
      where('date', '==', date),
      orderBy('hour', 'asc')
    )

    return onSnapshot(q, (querySnapshot) => {
      const hourlySales: HourlySalesData[] = []

      // Initialize all 24 hours
      for (let hour = 0; hour < 24; hour++) {
        hourlySales.push({
          hour,
          machine76: 0,
          machine79: 0,
          total: 0,
          lastUpdated: new Date().toISOString(),
        })
      }

      // Fill in actual data
      querySnapshot.docs.forEach(doc => {
        const data = doc.data()
        const hourIndex = data.hour
        if (hourIndex >= 0 && hourIndex < 24) {
          hourlySales[hourIndex] = {
            hour: data.hour,
            machine76: data.machine76 || 0,
            machine79: data.machine79 || 0,
            total: (data.machine76 || 0) + (data.machine79 || 0),
            lastUpdated: data.lastUpdated?.toDate().toISOString() || new Date().toISOString(),
          }
        }
      })

      callback(hourlySales)
    })
  }

  /**
   * Update hourly aggregation data
   * Private method to maintain hourly totals
   */
  private static async updateHourlyAggregation(saleData: Omit<SaleEntry, 'id'>): Promise<void> {
    try {
      const date = saleData.timestamp.toISOString().split('T')[0]
      const hour = saleData.hour
      const docId = `${date}-${hour.toString().padStart(2, '0')}`

      const hourlyDocRef = doc(db, this.HOURLY_COLLECTION, docId)
      
      // Get current data
      const currentDoc = await getDoc(hourlyDocRef)
      let currentData = { machine76: 0, machine79: 0, date, hour }
      
      if (currentDoc.exists()) {
        currentData = currentDoc.data() as any
      }

      // Update based on machine
      if (saleData.machineId === '76') {
        currentData.machine76 += saleData.amount
      } else if (saleData.machineId === '79') {
        currentData.machine79 += saleData.amount
      }

      await updateDoc(hourlyDocRef, {
        ...currentData,
        lastUpdated: Timestamp.now(),
      })
    } catch (error) {
      console.error('Error updating hourly aggregation:', error)
      // Don't throw here to avoid failing the main sale addition
    }
  }

  /**
   * Delete sale entry from hierarchical collection
   */
  static async deleteSale(saleId: string, saleData: SaleEntry): Promise<void> {
    try {
      const dateStr = saleData.timestamp.toISOString().split('T')[0]
      const collectionPath = this.getCollectionPath(dateStr)
      await deleteDoc(doc(db, collectionPath, saleId))
    } catch (error) {
      console.error('Error deleting sale:', error)
      throw error
    }
  }

  /**
   * Update sale entry in hierarchical collection
   */
  static async updateSale(saleId: string, oldData: SaleEntry, newData: Partial<SaleEntry>): Promise<void> {
    try {
      const dateStr = oldData.timestamp.toISOString().split('T')[0]
      const collectionPath = this.getCollectionPath(dateStr)
      
      const updateData: any = {
        updatedAt: Timestamp.now(),
      }
      
      if (newData.amount !== undefined) updateData.amount = newData.amount
      if (newData.totalSales !== undefined) updateData.totalSales = newData.totalSales
      if (newData.machineId !== undefined) updateData.machineId = newData.machineId
      if (newData.notes !== undefined) updateData.notes = newData.notes
      
      await updateDoc(doc(db, collectionPath, saleId), updateData)
    } catch (error) {
      console.error('Error updating sale:', error)
      throw error
    }
  }

  /**
   * Get daily total sales for a specific date
   */
  static async getDailySalesTotal(date: string): Promise<number> {
    try {
      const hourlySales = await this.getHourlySalesForDate(date)
      return hourlySales.reduce((total, hourData) => total + hourData.total, 0)
    } catch (error) {
      console.error('Error getting daily sales total:', error)
      return 0
    }
  }

  /**
   * Get monthly total sales for current month
   */
  static async getMonthlyTotal(year?: number, month?: number): Promise<number> {
    try {
      const now = new Date()
      const targetYear = year ?? now.getFullYear()
      const targetMonth = month ?? (now.getMonth() + 1) // getMonth() returns 0-11, we need 1-12

      // Get all days in the month and sum their sales
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
      let monthlyTotal = 0

      // Process in smaller batches to avoid overwhelming Firebase
      const batchSize = 7 // Process week by week
      for (let startDay = 1; startDay <= daysInMonth; startDay += batchSize) {
        const endDay = Math.min(startDay + batchSize - 1, daysInMonth)
        const dayPromises = []

        for (let day = startDay; day <= endDay; day++) {
          const dateString = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          dayPromises.push(this.getDailySalesTotal(dateString))
        }

        const batchTotals = await Promise.all(dayPromises)
        monthlyTotal += batchTotals.reduce((sum, total) => sum + total, 0)
      }

      return monthlyTotal
    } catch (error) {
      console.error('Error getting monthly sales total:', error)
      return 0
    }
  }

  /**
   * Get today's sales total (Mexico City timezone)
   */
  static async getTodaysSalesTotal(): Promise<number> {
    try {
      const mexicoNow = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'America/Mexico_City' 
      })
      return await this.getDailySalesTotal(mexicoNow)
    } catch (error) {
      console.error('Error getting today\'s sales total:', error)
      return 0
    }
  }

  /**
   * Get this week's sales total (Mexico City timezone)
   * Week starts on Monday
   */
  static async getThisWeekTotal(): Promise<number> {
    try {
      const mexicoNow = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}))
      
      // Get the start of the week (Monday)
      const dayOfWeek = mexicoNow.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday = 0, so we need 6 days back
      const weekStart = new Date(mexicoNow)
      weekStart.setDate(mexicoNow.getDate() - daysFromMonday)
      
      // Get all days from Monday to today
      let weeklyTotal = 0
      const currentDate = new Date(weekStart)
      
      while (currentDate <= mexicoNow) {
        const dateString = currentDate.toLocaleDateString('en-CA')
        const dailyTotal = await this.getDailySalesTotal(dateString)
        weeklyTotal += dailyTotal
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      return weeklyTotal
    } catch (error) {
      console.error('Error getting this week\'s sales total:', error)
      return 0
    }
  }

  /**
   * Get this month's sales total (Mexico City timezone)
   */
  static async getThisMonthTotal(): Promise<number> {
    try {
      const mexicoNow = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}))
      return await this.getMonthlyTotal(mexicoNow.getFullYear(), mexicoNow.getMonth() + 1)
    } catch (error) {
      console.error('Error getting this month\'s sales total:', error)
      return 0
    }
  }
}
