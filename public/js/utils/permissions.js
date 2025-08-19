/**
 * Permissions and Roles System
 * Implements SRS admin panel requirements and refactor-plan.json role structure
 * Task 1.3: Sistema de roles básico
 */

import { collection, doc, getDoc, getDocs } from '../firebase-firestore-wrapper.js';
import { db } from '../auth.js';
import { getUserId } from '../state.js';

/**
 * Role definitions based on refactor-plan.json
 */
export const ROLES = {
    OPERADOR: 'operador',
    SUPERVISOR: 'supervisor', 
    ADMIN: 'admin'
};

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
    
    // Comisiones permissions
    COMISIONES_ALL: 'comisiones:all',
    COMISIONES_READ: 'comisiones:read',
    COMISIONES_WRITE: 'comisiones:write',
    
    // Premiados permissions
    PREMIADOS_ALL: 'premiados:all',
    PREMIADOS_READ: 'premiados:read',
    PREMIADOS_WRITE: 'premiados:write',
    
    // Sorteos permissions
    SORTEOS_ALL: 'sorteos:all',
    SORTEOS_READ: 'sorteos:read',
    SORTEOS_WRITE: 'sorteos:write',
    
    // Admin permissions
    ADMIN_ALL: 'admin:all',
    USERS_ALL: 'users:all',
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write'
};

/**
 * Role permissions mapping based on refactor-plan.json
 */
export const ROLE_PERMISSIONS = {
    [ROLES.OPERADOR]: [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.VENTAS_ALL,
        PERMISSIONS.BOLETOS_CREATE,
        PERMISSIONS.BOLETOS_READ,
        PERMISSIONS.ROLLOS_CREATE,
        PERMISSIONS.ROLLOS_READ
    ],
    [ROLES.SUPERVISOR]: [
        // Inherits all operador permissions
        ...ROLE_PERMISSIONS?.[ROLES.OPERADOR] || [],
        PERMISSIONS.COMISIONES_ALL,
        PERMISSIONS.PREMIADOS_ALL,
        PERMISSIONS.SORTEOS_ALL
    ],
    [ROLES.ADMIN]: [
        // Inherits all supervisor permissions
        ...ROLE_PERMISSIONS?.[ROLES.SUPERVISOR] || [],
        PERMISSIONS.ADMIN_ALL,
        PERMISSIONS.USERS_ALL
    ]
};

// Fix circular reference by defining operador permissions separately
ROLE_PERMISSIONS[ROLES.OPERADOR] = [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.VENTAS_ALL,
    PERMISSIONS.BOLETOS_CREATE,
    PERMISSIONS.BOLETOS_READ,
    PERMISSIONS.ROLLOS_CREATE,
    PERMISSIONS.ROLLOS_READ
];

ROLE_PERMISSIONS[ROLES.SUPERVISOR] = [
    ...ROLE_PERMISSIONS[ROLES.OPERADOR],
    PERMISSIONS.COMISIONES_ALL,
    PERMISSIONS.PREMIADOS_ALL,
    PERMISSIONS.SORTEOS_ALL
];

ROLE_PERMISSIONS[ROLES.ADMIN] = [
    ...ROLE_PERMISSIONS[ROLES.SUPERVISOR],
    PERMISSIONS.ADMIN_ALL,
    PERMISSIONS.USERS_ALL
];

/**
 * Menu access mapping based on refactor-plan.json
 */
export const ROLE_MENU_ACCESS = {
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
 * Current user state
 */
let currentUser = {
    uid: null,
    email: null,
    role: null,
    permissions: [],
    menuAccess: []
};

/**
 * Initialize permissions system
 */
export async function initializePermissions() {
    console.log('🔐 Initializing permissions system...');
    
    const userId = getUserId();
    if (!userId) {
        console.log('🔐 No authenticated user, skipping permission initialization');
        return false;
    }
    
    try {
        const userRole = await getUserRole(userId);
        if (userRole) {
            currentUser = {
                uid: userId,
                email: getUserEmail(),
                role: userRole,
                permissions: getUserPermissions(userRole),
                menuAccess: getUserMenuAccess(userRole)
            };
            
            console.log(`🔐 User permissions initialized: ${userRole}`, currentUser.permissions);
            return true;
        } else {
            console.log('🔐 User not authorized or role not found');
            return false;
        }
    } catch (error) {
        console.error('🔐 Error initializing permissions:', error);
        return false;
    }
}

/**
 * Get user role from authorizedUsers collection
 */
export async function getUserRole(userId) {
    try {
        const appId = '1:154235122109:web:3747377946727b2081e2d4';
        const userDoc = doc(db, `artifacts/${appId}/public/data/config/authorizedUsers`, userId);
        const userSnap = await getDoc(userDoc);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            return userData.role || ROLES.OPERADOR; // Default to operador if no role specified
        }
        
        return null; // User not authorized
    } catch (error) {
        console.error('🔐 Error getting user role:', error);
        return null;
    }
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get user menu access based on role
 */
export function getUserMenuAccess(role) {
    return ROLE_MENU_ACCESS[role] || [];
}

/**
 * Check if current user has specific permission
 */
export function hasPermission(permission) {
    return currentUser.permissions.includes(permission);
}

/**
 * Check if current user has access to specific menu
 */
export function hasMenuAccess(menuId) {
    return currentUser.menuAccess.includes('all') || currentUser.menuAccess.includes(menuId);
}

/**
 * Check if current user has specific role
 */
export function hasRole(role) {
    return currentUser.role === role;
}

/**
 * Check if current user has role level (includes higher roles)
 */
export function hasRoleLevel(requiredRole) {
    const roleHierarchy = {
        [ROLES.OPERADOR]: 1,
        [ROLES.SUPERVISOR]: 2,
        [ROLES.ADMIN]: 3
    };
    
    const userLevel = roleHierarchy[currentUser.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
}

/**
 * Get current user info
 */
export function getCurrentUser() {
    return { ...currentUser };
}

/**
 * Get user email (helper function)
 */
function getUserEmail() {
    // Get email from Firebase Auth
    if (typeof window !== 'undefined' && window.auth?.currentUser) {
        return window.auth.currentUser.email || 'user@example.com';
    }
    return 'user@example.com';
}

/**
 * Get all authorized users (for admin functionality)
 */
export async function getAllAuthorizedUsers() {
    try {
        const appId = '1:154235122109:web:3747377946727b2081e2d4';
        const usersCollection = collection(db, `artifacts/${appId}/public/data/config/authorizedUsers`);
        const usersSnap = await getDocs(usersCollection);
        
        const users = [];
        usersSnap.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return users;
    } catch (error) {
        console.error('🔐 Error getting authorized users:', error);
        return [];
    }
}

/**
 * Check if user is authorized (exists in authorizedUsers collection)
 */
export async function isUserAuthorized(userId) {
    const role = await getUserRole(userId);
    return role !== null;
}

/**
 * Middleware function for route protection
 */
export function requirePermission(permission) {
    return () => {
        if (!hasPermission(permission)) {
            console.warn(`🔐 Access denied: Missing permission ${permission}`);
            return false;
        }
        return true;
    };
}

/**
 * Middleware function for role-based route protection
 */
export function requireRole(role) {
    return () => {
        if (!hasRoleLevel(role)) {
            console.warn(`🔐 Access denied: Requires role ${role}, user has ${currentUser.role}`);
            return false;
        }
        return true;
    };
}

/**
 * Clear permissions (for logout)
 */
export function clearPermissions() {
    currentUser = {
        uid: null,
        email: null,
        role: null,
        permissions: [],
        menuAccess: []
    };
    console.log('🔐 Permissions cleared');
}
