import React, { useState } from 'react'
import { useCacheStats } from '../../hooks/useCachedSales'
import { CacheManager } from '../../services/CacheService'

/**
 * Cache Monitor Component for Admin Panel
 * Provides detailed cache analytics and management tools
 */
const CacheMonitor: React.FC = () => {
  const { stats, updateStats, cleanup } = useCacheStats()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleInvalidateAll = async () => {
    setActionLoading('invalidate')
    try {
      CacheManager.invalidateSalesData()
      CacheManager.invalidateDashboard()
      updateStats()
      console.log('✅ All caches invalidated')
    } catch (error) {
      console.error('❌ Failed to invalidate caches:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCleanup = async () => {
    setActionLoading('cleanup')
    try {
      cleanup()
      console.log('✅ Cache cleanup completed')
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleInvalidateSales = async () => {
    setActionLoading('sales')
    try {
      CacheManager.invalidateSalesData()
      updateStats()
      console.log('✅ Sales cache invalidated')
    } catch (error) {
      console.error('❌ Failed to invalidate sales cache:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleInvalidateDashboard = async () => {
    setActionLoading('dashboard')
    try {
      CacheManager.invalidateDashboard()
      updateStats()
      console.log('✅ Dashboard cache invalidated')
    } catch (error) {
      console.error('❌ Failed to invalidate dashboard cache:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600'
    if (efficiency >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cache Monitor</h2>
          <p className="text-gray-600">Monitor and manage caching system performance</p>
        </div>
        <button
          onClick={updateStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh Stats
        </button>
      </div>

      {/* Overall Statistics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Overall Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.efficiency}%</div>
              <div className="text-sm text-gray-500">Cache Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.requestsSaved}</div>
              <div className="text-sm text-gray-500">Requests Saved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats.sales.size + stats.dashboard.size}
              </div>
              <div className="text-sm text-gray-500">Total Cached Items</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                ${((stats.requestsSaved * 0.00036) || 0).toFixed(4)}
              </div>
              <div className="text-sm text-gray-500">Est. Savings (USD)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Cache */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Sales Data Cache
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cache Hits:</span>
                <span className="text-sm font-medium">{stats.sales.hits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cache Misses:</span>
                <span className="text-sm font-medium">{stats.sales.misses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Hit Rate:</span>
                <span className={`text-sm font-medium ${getEfficiencyColor(stats.sales.efficiency)}`}>
                  {stats.sales.efficiency}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cached Items:</span>
                <span className="text-sm font-medium">{stats.sales.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Requests Saved:</span>
                <span className="text-sm font-medium text-green-600">{stats.sales.savedRequests}</span>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleInvalidateSales}
                disabled={actionLoading === 'sales'}
                className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'sales' ? 'Invalidating...' : 'Invalidate Sales Cache'}
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Cache */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Dashboard Cache
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cache Hits:</span>
                <span className="text-sm font-medium">{stats.dashboard.hits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cache Misses:</span>
                <span className="text-sm font-medium">{stats.dashboard.misses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Hit Rate:</span>
                <span className={`text-sm font-medium ${getEfficiencyColor(stats.dashboard.efficiency)}`}>
                  {stats.dashboard.efficiency}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cached Items:</span>
                <span className="text-sm font-medium">{stats.dashboard.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Requests Saved:</span>
                <span className="text-sm font-medium text-green-600">{stats.dashboard.savedRequests}</span>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleInvalidateDashboard}
                disabled={actionLoading === 'dashboard'}
                className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'dashboard' ? 'Invalidating...' : 'Invalidate Dashboard Cache'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Management Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Cache Management
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleCleanup}
              disabled={actionLoading === 'cleanup'}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {actionLoading === 'cleanup' ? 'Cleaning...' : 'Cleanup Expired Entries'}
            </button>
            <button
              onClick={handleInvalidateAll}
              disabled={actionLoading === 'invalidate'}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === 'invalidate' ? 'Invalidating...' : 'Invalidate All Caches'}
            </button>
          </div>
        </div>
      </div>

      {/* Cache Benefits Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-blue-900 mb-2">
            💡 Cache Benefits
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Firestore Free Tier:</strong> 50,000 reads/day limit. Cache helps avoid unnecessary queries.
            </p>
            <p>
              <strong>Performance:</strong> Cached data loads instantly, improving user experience.
            </p>
            <p>
              <strong>Cost Savings:</strong> Each cached hit saves approximately $0.00036 per 1,000 reads.
            </p>
            <p>
              <strong>Network Efficiency:</strong> Reduces bandwidth usage and improves offline capabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CacheMonitor
