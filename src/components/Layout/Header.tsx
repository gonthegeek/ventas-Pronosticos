import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../state/store'
import { signOut } from '../../state/slices/authSlice'

interface HeaderProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

/**
 * Header Component - Migrated from legacy navigation
 * Provides top navigation with user info and actions
 */
const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const dispatch = useDispatch<AppDispatch>()
  const { userProfile } = useSelector((state: RootState) => state.auth)

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Menu toggle + Module title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 
                     focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-transform duration-200"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg 
              className={`h-6 w-6 transition-transform duration-200 ${sidebarOpen ? '' : 'rotate-180'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
          
          <h1 className="text-xl font-semibold text-gray-900">
            Casa Pronósticos
          </h1>
        </div>

        {/* Right: User info + actions */}
        <div className="flex items-center space-x-4">
          {/* User info */}
          <div className="hidden md:block text-right">
            <div className="text-sm font-medium text-gray-900">
              {userProfile?.displayName || userProfile?.email}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {userProfile?.role.name}
            </div>
          </div>

          {/* User avatar */}
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {(userProfile?.displayName || userProfile?.email || 'U')[0].toUpperCase()}
            </span>
          </div>

          {/* Dropdown menu */}
          <div className="relative">
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-gray-500 p-2 rounded-md hover:bg-gray-100"
              title="Sign out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
