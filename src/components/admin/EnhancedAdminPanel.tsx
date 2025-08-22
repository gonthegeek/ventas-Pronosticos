import React, { useState } from 'react'
import { useAppSelector } from '../../state/hooks'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import AdminSetup from './AdminSetup'
import CacheMonitor from './CacheMonitor'

/**
 * Enhanced Admin Panel with Cache Management
 * Wrapper around the original AdminSetup with added cache functionality
 */
const EnhancedAdminPanel: React.FC = () => {
  const { userProfile } = useAppSelector((state) => state.auth)
  const hasPermission = useHasPermission(PERMISSIONS.ADMIN_ALL)
  const [activeTab, setActiveTab] = useState<'admin' | 'cache'>('admin')

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Acceso Denegado
              </h2>
              <p className="text-gray-600">
                No tienes permisos para acceder al panel de administración.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Rol actual: <span className="font-medium capitalize">{userProfile?.role.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600">Gestión de usuarios, datos y sistema de cache</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as 'admin' | 'cache')}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="admin">Administración General</option>
              <option value="cache">Monitor de Cache</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`${
                    activeTab === 'admin'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  ⚙️ Administración General
                </button>
                <button
                  onClick={() => setActiveTab('cache')}
                  className={`${
                    activeTab === 'cache'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  📊 Monitor de Cache
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg">
          {activeTab === 'admin' ? (
            <div className="p-6">
              <AdminSetup />
            </div>
          ) : (
            <div className="p-6">
              <CacheMonitor />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnhancedAdminPanel
