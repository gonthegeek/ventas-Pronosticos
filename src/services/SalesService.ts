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
   * Automatically calculates the hourly amount based on total sales
   * Includes business rule validation
   */
  static async addSale(saleData: Omit<SaleEntry, 'id'>): Promise<string> {
    try {
      // Get the date in Mexico timezone for correct collection path
      const saleDate = saleData.timestamp.toLocaleDateString('en-CA', { 
        timeZone: 'America/Mexico_City' 
      })
      
      // Validate business rules before adding
      const validation = await this.validateSaleEntry({
        machineId: saleData.machineId as '76' | '79',
        date: saleDate,
        hour: saleData.hour || saleData.timestamp.getHours(),
        totalSales: saleData.totalSales || saleData.amount
      })
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }
      
      const collectionPath = this.getCollectionPath(saleDate)
      
      const year = saleData.timestamp.getFullYear()
      const month = String(saleData.timestamp.getMonth() + 1).padStart(2, '0')
      
      // Calculate the actual hourly amount if totalSales is provided
      let calculatedAmount = saleData.amount
      
      const docRef = await addDoc(collection(db, collectionPath), {
        machineId: saleData.machineId,
        amount: calculatedAmount,
        totalSales: saleData.totalSales || calculatedAmount,
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
      // Don't throw here to avoid failing the main sale addition
    }
  }

  /**
   * Delete sale entry from hierarchical collection
   */
  static async deleteSale(saleId: string, saleData: SaleEntry): Promise<void> {
    try {
      // Use the correct Mexico timezone date for the sale
      const saleDateStr = this.getSaleDateString(saleData.timestamp)
      
      let collectionPath = this.getCollectionPath(saleDateStr)
      
      let docRef = doc(db, collectionPath, saleId)
      
      // Check if document exists at the expected path
      const docSnapshot = await getDoc(docRef)
      
      if (!docSnapshot.exists()) {
        
        // Try alternative dates in case of timezone edge cases
        const alternativeDates = [
          // Try UTC date
          saleData.timestamp.toISOString().split('T')[0],
          // Try current date
          new Date().toISOString().split('T')[0],
          // Try Mexico timezone current date
          new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
        ]
        
        let found = false
        for (const altDate of alternativeDates) {
          if (altDate === saleDateStr) continue // Skip if same as already tried
          
          const altCollectionPath = this.getCollectionPath(altDate)
          
          const altDocRef = doc(db, altCollectionPath, saleId)
          const altSnapshot = await getDoc(altDocRef)
          
          if (altSnapshot.exists()) {
            collectionPath = altCollectionPath
            docRef = altDocRef
            found = true
            break
          }
        }
        
        if (!found) {
          // Last resort: search in nearby dates
          const baseDate = new Date(saleDateStr)
          
          for (let dayOffset = -3; dayOffset <= 3 && !found; dayOffset++) {
            const searchDate = new Date(baseDate)
            searchDate.setDate(searchDate.getDate() + dayOffset)
            const searchDateStr = searchDate.toISOString().split('T')[0]
            
            const searchCollectionPath = this.getCollectionPath(searchDateStr)
            
            const searchDocRef = doc(db, searchCollectionPath, saleId)
            const searchSnapshot = await getDoc(searchDocRef)
            
            if (searchSnapshot.exists()) {
              docRef = searchDocRef
              found = true
              break
            }
          }
        }
        
        if (!found) {
          throw new Error(`Document with ID ${saleId} not found. It may have been deleted or moved.`)
        }
      } else {
      }
      
      await deleteDoc(docRef)
    } catch (error) {
      throw error
    }
  }

  /**
   * Get the correct date string for a sale (in Mexico timezone)
   */
  private static getSaleDateString(timestamp: Date): string {
    // Convert timestamp to Mexico timezone and get the date part
    const mexicoTimeString = timestamp.toLocaleDateString('en-CA', { 
      timeZone: 'America/Mexico_City'
    })
    return mexicoTimeString
  }

  /**
   * Calculate the actual hourly amount based on total sales
   * amount = currentTotalSales - previousHourTotalSales
   */
  static async calculateHourlyAmount(
    hour: number, 
    machineId: '76' | '79', 
    newTotalSales: number, 
    date: string
  ): Promise<number> {
    try {
      if (hour === 0) {
        // First hour of the day, amount equals total sales
        return newTotalSales
      }

      // Get all sales for the date and machine
      const allSales = await this.getSalesForDate(date)
      const machineSales = allSales.filter(sale => sale.machineId === machineId)
      
      // Find the highest totalSales from previous hours
      let previousHourTotalSales = 0
      
      for (let prevHour = hour - 1; prevHour >= 0; prevHour--) {
        const prevHourSales = machineSales.filter(sale => sale.hour === prevHour)
        if (prevHourSales.length > 0) {
          // Get the highest total sales from that hour (most recent)
          const maxTotalSales = Math.max(...prevHourSales.map(sale => sale.totalSales || sale.amount))
          if (maxTotalSales > previousHourTotalSales) {
            previousHourTotalSales = maxTotalSales
          }
        }
      }
      
      // Calculate the actual hourly amount
      const hourlyAmount = newTotalSales - previousHourTotalSales
      
      
      return Math.max(0, hourlyAmount) // Ensure non-negative
    } catch (error) {
      // Fallback: return the total sales as amount
      return newTotalSales
    }
  }

  /**
   * Add amount to hourly total (creates a new sale entry)
   * This is useful when user wants to add more sales to an existing hour
   */
  static async addToHourlyTotal(
    hour: number, 
    machineId: '76' | '79', 
    amount: number, 
    operatorId: string,
    notes?: string,
    date?: string
  ): Promise<string> {
    try {
      const now = new Date()
      const targetDate = date || now.toLocaleDateString('en-CA', { 
        timeZone: 'America/Mexico_City' 
      })
      
      const saleData: Omit<SaleEntry, 'id'> = {
        machineId,
        amount,
        totalSales: amount,
        timestamp: now,
        hour,
        operatorId,
        notes: notes ? `Adición a hora ${hour}: ${notes}` : `Adición a hora ${hour}`
      }
      
      return await this.addSale(saleData)
    } catch (error) {
      throw error
    }
  }

  /**
   * Update sale entry in hierarchical collection
   * Automatically calculates the hourly amount based on total sales
   */
  static async updateSale(saleId: string, oldData: SaleEntry, newData: Partial<SaleEntry>): Promise<void> {
    try {
      // Use the correct Mexico timezone date for the sale
      const saleDateStr = this.getSaleDateString(oldData.timestamp)
      
      let collectionPath = this.getCollectionPath(saleDateStr)
      
      let docRef = doc(db, collectionPath, saleId)
      
      // Check if document exists at the expected path
      const docSnapshot = await getDoc(docRef)
      
      if (!docSnapshot.exists()) {
        
        // Try alternative dates in case of timezone edge cases
        const alternativeDates = [
          // Try UTC date
          oldData.timestamp.toISOString().split('T')[0],
          // Try current date
          new Date().toISOString().split('T')[0],
          // Try Mexico timezone current date
          new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
        ]
        
        let found = false
        for (const altDate of alternativeDates) {
          if (altDate === saleDateStr) continue // Skip if same as already tried
          
          const altCollectionPath = this.getCollectionPath(altDate)
          
          const altDocRef = doc(db, altCollectionPath, saleId)
          const altSnapshot = await getDoc(altDocRef)
          
          if (altSnapshot.exists()) {
            collectionPath = altCollectionPath
            docRef = altDocRef
            found = true
            break
          }
        }
        
        if (!found) {
          // Last resort: search in nearby dates
          const baseDate = new Date(saleDateStr)
          
          for (let dayOffset = -3; dayOffset <= 3 && !found; dayOffset++) {
            const searchDate = new Date(baseDate)
            searchDate.setDate(searchDate.getDate() + dayOffset)
            const searchDateStr = searchDate.toISOString().split('T')[0]
            
            const searchCollectionPath = this.getCollectionPath(searchDateStr)
            
            const searchDocRef = doc(db, searchCollectionPath, saleId)
            const searchSnapshot = await getDoc(searchDocRef)
            
            if (searchSnapshot.exists()) {
              collectionPath = searchCollectionPath
              docRef = searchDocRef
              found = true
            }
          }
        }
        
        if (!found) {
          throw new Error(`Document with ID ${saleId} not found. It may have been deleted or moved.`)
        }
      } else {
      }
      
      const updateData: any = {
        updatedAt: Timestamp.now(),
      }
      
      // If totalSales is being updated, calculate the new amount
      if (newData.totalSales !== undefined) {
        const calculatedAmount = await this.calculateHourlyAmount(
          newData.hour || oldData.hour,
          (newData.machineId || oldData.machineId) as '76' | '79',
          newData.totalSales,
          saleDateStr
        )
        
        updateData.amount = calculatedAmount
        updateData.totalSales = newData.totalSales
        
      } else if (newData.amount !== undefined) {
        updateData.amount = newData.amount
      }
      
      if (newData.machineId !== undefined) updateData.machineId = newData.machineId
      if (newData.hour !== undefined) updateData.hour = newData.hour
      if (newData.notes !== undefined) updateData.notes = newData.notes // Always update notes, even if empty
      
      await updateDoc(docRef, updateData)
    } catch (error) {
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
      return 0
    }
  }

  /**
   * Debug helper: Check if a document exists at a specific path
   */
  static async debugDocumentPath(saleId: string, date: string): Promise<{ exists: boolean, path: string }> {
    try {
      const collectionPath = this.getCollectionPath(date)
      const docRef = doc(db, collectionPath, saleId)
      const docSnapshot = await getDoc(docRef)
      
      
      if (docSnapshot.exists()) {
      }
      
      return {
        exists: docSnapshot.exists(),
        path: collectionPath
      }
    } catch (error) {
      return { exists: false, path: '' }
    }
  }

  /**
   * Debug helper: Check all possible paths for a document
   */
  static async debugFindDocument(saleId: string): Promise<string | null> {
    
    // Check last 7 days
    for (let daysBack = 0; daysBack <= 7; daysBack++) {
      const date = new Date()
      date.setDate(date.getDate() - daysBack)
      const dateStr = date.toISOString().split('T')[0]
      
      const collectionPath = this.getCollectionPath(dateStr)
      const docRef = doc(db, collectionPath, saleId)
      
      try {
        const docSnapshot = await getDoc(docRef)
        if (docSnapshot.exists()) {
          return collectionPath
        }
      } catch (error) {
      }
    }
    
    return null
  }

  /**
   * Business Logic Validation Methods
   */

  /**
   * Get the last recorded sale for a specific machine on a given date
   * Used for progressive total validation
   */
  static async getLastSaleForMachine(
    machineId: '76' | '79', 
    date: string, 
    beforeHour?: number
  ): Promise<SaleEntry | null> {
    try {
      const sales = await this.getSalesForDate(date)
      
      // Filter by machine and optionally by hour
      const machineSales = sales.filter(sale => {
        if (sale.machineId !== machineId) return false
        if (beforeHour !== undefined && sale.hour >= beforeHour) return false
        return true
      })
      
      // Sort by hour descending and get the most recent
      const sortedSales = machineSales.sort((a, b) => b.hour - a.hour)
      return sortedSales.length > 0 ? sortedSales[0] : null
    } catch (error) {
      return null
    }
  }

  /**
   * Validate that the new sale follows progressive total rules
   * Total sales must be equal or greater than the previous hour
   */
  static async validateProgressiveSales(
    machineId: '76' | '79',
    date: string,
    hour: number,
    totalSales: number
  ): Promise<{ isValid: boolean; error?: string; previousTotal?: number }> {
    try {
      // Get the last sale for this machine before the current hour
      const lastSale = await this.getLastSaleForMachine(machineId, date, hour)
      
      if (!lastSale) {
        // First sale of the day - any positive value is acceptable
        if (totalSales < 0) {
          return {
            isValid: false,
            error: 'El total de ventas no puede ser negativo'
          }
        }
        return { isValid: true }
      }
      
      const previousTotal = lastSale.totalSales || 0
      
      if (totalSales < previousTotal) {
        return {
          isValid: false,
          error: `El total debe ser igual o mayor a $${previousTotal.toLocaleString()} (hora ${lastSale.hour})`,
          previousTotal
        }
      }
      
      return { isValid: true, previousTotal }
    } catch (error) {
      return {
        isValid: false,
        error: 'Error al validar ventas progresivas'
      }
    }
  }

  /**
   * Validate that the date and hour are not in the future
   * Uses Mexico timezone for validation
   */
  static validateDateTime(date: string, hour: number): { isValid: boolean; error?: string } {
    try {
      // Get current date and time in Mexico timezone
      const nowInMexico = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Mexico_City' 
      })
      const currentDateTime = new Date(nowInMexico)
      const currentDate = currentDateTime.toISOString().split('T')[0]
      const currentHour = currentDateTime.getHours()
      
      // Compare dates
      if (date > currentDate) {
        return {
          isValid: false,
          error: 'No se pueden agregar ventas en fechas futuras'
        }
      }
      
      // If same date, check hour
      if (date === currentDate && hour > currentHour) {
        return {
          isValid: false,
          error: `No se pueden agregar ventas para horas futuras (hora actual: ${currentHour})`
        }
      }
      
      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: 'Error al validar fecha y hora'
      }
    }
  }

  /**
   * Validate if this is the first sale of the day for a machine
   * Used to allow starting at 0
   */
  static async isFirstSaleOfDay(
    machineId: '76' | '79',
    date: string
  ): Promise<boolean> {
    try {
      const sales = await this.getSalesForDate(date)
      const machineSales = sales.filter(sale => sale.machineId === machineId)
      return machineSales.length === 0
    } catch (error) {
      return true // Assume first sale if error
    }
  }

  /**
   * Comprehensive validation for new sale entries
   * Combines all business rules
   */
  static async validateSaleEntry(saleData: {
    machineId: '76' | '79'
    date: string
    hour: number
    totalSales: number
  }): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    // 1. Validate date/time (no future entries)
    const dateTimeValidation = this.validateDateTime(saleData.date, saleData.hour)
    if (!dateTimeValidation.isValid && dateTimeValidation.error) {
      errors.push(dateTimeValidation.error)
    }
    
    // 2. Validate progressive totals
    const progressiveValidation = await this.validateProgressiveSales(
      saleData.machineId,
      saleData.date,
      saleData.hour,
      saleData.totalSales
    )
    if (!progressiveValidation.isValid && progressiveValidation.error) {
      errors.push(progressiveValidation.error)
    }
    
    // 3. Basic amount validation
    if (saleData.totalSales < 0) {
      errors.push('El total de ventas no puede ser negativo')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
