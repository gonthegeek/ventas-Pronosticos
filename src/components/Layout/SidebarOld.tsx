import React from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { 
  useCanAccessMenu, 
  useHasPermission, 
  useHasRoleLevel 
} from '../../hooks/usePermissions'
import { 
  PERMISSIONS, 
  ROLES,
  PermissionName,
  RoleName 
} from '../../utils/permissions'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

/**
 * Sidebar Component - Migrated from legacy navigation system
 * Provides module navigation with role-based menu items and collapse functionality
 * Aligned with SRS.json functionality requirements
 */
const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { userProfile } = useSelector((state: RootState) => state.auth)

  // Navigation items based on SRS functionalities
  const navigationItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0H8v0z" />
        </svg>
      ),
      permission: null, // Available to all roles
    },
    {
      id: 'sales-hourly',
      name: 'Hourly Sales',
      path: '/sales/hourly',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      permission: 'sales:read',
      srsId: 1, // SRS functionality #1
    },
    // Additional modules will be added as we migrate
    {
      id: 'reports',
      name: 'Reports',
      path: '/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2-2V3a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 002 2v8a2 2 0 01-2 2h-6a2 2 0 00-2 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      permission: 'reports:read',
      minRole: 2, // Supervisor and above
    },
    {
      id: 'admin',
      name: 'Administration',
      path: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      permission: 'admin:access',
      minRole: 3, // Admin only
    }
  ]

  // Filter navigation items based on user permissions using new hooks
  const visibleItems = navigationItems.filter(item => {
    // Check specific permissions using hooks
    if (item.permission === 'sales:read') {
      return useHasPermission(PERMISSIONS.VENTAS_READ)
    }
    if (item.permission === 'admin:access') {
      return useHasPermission(PERMISSIONS.ADMIN_ALL)
    }
    if (item.permission === 'reports:read') {
      return useHasRoleLevel(ROLES.SUPERVISOR)
    }
    
    // Default: allow items without specific permissions
    return true
  })

  return (
    <div className="flex flex-col h-full bg-white" onDoubleClick={isCollapsed ? onToggle : undefined}>
      {/* Logo/Brand */}
      <div 
        className="flex items-center justify-center h-16 px-4 bg-blue-600 cursor-pointer hover:bg-blue-700 transition-colors" 
        onClick={onToggle}
        title={isCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
      >
        {isCollapsed ? (
          <div className="text-white text-xl font-bold">CP</div>
        ) : (
          <h1 className="text-white text-lg font-bold">Casa Pronósticos</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-6 space-y-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `
              flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
              ${isCollapsed ? 'hover:scale-110' : ''}
            `}
            title={isCollapsed ? item.name : undefined}
          >
            <span className={isCollapsed ? '' : 'mr-3'}>{item.icon}</span>
            {!isCollapsed && (
              <>
                {item.name}
                {item.srsId && (
                  <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    SRS #{item.srsId}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info footer */}
      <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'text-center' : ''}`}>
        {isCollapsed ? (
          <div className="w-8 h-8 bg-blue-600 rounded-full mx-auto flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {(userProfile?.displayName || userProfile?.email || 'U')[0].toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            Logged in as: <span className="font-medium">{userProfile?.role.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
