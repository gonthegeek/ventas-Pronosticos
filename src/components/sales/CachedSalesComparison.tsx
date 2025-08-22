import React, { useState, useEffect } from 'react'
import { useBatchSalesData } from '../../hooks/useCachedSales'
import LoadingSpinner from '../ui/LoadingSpinner'

interface ComparisonPeriod {
  id: string
  label: string
  dates: string[]
  description: string
}

/**
 * Cached Sales Comparison Component
 * Uses intelligent caching to load historical data efficiently
 */
const CachedSalesComparison: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last7days')
  const [comparisonData, setComparisonData] = useState<Map<string, number>>(new Map())
  const [periods, setPeriods] = useState<ComparisonPeriod[]>([])
  
  const { loadBatch, loading, error } = useBatchSalesData()

  // Generate comparison periods
  useEffect(() => {
    const generatePeriods = (): ComparisonPeriod[] => {
      const now = new Date()
      const periods: ComparisonPeriod[] = []

      // Last 7 days
      const last7Days: string[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        last7Days.push(date.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }))
      }
      periods.push({
        id: 'last7days',
        label: 'Last 7 Days',
        dates: last7Days,
        description: 'Compare daily sales for the past week'
      })

      // Last 14 days
      const last14Days: string[] = []
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        last14Days.push(date.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }))
      }
      periods.push({
        id: 'last14days',
        label: 'Last 14 Days',
        dates: last14Days,
        description: 'Compare daily sales for the past two weeks'
      })

      // This month
      const thisMonthDates: string[] = []
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentDate = new Date(firstDayOfMonth)
      while (currentDate <= now) {
        thisMonthDates.push(currentDate.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      periods.push({
        id: 'thismonth',
        label: 'This Month',
        dates: thisMonthDates,
        description: 'Compare daily sales for the current month'
      })

      // Last month
      const lastMonthDates: string[] = []
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const lastMonthDate = new Date(firstDayLastMonth)
      while (lastMonthDate <= lastDayLastMonth) {
        lastMonthDates.push(lastMonthDate.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }))
        lastMonthDate.setDate(lastMonthDate.getDate() + 1)
      }
      periods.push({
        id: 'lastmonth',
        label: 'Last Month',
        dates: lastMonthDates,
        description: 'Compare daily sales for the previous month'
      })

      // Last 12 weeks (Mondays only for weekly comparison)
      const last12Mondays: string[] = []
      const today = new Date(now)
      let currentMonday = new Date(today)
      // Get the most recent Monday
      const dayOfWeek = currentMonday.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      currentMonday.setDate(currentMonday.getDate() - daysFromMonday)
      
      for (let i = 0; i < 12; i++) {
        last12Mondays.unshift(currentMonday.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }))
        currentMonday.setDate(currentMonday.getDate() - 7)
      }
      periods.push({
        id: 'weekly',
        label: 'Weekly Comparison',
        dates: last12Mondays,
        description: 'Compare Monday sales for the past 12 weeks'
      })

      return periods
    }

    setPeriods(generatePeriods())
  }, [])

  // Load data when period changes
  useEffect(() => {
    const loadComparisonData = async () => {
      const period = periods.find(p => p.id === selectedPeriod)
      if (!period) return

      try {
        console.log(`📊 Loading comparison data for: ${period.label}`)
        const data = await loadBatch(period.dates)
        setComparisonData(data)
      } catch (error) {
        console.error('Failed to load comparison data:', error)
      }
    }

    if (periods.length > 0) {
      loadComparisonData()
    }
  }, [selectedPeriod, periods, loadBatch])

  const currentPeriod = periods.find(p => p.id === selectedPeriod)
  const dataArray = currentPeriod?.dates.map(date => ({
    date,
    amount: comparisonData.get(date) || 0,
    displayDate: new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: selectedPeriod === 'weekly' ? 'short' : undefined
    })
  })) || []

  const totalAmount = dataArray.reduce((sum, item) => sum + item.amount, 0)
  const averageAmount = dataArray.length > 0 ? totalAmount / dataArray.length : 0
  const maxAmount = Math.max(...dataArray.map(item => item.amount))
  const minAmount = Math.min(...dataArray.map(item => item.amount))

  if (periods.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sales Comparison</h2>
        <p className="text-gray-600">Compare sales data across different time periods (cached for performance)</p>
      </div>

      {/* Period Selection */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-3">
            Select Comparison Period
          </label>
          <select
            id="period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {periods.map(period => (
              <option key={period.id} value={period.id}>
                {period.label}
              </option>
            ))}
          </select>
          {currentPeriod && (
            <p className="mt-2 text-sm text-gray-500">{currentPeriod.description}</p>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <LoadingSpinner />
            <p className="mt-2 text-sm text-gray-500">Loading comparison data from cache...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {!loading && dataArray.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${totalAmount.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">📈</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Average</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${averageAmount.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">⬆️</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Highest</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${maxAmount.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">⬇️</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Lowest</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${minAmount.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {!loading && dataArray.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {currentPeriod?.label} Data
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      vs Average
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataArray.map((item, index) => {
                    const percentageVsAverage = averageAmount > 0 
                      ? ((item.amount - averageAmount) / averageAmount) * 100 
                      : 0
                    const isAboveAverage = item.amount > averageAmount
                    
                    return (
                      <tr key={item.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.displayDate}
                          <div className="text-xs text-gray-500">{item.date}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={isAboveAverage ? 'text-green-600' : 'text-red-600'}>
                            {isAboveAverage ? '+' : ''}{percentageVsAverage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className={`h-2 rounded-full ${isAboveAverage ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ 
                                  width: `${Math.min(100, Math.max(10, (item.amount / maxAmount) * 100))}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {((item.amount / maxAmount) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cache Performance Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400 text-xl">⚡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Performance Optimized</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This comparison tool uses intelligent caching to minimize Firestore requests. 
                  Historical data is cached for extended periods, while recent data uses shorter cache times 
                  to ensure accuracy. This helps keep your Firebase usage within free tier limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CachedSalesComparison
