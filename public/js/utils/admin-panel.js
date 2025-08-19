/**
 * Administrative Functions
 * Secure admin-only functions for user management
 * Only accessible to users with admin role
 */

import { addAuthorizedUser, getUserRole } from './user-setup.js';
import { getCurrentUser } from './permissions.js';

/**
 * Secure admin function to add users
 * Only works if current user is admin
 */
export async function adminAddUser(userId, email, role, name) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
    }
    
    return await addAuthorizedUser(userId, email, role, name);
}

/**
 * Secure admin function to get user information
 * Only works if current user is admin
 */
export async function adminGetUserRole(userId) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
    }
    
    return await getUserRole(userId);
}

/**
 * Secure admin function to list all authorized users
 * Only works if current user is admin
 */
export async function adminListUsers() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
    }
    
    // Import here to avoid circular dependencies
    const { getAuthorizedUsers } = await import('./permissions.js');
    return await getAuthorizedUsers();
}

/**
 * Admin panel - only expose to authenticated admin users
 */
export function initializeAdminPanel() {
    const currentUser = getCurrentUser();
    
    if (currentUser && currentUser.role === 'admin') {
        // Only expose admin functions to admin users
        if (typeof window !== 'undefined') {
            window.adminAddUser = adminAddUser;
            window.adminGetUserRole = adminGetUserRole;
            window.adminListUsers = adminListUsers;
            
            // Show admin helper in console
            console.info('🔧 Admin panel loaded. Available functions:');
            console.info('• adminAddUser(userId, email, role, name) - Add new user');
            console.info('• adminGetUserRole(userId) - Get user role');
            console.info('• adminListUsers() - List all users');
        }
    }
}

export default {
    adminAddUser,
    adminGetUserRole,
    adminListUsers,
    initializeAdminPanel
};
