/**
 * User Setup Utility
 * Script to add users and assign roles to the authorizedUsers collection
 * Run this in the browser console to setup initial users
 */

import { doc, setDoc, getDoc } from '../firebase-firestore-wrapper.js';
import { db } from '../auth.js';

/**
 * Add or update a user in the authorizedUsers collection
 * @param {string} userId - The Firebase Auth UID of the user
 * @param {string} email - User's email address
 * @param {string} role - Role: 'operador', 'supervisor', or 'admin'
 * @param {string} name - User's display name
 */
export async function addAuthorizedUser(userId, email, role, name) {
    try {
        const appId = '1:154235122109:web:3747377946727b2081e2d4';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/config/authorizedUsers`, userId);
        
        const userData = {
            email: email,
            role: role,
            name: name,
            createdAt: new Date(),
            updatedAt: new Date(),
            active: true
        };
        
        await setDoc(userDocRef, userData, { merge: true });
        console.log(`✅ User ${email} added with role: ${role}`);
        return true;
    } catch (error) {
        console.error('❌ Error adding user:', error);
        return false;
    }
}

/**
 * Get user role from authorizedUsers collection
 * @param {string} userId - The Firebase Auth UID
 */
export async function getUserRole(userId) {
    try {
        const appId = '1:154235122109:web:3747377946727b2081e2d4';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/config/authorizedUsers`, userId);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            return userSnap.data();
        } else {
            console.log('User not found in authorized users');
            return null;
        }
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

/**
 * Setup initial admin user
 * Call this function with your own user ID to make yourself admin
 */
export async function setupInitialAdmin() {
    // Get current authenticated user
    const currentUser = window.auth?.currentUser;
    if (!currentUser) {
        console.error('❌ No authenticated user found. Please login first.');
        return false;
    }
    
    const confirm = window.confirm(`Add ${currentUser.email} as admin user?`);
    if (!confirm) {
        console.log('❌ Setup cancelled by user');
        return false;
    }
    
    const success = await addAuthorizedUser(
        currentUser.uid,
        currentUser.email,
        'admin',
        currentUser.displayName || currentUser.email.split('@')[0]
    );
    
    if (success) {
        alert('✅ Admin user created successfully! Please refresh the page to apply changes.');
    }
    
    return success;
}

/**
 * Quick setup function for demo users
 * Only use for testing/demo purposes
 */
export async function setupDemoUsers() {
    const currentUser = window.auth?.currentUser;
    if (!currentUser) {
        console.error('❌ No authenticated user found. Please login first.');
        return;
    }
    
    // Setup current user as admin
    await addAuthorizedUser(
        currentUser.uid,
        currentUser.email,
        'admin',
        'Admin User'
    );
    
    console.log('✅ Demo users setup complete!');
    console.log('📝 To add more users, use: addAuthorizedUser(userId, email, role, name)');
    console.log('📝 Available roles: "operador", "supervisor", "admin"');
}

// Make functions available globally for console usage
if (typeof window !== 'undefined') {
    window.addAuthorizedUser = addAuthorizedUser;
    window.getUserRole = getUserRole;
    window.setupInitialAdmin = setupInitialAdmin;
    window.setupDemoUsers = setupDemoUsers;
}

export default {
    addAuthorizedUser,
    getUserRole,
    setupInitialAdmin,
    setupDemoUsers
};
