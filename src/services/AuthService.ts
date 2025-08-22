import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { 
  UserProfile, 
  UserRole, 
  RoleName, 
  PermissionName,
  ROLES,
  PermissionUtils 
} from '../utils/permissions'

/**
 * AuthService - Migrated from legacy auth.js
 * Provides Firebase authentication with role-based access control
 * Aligned with SRS.json requirements for user management
 */
export class AuthService {

  /**
   * Initialize auth state listener
   * Migrated from legacy router.js authentication logic
   */
  static async initializeAuth(): Promise<{ user: User; userProfile: UserProfile } | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userProfile = await this.getUserProfile(user.uid)
            if (userProfile) {
              resolve({ user, userProfile })
            } else {
              // Create default profile for new users
              const defaultProfile = await this.createDefaultUserProfile(user)
              resolve({ user, userProfile: defaultProfile })
            }
          } catch (error) {
            resolve(null)
          }
        } else {
          resolve(null)
        }
        unsubscribe()
      })
    })
  }

  /**
   * Sign in with email and password
   * Preserves legacy authentication flow
   */
  static async signIn(email: string, password: string): Promise<{ user: User; userProfile: UserProfile }> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    let userProfile = await this.getUserProfile(user.uid)
    if (!userProfile) {
      userProfile = await this.createDefaultUserProfile(user)
    }

    return { user, userProfile }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    await firebaseSignOut(auth)
  }

  /**
   * Get user profile from Firestore
   * Uses the authorizedUsers collection from Firebase rules
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'authorizedUsers', uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        const roleName = (data.role?.name || ROLES.OPERADOR) as RoleName
        
        // Create complete user profile with permissions from utility
        return PermissionUtils.createUserProfile(
          uid,
          data.email,
          roleName,
          data.displayName,
          data.isActive !== false
        )
      }
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Create default user profile for new users
   * Creates entry in authorizedUsers collection
   */
  private static async createDefaultUserProfile(user: User): Promise<UserProfile> {
    const roleName: RoleName = ROLES.OPERADOR
    
    // Use PermissionUtils to create complete profile
    const userProfile = PermissionUtils.createUserProfile(
      user.uid,
      user.email || '',
      roleName,
      user.displayName || '',
      true
    )

    try {
      await setDoc(doc(db, 'authorizedUsers', user.uid), {
        email: userProfile.email,
        displayName: userProfile.displayName,
        role: userProfile.role,
        isActive: userProfile.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } catch (error) {
    }

    return userProfile
  }

  /**
   * Update user role - Admin functionality
   * Updates role in authorizedUsers collection
   */
  static async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      await setDoc(doc(db, 'authorizedUsers', uid), {
        role,
        updatedAt: new Date(),
      }, { merge: true })
    } catch (error) {
      throw error
    }
  }

  /**
   * Check if current user has permission
   * Uses new permissions system from PermissionUtils
   */
  static hasPermission(userProfile: UserProfile | null, permission: PermissionName): boolean {
    return PermissionUtils.isAuthorized(userProfile, permission)
  }

  /**
   * Check if user can access menu
   * Uses new permissions system from PermissionUtils
   */
  static canAccessMenu(userProfile: UserProfile | null, menuId: string): boolean {
    return PermissionUtils.canAccessMenu(userProfile, menuId)
  }

  /**
   * Get role level for permission hierarchy
   * Preserves legacy role system: operador(1), supervisor(2), admin(3)
   */
  static getRoleLevel(userProfile: UserProfile | null): number {
    return userProfile?.role.level || 0
  }

  /**
   * Check if user has role level (includes higher roles)
   */
  static hasRoleLevel(userProfile: UserProfile | null, requiredRole: RoleName): boolean {
    if (!userProfile) return false
    return PermissionUtils.hasRoleLevel(userProfile.role.name, requiredRole)
  }
}
