/**
 * Permissions and Roles System
 * Migrated from legacy system - implements SRS admin panel requirements
 * Task 1.3: Sistema de roles básico
 */

/**
 * Role definitions based on legacy system
 */
export const ROLES = {
    OPERADOR: 'operador',
    SUPERVISOR: 'supervisor', 
    ADMIN: 'admin'
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

/**
 * Permission definitions based on SRS requirements
 */
export const PERMISSIONS = {
    // Dashboard permissions
    DASHBOARD_READ: 'dashboard:read',
    
    // Ventas permissions
    VENTAS_ALL: 'ventas:all',
    VENTAS_READ: 'ventas:read',
    VENTAS_WRITE: 'ventas:write',
    
    // Boletos permissions
    BOLETOS_CREATE: 'boletos:create',
    BOLETOS_READ: 'boletos:read',
    
    // Rollos permissions  
    ROLLOS_CREATE: 'rollos:create',
    ROLLOS_READ: 'rollos:read',
    ROLLOS_UPDATE: 'rollos:update',
    ROLLOS_DELETE: 'rollos:delete',
    ROLLOS_ALL: 'rollos:all',
    
    // Comisiones permissions
    COMISIONES_ALL: 'comisiones:all',
    COMISIONES_READ: 'comisiones:read',
    COMISIONES_WRITE: 'comisiones:write',
    
    // Premiados permissions
    PREMIADOS_ALL: 'premiados:all',
    PREMIADOS_READ: 'premiados:read',
    PREMIADOS_WRITE: 'premiados:write',
    
    // Promedio por boleto permissions (SRS #6)
    PROMEDIO_BOLETO_READ: 'promedio-boleto:read',
    PROMEDIO_BOLETO_WRITE: 'promedio-boleto:write',
    PROMEDIO_BOLETO_ALL: 'promedio-boleto:all',
    
    // Sorteos permissions
    SORTEOS_ALL: 'sorteos:all',
    SORTEOS_READ: 'sorteos:read',
    SORTEOS_WRITE: 'sorteos:write',
    
    // Admin permissions
    ADMIN_ALL: 'admin:all',
    USERS_ALL: 'users:all',
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write'
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role permissions mapping based on legacy system
 */
const operadorPermissions: PermissionName[] = [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.VENTAS_ALL,
    PERMISSIONS.BOLETOS_CREATE,
    PERMISSIONS.BOLETOS_READ,
    PERMISSIONS.ROLLOS_CREATE,
    PERMISSIONS.ROLLOS_READ
];

const supervisorPermissions: PermissionName[] = [
    ...operadorPermissions,
    PERMISSIONS.ROLLOS_UPDATE,
    PERMISSIONS.ROLLOS_DELETE,
    PERMISSIONS.COMISIONES_ALL,
    PERMISSIONS.PREMIADOS_ALL,
    PERMISSIONS.PROMEDIO_BOLETO_ALL,
    PERMISSIONS.SORTEOS_ALL
];

const adminPermissions: PermissionName[] = [
    ...supervisorPermissions,
    PERMISSIONS.ADMIN_ALL,
    PERMISSIONS.USERS_ALL
];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
    [ROLES.OPERADOR]: operadorPermissions,
    [ROLES.SUPERVISOR]: supervisorPermissions,
    [ROLES.ADMIN]: adminPermissions
};

/**
 * Menu access mapping based on legacy system
 */
export const ROLE_MENU_ACCESS: Record<RoleName, string[]> = {
    [ROLES.OPERADOR]: [
        'dashboard',
        'ventas',
        'operacion'
    ],
    [ROLES.SUPERVISOR]: [
        'dashboard',
        'ventas',
        'finanzas',
        'sorteos',
        'operacion'
    ],
    [ROLES.ADMIN]: [
        'all' // Access to all menus
    ]
};

/**
 * Role hierarchy levels
 */
export const ROLE_HIERARCHY: Record<RoleName, number> = {
    [ROLES.OPERADOR]: 1,
    [ROLES.SUPERVISOR]: 2,
    [ROLES.ADMIN]: 3
};

/**
 * User role interface
 */
export interface UserRole {
    level: number;
    name: RoleName;
}

/**
 * User profile with permissions
 */
export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    role: UserRole;
    permissions: PermissionName[];
    menuAccess: string[];
    isActive: boolean;
}

/**
 * Permission utility functions
 */
export class PermissionUtils {
    /**
     * Get user permissions based on role
     */
    static getUserPermissions(role: RoleName): PermissionName[] {
        return ROLE_PERMISSIONS[role] || [];
    }

    /**
     * Get user menu access based on role
     */
    static getUserMenuAccess(role: RoleName): string[] {
        return ROLE_MENU_ACCESS[role] || [];
    }

    /**
     * Check if user has specific permission
     */
    /**
     * Check if user has specific permission
     * Also checks for "all" permissions (e.g., ventas:all includes ventas:read and ventas:write)
     */
    static hasPermission(userPermissions: PermissionName[], permission: PermissionName): boolean {
        // Direct permission match
        if (userPermissions.includes(permission)) {
            return true;
        }
        
        // Check for "all" permissions that would include this specific permission
        const permissionCategory = permission.split(':')[0]; // e.g., "ventas" from "ventas:read"
        const allPermission = `${permissionCategory}:all` as PermissionName;
        
        return userPermissions.includes(allPermission);
    }

    /**
     * Check if user has access to specific menu
     */
    static hasMenuAccess(userMenuAccess: string[], menuId: string): boolean {
        return userMenuAccess.includes('all') || userMenuAccess.includes(menuId);
    }

    /**
     * Check if user has specific role
     */
    static hasRole(userRole: RoleName, role: RoleName): boolean {
        return userRole === role;
    }

    /**
     * Check if user has role level (includes higher roles)
     */
    static hasRoleLevel(userRole: RoleName, requiredRole: RoleName): boolean {
        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }

    /**
     * Create user role object
     */
    static createUserRole(roleName: RoleName): UserRole {
        return {
            level: ROLE_HIERARCHY[roleName] || 1,
            name: roleName
        };
    }

    /**
     * Create user profile with permissions
     */
    static createUserProfile(
        uid: string,
        email: string,
        roleName: RoleName,
        displayName?: string,
        isActive: boolean = true
    ): UserProfile {
        const role = this.createUserRole(roleName);
        const permissions = this.getUserPermissions(roleName);
        const menuAccess = this.getUserMenuAccess(roleName);

        return {
            uid,
            email,
            displayName,
            role,
            permissions,
            menuAccess,
            isActive
        };
    }

    /**
     * Check if user is authorized for a specific action
     */
    static isAuthorized(
        userProfile: UserProfile | null,
        requiredPermission: PermissionName
    ): boolean {
        if (!userProfile || !userProfile.isActive) {
            return false;
        }

        return this.hasPermission(userProfile.permissions, requiredPermission);
    }

    /**
     * Check if user can access a menu item
     */
    static canAccessMenu(
        userProfile: UserProfile | null,
        menuId: string
    ): boolean {
        if (!userProfile || !userProfile.isActive) {
            return false;
        }

        return this.hasMenuAccess(userProfile.menuAccess, menuId);
    }

    /**
     * Get all available permissions for display/admin purposes
     */
    static getAllPermissions(): PermissionName[] {
        return Object.values(PERMISSIONS);
    }

    /**
     * Get all available roles for display/admin purposes
     */
    static getAllRoles(): RoleName[] {
        return Object.values(ROLES);
    }

    /**
     * Get role display name (for UI)
     */
    static getRoleDisplayName(role: RoleName): string {
        const displayNames: Record<RoleName, string> = {
            [ROLES.OPERADOR]: 'Operador',
            [ROLES.SUPERVISOR]: 'Supervisor',
            [ROLES.ADMIN]: 'Administrador'
        };

        return displayNames[role] || role;
    }

    /**
     * Get permission display name (for UI)
     */
    static getPermissionDisplayName(permission: PermissionName): string {
        const displayNames: Partial<Record<PermissionName, string>> = {
            [PERMISSIONS.DASHBOARD_READ]: 'Ver Dashboard',
            [PERMISSIONS.VENTAS_ALL]: 'Gestión Completa de Ventas',
            [PERMISSIONS.VENTAS_READ]: 'Ver Ventas',
            [PERMISSIONS.VENTAS_WRITE]: 'Editar Ventas',
            [PERMISSIONS.BOLETOS_CREATE]: 'Crear Boletos',
            [PERMISSIONS.BOLETOS_READ]: 'Ver Boletos',
            [PERMISSIONS.ROLLOS_CREATE]: 'Crear Rollos',
            [PERMISSIONS.ROLLOS_READ]: 'Ver Rollos',
            [PERMISSIONS.ROLLOS_UPDATE]: 'Editar Rollos',
            [PERMISSIONS.ROLLOS_DELETE]: 'Eliminar Rollos',
            [PERMISSIONS.ROLLOS_ALL]: 'Gestión Completa de Rollos',
            [PERMISSIONS.COMISIONES_ALL]: 'Gestión Completa de Comisiones',
            [PERMISSIONS.COMISIONES_READ]: 'Ver Comisiones',
            [PERMISSIONS.COMISIONES_WRITE]: 'Editar Comisiones',
            [PERMISSIONS.PREMIADOS_ALL]: 'Gestión Completa de Premiados',
            [PERMISSIONS.PREMIADOS_READ]: 'Ver Premiados',
            [PERMISSIONS.PREMIADOS_WRITE]: 'Editar Premiados',
            [PERMISSIONS.PROMEDIO_BOLETO_ALL]: 'Gestión Completa de Promedio por Boleto',
            [PERMISSIONS.PROMEDIO_BOLETO_READ]: 'Ver Promedio por Boleto',
            [PERMISSIONS.PROMEDIO_BOLETO_WRITE]: 'Editar Promedio por Boleto',
            [PERMISSIONS.SORTEOS_ALL]: 'Gestión Completa de Sorteos',
            [PERMISSIONS.SORTEOS_READ]: 'Ver Sorteos',
            [PERMISSIONS.SORTEOS_WRITE]: 'Editar Sorteos',
            [PERMISSIONS.ADMIN_ALL]: 'Administración Completa',
            [PERMISSIONS.USERS_ALL]: 'Gestión Completa de Usuarios',
            [PERMISSIONS.USERS_READ]: 'Ver Usuarios',
            [PERMISSIONS.USERS_WRITE]: 'Editar Usuarios'
        };

        return displayNames[permission] || permission;
    }
}

/**
 * React hooks for permissions (to be used with Redux store)
 */
export const createPermissionHooks = (useSelector: any) => {
    const usePermissions = () => {
        return useSelector((state: any) => ({
            userProfile: state.auth.userProfile,
            isAuthenticated: state.auth.isAuthenticated
        }));
    };

    const useHasPermission = (permission: PermissionName) => {
        const { userProfile } = usePermissions();
        return PermissionUtils.isAuthorized(userProfile, permission);
    };

    const useCanAccessMenu = (menuId: string) => {
        const { userProfile } = usePermissions();
        return PermissionUtils.canAccessMenu(userProfile, menuId);
    };

    const useHasRole = (role: RoleName) => {
        const { userProfile } = usePermissions();
        return userProfile ? PermissionUtils.hasRole(userProfile.role.name, role) : false;
    };

    const useHasRoleLevel = (requiredRole: RoleName) => {
        const { userProfile } = usePermissions();
        return userProfile ? PermissionUtils.hasRoleLevel(userProfile.role.name, requiredRole) : false;
    };

    return {
        usePermissions,
        useHasPermission,
        useCanAccessMenu,
        useHasRole,
        useHasRoleLevel
    };
};

export default PermissionUtils;
