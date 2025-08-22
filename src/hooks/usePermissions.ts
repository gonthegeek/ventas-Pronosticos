/**
 * Permission Hooks for React Components
 * Provides easy-to-use hooks for checking permissions in React components
 */

import { useSelector } from 'react-redux'
import { RootState } from '../state/store'
import { 
  PermissionName, 
  RoleName, 
  PermissionUtils 
} from '../utils/permissions'

/**
 * Hook to get current user permissions state
 */
export const usePermissions = () => {
  return useSelector((state: RootState) => ({
    userProfile: state.auth.userProfile,
    isAuthenticated: state.auth.isAuthenticated,
    isLoading: state.auth.isLoading
  }))
}

/**
 * Hook to check if user has specific permission
 */
export const useHasPermission = (permission: PermissionName): boolean => {
  const { userProfile } = usePermissions()
  return PermissionUtils.isAuthorized(userProfile, permission)
}

/**
 * Hook to check if user can access specific menu
 */
export const useCanAccessMenu = (menuId: string): boolean => {
  const { userProfile } = usePermissions()
  return PermissionUtils.canAccessMenu(userProfile, menuId)
}

/**
 * Hook to check if user has specific role
 */
export const useHasRole = (role: RoleName): boolean => {
  const { userProfile } = usePermissions()
  return userProfile ? PermissionUtils.hasRole(userProfile.role.name, role) : false
}

/**
 * Hook to check if user has role level (includes higher roles)
 */
export const useHasRoleLevel = (requiredRole: RoleName): boolean => {
  const { userProfile } = usePermissions()
  return userProfile ? PermissionUtils.hasRoleLevel(userProfile.role.name, requiredRole) : false
}

/**
 * Hook to get user's role information
 */
export const useUserRole = () => {
  const { userProfile } = usePermissions()
  return {
    role: userProfile?.role || null,
    roleName: userProfile?.role.name || null,
    roleLevel: userProfile?.role.level || 0,
    roleDisplayName: userProfile?.role.name ? PermissionUtils.getRoleDisplayName(userProfile.role.name) : null
  }
}

/**
 * Hook to check multiple permissions at once
 */
export const useHasAnyPermission = (permissions: PermissionName[]): boolean => {
  const { userProfile } = usePermissions()
  
  if (!userProfile) return false
  
  return permissions.some(permission => 
    PermissionUtils.isAuthorized(userProfile, permission)
  )
}

/**
 * Hook to check if user has all specified permissions
 */
export const useHasAllPermissions = (permissions: PermissionName[]): boolean => {
  const { userProfile } = usePermissions()
  
  if (!userProfile) return false
  
  return permissions.every(permission => 
    PermissionUtils.isAuthorized(userProfile, permission)
  )
}

/**
 * Hook to get user's available menu items
 */
export const useAvailableMenus = (menuIds: string[]): string[] => {
  const { userProfile } = usePermissions()
  
  if (!userProfile) return []
  
  return menuIds.filter(menuId => 
    PermissionUtils.canAccessMenu(userProfile, menuId)
  )
}

/**
 * Custom hook for conditional rendering based on permissions
 */
export const usePermissionGuard = () => {
  const { userProfile, isAuthenticated } = usePermissions()
  
  return {
    /**
     * Check if component should render based on permission
     */
    canRender: (permission: PermissionName): boolean => {
      return isAuthenticated && PermissionUtils.isAuthorized(userProfile, permission)
    },
    
    /**
     * Check if component should render based on role
     */
    canRenderForRole: (role: RoleName): boolean => {
      return isAuthenticated && userProfile ? PermissionUtils.hasRole(userProfile.role.name, role) : false
    },
    
    /**
     * Check if component should render based on role level
     */
    canRenderForRoleLevel: (requiredRole: RoleName): boolean => {
      return isAuthenticated && userProfile ? PermissionUtils.hasRoleLevel(userProfile.role.name, requiredRole) : false
    },
    
    /**
     * Check if component should render based on menu access
     */
    canRenderForMenu: (menuId: string): boolean => {
      return isAuthenticated && PermissionUtils.canAccessMenu(userProfile, menuId)
    }
  }
}

export default {
  usePermissions,
  useHasPermission,
  useCanAccessMenu,
  useHasRole,
  useHasRoleLevel,
  useUserRole,
  useHasAnyPermission,
  useHasAllPermissions,
  useAvailableMenus,
  usePermissionGuard
}
