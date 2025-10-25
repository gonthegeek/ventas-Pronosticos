import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { SalesValidator, DailyValidationReport, MachineValidation } from '../../services/SalesValidator'

/**
 * DataValidationTool - Admin tool for analyzing and validating daily sales data
 * Checks data integrity, identifies anomalies, and verifies totals
 */
const DataValidationTool: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [report, setReport] = useState<DailyValidationReport | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [fixSummary, setFixSummary] = useState<null | { fixed: number; skipped: number; date: string }>(null)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async () => {
    setIsValidating(true)
    setError(null)
    setReport(null)

    try {
      const validationReport = await SalesValidator.validateDay(selectedDate)
      setReport(validationReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setIsValidating(false)
    }
  }

  const handleExportCSV = () => {
    if (!report) return

    const csv = SalesValidator.exportToCSV(report)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-validation-${report.date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAutoFix = async () => {
    setIsFixing(true)
    setError(null)
    setFixSummary(null)
    try {
      const result = await SalesValidator.fixDayDeltas(selectedDate)
      setFixSummary({ fixed: result.fixed, skipped: result.skipped, date: result.date })
      // Re-validate after fixes
      const validationReport = await SalesValidator.validateDay(selectedDate)
      setReport(validationReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-fix failed')
    } finally {
      setIsFixing(false)
    }
  }

  const renderMachineValidation = (
    machineId: string,
    machine: MachineValidation
  ) => {
    return (
      <div key={machineId} className="border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900">
            Máquina {machineId}
          </h4>
          {machine.hasIssues ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              ⚠️ Issues Found
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Valid
            </span>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded p-3">
          <div>
            <div className="text-xs text-gray-500">Computed Total</div>
            <div className="text-lg font-bold text-gray-900">
              ${machine.computedTotal.toFixed(2)}
            </div>
          </div>
          {machine.lastCumulativeTotal !== undefined && (
            <div>
              <div className="text-xs text-gray-500">Final Cumulative</div>
              <div className="text-lg font-bold text-gray-900">
                ${machine.lastCumulativeTotal.toFixed(2)}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500">Total Entries</div>
            <div className="text-lg font-bold text-gray-900">
              {machine.entries.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Hours Covered</div>
            <div className="text-lg font-bold text-gray-900">
              {new Set(machine.entries.map(e => e.hour)).size}
            </div>
          </div>
        </div>

        {/* Issues Summary */}
        {machine.hasIssues && (
          <div className="space-y-2">
            <h5 className="text-sm font-semibold text-red-700">Issues Detected:</h5>
            <div className="space-y-1 text-sm">
              {machine.summary.duplicateHours > 0 && (
                <div className="flex items-center text-red-600">
                  <span className="mr-2">⚠️</span>
                  <span>{machine.summary.duplicateHours} duplicate hour(s)</span>
                </div>
              )}
              
              {machine.summary.missingHours.length > 0 && (
                <div className="flex items-start text-orange-600">
                  <span className="mr-2 mt-0.5">⚠️</span>
                  <div>
                    <span>Missing hours: </span>
                    <span className="font-mono">
                      {machine.summary.missingHours.slice(0, 10).join(', ')}
                      {machine.summary.missingHours.length > 10 && 
                        ` (+${machine.summary.missingHours.length - 10} more)`}
                    </span>
                  </div>
                </div>
              )}
              
              {machine.summary.negativeDeltas > 0 && (
                <div className="flex items-center text-red-600">
                  <span className="mr-2">⚠️</span>
                  <span>{machine.summary.negativeDeltas} negative delta(s)</span>
                </div>
              )}
              
              {machine.summary.nonMonotonicReadings > 0 && (
                <div className="flex items-center text-red-600">
                  <span className="mr-2">⚠️</span>
                  <span>{machine.summary.nonMonotonicReadings} non-monotonic reading(s)</span>
                </div>
              )}
              
              {machine.summary.sumMismatch && (
                <div className="flex items-center text-red-600">
                  <span className="mr-2">⚠️</span>
                  <span>
                    Sum mismatch: computed total doesn't match final cumulative
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entry Details (only show if there are issues) */}
        {machine.hasIssues && machine.entries.some(e => e.issues.length > 0) && (
          <div className="mt-4">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">
              Entry Details:
            </h5>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-500">Hour</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-500">Amount</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-500">Total</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500">Issues</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {machine.entries
                    .filter(e => e.issues.length > 0)
                    .map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-gray-900 font-mono">
                          {entry.hour.toString().padStart(2, '0')}:00
                        </td>
                        <td className="px-2 py-2 text-right text-gray-900 font-mono">
                          ${entry.amount.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-900 font-mono">
                          {entry.totalSales !== undefined 
                            ? `$${entry.totalSales.toFixed(2)}` 
                            : '-'}
                        </td>
                        <td className="px-2 py-2 text-red-600 text-xs">
                          {entry.issues.join('; ')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Data Validation Tool
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Analyze daily sales entries to verify data integrity, check for missing hours,
              negative deltas, and ensure cumulative totals are correct.
            </p>
          </div>

          {/* Date Selection */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Date to Validate
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const current = new Date(selectedDate)
                    current.setDate(current.getDate() - 1)
                    setSelectedDate(current.toISOString().split('T')[0])
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Previous day"
                >
                  ← Prev
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    const current = new Date(selectedDate)
                    current.setDate(current.getDate() + 1)
                    const today = new Date().toISOString().split('T')[0]
                    const next = current.toISOString().split('T')[0]
                    if (next <= today) {
                      setSelectedDate(next)
                    }
                  }}
                  disabled={selectedDate >= new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  title="Next day"
                >
                  Next →
                </button>
              </div>
            </div>
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              className="whitespace-nowrap"
            >
              {isValidating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validating...
                </>
              ) : (
                '🔍 Validate'
              )}
            </Button>
            {report && (
              <Button
                onClick={handleExportCSV}
                variant="secondary"
                className="whitespace-nowrap"
              >
                📥 Export CSV
              </Button>
            )}
            {report && (
              <Button
                onClick={handleAutoFix}
                variant="secondary"
                className="whitespace-nowrap"
                disabled={isFixing}
              >
                {isFixing ? 'Fixing…' : '🛠️ Auto-Fix Deltas'}
              </Button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {fixSummary && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-700">
                Auto-fix completed for {fixSummary.date}: {fixSummary.fixed} fixed, {fixSummary.skipped} unchanged.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Validation Report */}
      {report && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Validation Report - {report.date}
              </h3>
              {report.hasIssues ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  ⚠️ Issues Detected
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✅ All Valid
                </span>
              )}
            </div>

            {/* Overall Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-blue-700">Overall Total</div>
                  <div className="text-2xl font-bold text-blue-900">
                    ${report.overallTotal.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-700">Machine 76</div>
                  <div className="text-2xl font-bold text-blue-900">
                    ${report.machines['76'].computedTotal.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-700">Machine 79</div>
                  <div className="text-2xl font-bold text-blue-900">
                    ${report.machines['79'].computedTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Machine-by-Machine Validation */}
            <div className="space-y-4">
              {renderMachineValidation('76', report.machines['76'])}
              {renderMachineValidation('79', report.machines['79'])}
            </div>

            {/* Text Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Summary Report:
              </h4>
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                {SalesValidator.summarizeReport(report)}
              </pre>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DataValidationTool
