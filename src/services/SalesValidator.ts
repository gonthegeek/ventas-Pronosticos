import { SalesService } from './SalesService'
import { CacheManager } from './CacheService'
import { SaleEntry } from '../state/slices/salesSlice'

/**
 * Validation result for a single entry
 */
export interface EntryValidation {
  hour: number
  machineId: string
  amount: number
  totalSales?: number
  timestamp: Date
  issues: string[]
}

/**
 * Validation result for a machine on a specific date
 */
export interface MachineValidation {
  machineId: string
  entries: EntryValidation[]
  computedTotal: number // Sum of all hourly deltas
  lastCumulativeTotal?: number // Final totalSales reading
  hasIssues: boolean
  summary: {
    missingHours: number[]
    negativeDeltas: number
    nonMonotonicReadings: number
    duplicateHours: number
    sumMismatch: boolean
  }
}

/**
 * Complete validation report for a date
 */
export interface DailyValidationReport {
  date: string
  machines: {
    '76': MachineValidation
    '79': MachineValidation
  }
  overallTotal: number
  hasIssues: boolean
  timestamp: Date
}

/**
 * SalesValidator - Comprehensive daily sales validation
 * Checks data integrity, identifies anomalies, and verifies totals
 */
export class SalesValidator {
  /**
   * Validate all sales entries for a specific date
   */
  static async validateDay(date: string): Promise<DailyValidationReport> {
    const entries = await SalesService.getSalesForDate(date)
    
    // Group by machine
    const machine76 = entries.filter(e => e.machineId === '76')
    const machine79 = entries.filter(e => e.machineId === '79')
    
    const validation76 = this.validateMachineEntries('76', machine76)
    const validation79 = this.validateMachineEntries('79', machine79)
    
    return {
      date,
      machines: {
        '76': validation76,
        '79': validation79,
      },
      overallTotal: validation76.computedTotal + validation79.computedTotal,
      hasIssues: validation76.hasIssues || validation79.hasIssues,
      timestamp: new Date(),
    }
  }

  /**
   * Auto-fix incorrect hourly deltas (amount) for a specific date.
   * Logic: where totalSales exists, set amount to max(0, totalSales - prevTotalSales).
   * Returns a summary of fixes applied.
   */
  static async fixDayDeltas(date: string, options?: { tolerance?: number }): Promise<{
    date: string
    fixed: number
    skipped: number
    details: Array<{ id: string; machineId: string; hour: number; from: number; to: number; reason?: string }>
  }> {
    const tolerance = options?.tolerance ?? 0.01
    const entries = await SalesService.getSalesForDate(date)

    // Group by machine and sort
    const grouped: Record<string, SaleEntry[]> = { '76': [], '79': [] } as any
    for (const e of entries) {
      if (e.machineId === '76' || e.machineId === '79') grouped[e.machineId].push(e)
    }

    let fixed = 0
    let skipped = 0
    const details: Array<{ id: string; machineId: string; hour: number; from: number; to: number; reason?: string }> = []

    for (const machineId of ['76', '79'] as const) {
      const list = grouped[machineId]
      list.sort((a, b) => (a.hour !== b.hour ? a.hour - b.hour : a.timestamp.getTime() - b.timestamp.getTime()))

      let prevTotal: number | undefined = undefined

      for (const entry of list) {
        // Only fix when we have a cumulative reading
        if (typeof entry.totalSales !== 'number') {
          skipped++
          details.push({ id: entry.id, machineId, hour: entry.hour, from: entry.amount, to: entry.amount, reason: 'missing totalSales' })
          continue
        }

        let expected = 0
        if (prevTotal === undefined) {
          expected = entry.totalSales
        } else {
          expected = entry.totalSales - prevTotal
        }
        if (expected < 0) {
          // Non-monotonic cumulative; clamp to 0 to avoid negative hourly values
          details.push({ id: entry.id, machineId, hour: entry.hour, from: entry.amount, to: Math.max(0, expected), reason: 'non-monotonic cumulative' })
          expected = 0
        }

        const needsFix = Math.abs((entry.amount ?? 0) - expected) > tolerance
        if (needsFix) {
          // Persist fix
          try {
            await SalesService.updateSale(entry.id, entry, { amount: expected, notes: (entry.notes || '') })
            fixed++
            details.push({ id: entry.id, machineId, hour: entry.hour, from: entry.amount, to: expected })
          } catch (err) {
            skipped++
            details.push({ id: entry.id, machineId, hour: entry.hour, from: entry.amount, to: entry.amount, reason: 'update failed' })
          }
        } else {
          skipped++
        }

        prevTotal = entry.totalSales
      }
    }

    // Invalidate caches for this date if any changes were made
    if (fixed > 0) {
      CacheManager.invalidateSalesData(date)
    }

    return { date, fixed, skipped, details }
  }

  /**
   * Validate entries for a single machine
   */
  private static validateMachineEntries(
    machineId: string,
    entries: SaleEntry[]
  ): MachineValidation {
    // Sort by hour, then by timestamp
    const sorted = [...entries].sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour
      return a.timestamp.getTime() - b.timestamp.getTime()
    })

    const validatedEntries: EntryValidation[] = []
    const hoursSeen = new Set<number>()
    const duplicateHours: number[] = []
    let prevTotalSales: number | undefined = undefined
    let computedTotal = 0
    let negativeDeltas = 0
    let nonMonotonicReadings = 0

    for (const entry of sorted) {
      const issues: string[] = []
      
      // Check for duplicate hour
      if (hoursSeen.has(entry.hour)) {
        issues.push('Duplicate hour entry')
        duplicateHours.push(entry.hour)
      }
      hoursSeen.add(entry.hour)

      // Validate totalSales if present
      if (typeof entry.totalSales === 'number') {
        // Check if cumulative total is monotonic
        if (prevTotalSales !== undefined && entry.totalSales < prevTotalSales) {
          issues.push(`Non-monotonic: ${entry.totalSales} < previous ${prevTotalSales}`)
          nonMonotonicReadings++
        }

        // Calculate delta
        const expectedDelta = prevTotalSales !== undefined 
          ? entry.totalSales - prevTotalSales 
          : entry.totalSales // First entry

        // Check if delta matches stored amount
        if (Math.abs(expectedDelta - entry.amount) > 0.01) {
          issues.push(
            `Amount mismatch: stored=${entry.amount.toFixed(2)}, ` +
            `expected delta=${expectedDelta.toFixed(2)}`
          )
        }

        // Check for negative delta
        if (expectedDelta < 0) {
          issues.push(`Negative delta: ${expectedDelta.toFixed(2)}`)
          negativeDeltas++
        }

        computedTotal += Math.max(0, expectedDelta)
        prevTotalSales = entry.totalSales
      } else {
        // No totalSales field; use amount directly
        if (entry.amount < 0) {
          issues.push(`Negative amount: ${entry.amount}`)
          negativeDeltas++
        }
        computedTotal += Math.max(0, entry.amount)
      }

      validatedEntries.push({
        hour: entry.hour,
        machineId: entry.machineId,
        amount: entry.amount,
        totalSales: entry.totalSales,
        timestamp: entry.timestamp,
        issues,
      })
    }

    // Check for missing hours (gaps)
    const missingHours: number[] = []
    if (hoursSeen.size > 0) {
      const minHour = Math.min(...Array.from(hoursSeen))
      const maxHour = Math.max(...Array.from(hoursSeen))
      for (let h = minHour; h <= maxHour; h++) {
        if (!hoursSeen.has(h)) {
          missingHours.push(h)
        }
      }
    }

    // Check sum mismatch: if we have cumulative readings, final total should match sum of deltas
    const lastCumulativeTotal = prevTotalSales
    const sumMismatch = lastCumulativeTotal !== undefined 
      && Math.abs(lastCumulativeTotal - computedTotal) > 0.01

    const hasIssues = 
      validatedEntries.some(e => e.issues.length > 0) ||
      missingHours.length > 0 ||
      negativeDeltas > 0 ||
      nonMonotonicReadings > 0 ||
      duplicateHours.length > 0 ||
      sumMismatch

    return {
      machineId,
      entries: validatedEntries,
      computedTotal,
      lastCumulativeTotal,
      hasIssues,
      summary: {
        missingHours,
        negativeDeltas,
        nonMonotonicReadings,
        duplicateHours: duplicateHours.length,
        sumMismatch,
      },
    }
  }

  /**
   * Batch validate multiple dates
   */
  static async validateDateRange(
    startDate: string,
    endDate: string
  ): Promise<DailyValidationReport[]> {
    const reports: DailyValidationReport[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const report = await this.validateDay(dateStr)
      reports.push(report)
      current.setDate(current.getDate() + 1)
    }
    
    return reports
  }

  /**
   * Generate a text summary of issues
   */
  static summarizeReport(report: DailyValidationReport): string {
    if (!report.hasIssues) {
      return `✅ No issues found for ${report.date}`
    }

    const lines: string[] = [`📊 Validation Report for ${report.date}`, '']

    for (const machineId of ['76', '79'] as const) {
      const machine = report.machines[machineId]
      if (!machine.hasIssues) {
        lines.push(`✅ Machine ${machineId}: No issues`)
        continue
      }

      lines.push(`⚠️ Machine ${machineId}: Issues detected`)
      
      if (machine.summary.duplicateHours > 0) {
        lines.push(`  - ${machine.summary.duplicateHours} duplicate hour(s)`)
      }
      
      if (machine.summary.missingHours.length > 0) {
        const missing = machine.summary.missingHours.slice(0, 5).join(', ')
        const more = machine.summary.missingHours.length > 5 
          ? ` (+${machine.summary.missingHours.length - 5} more)` 
          : ''
        lines.push(`  - Missing hours: ${missing}${more}`)
      }
      
      if (machine.summary.negativeDeltas > 0) {
        lines.push(`  - ${machine.summary.negativeDeltas} negative delta(s)`)
      }
      
      if (machine.summary.nonMonotonicReadings > 0) {
        lines.push(`  - ${machine.summary.nonMonotonicReadings} non-monotonic reading(s)`)
      }
      
      if (machine.summary.sumMismatch) {
        lines.push(
          `  - Sum mismatch: computed=${machine.computedTotal.toFixed(2)}, ` +
          `final cumulative=${machine.lastCumulativeTotal?.toFixed(2) || 'N/A'}`
        )
      }
      
      lines.push(`  - Computed total: $${machine.computedTotal.toFixed(2)}`)
      lines.push('')
    }

    lines.push(`Total: $${report.overallTotal.toFixed(2)}`)
    
    return lines.join('\n')
  }

  /**
   * Export detailed report to CSV format
   */
  static exportToCSV(report: DailyValidationReport): string {
    const rows: string[] = [
      'Machine,Hour,Amount,TotalSales,Timestamp,Issues'
    ]

    for (const machineId of ['76', '79'] as const) {
      const machine = report.machines[machineId]
      for (const entry of machine.entries) {
        const issues = entry.issues.length > 0 
          ? `"${entry.issues.join('; ')}"` 
          : ''
        rows.push(
          `${entry.machineId},${entry.hour},${entry.amount},` +
          `${entry.totalSales ?? ''},${entry.timestamp.toISOString()},${issues}`
        )
      }
    }

    return rows.join('\n')
  }
}
