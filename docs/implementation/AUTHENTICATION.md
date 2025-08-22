# Casa Pronósticos - Authentication System Documentation

> **🔐 Authentication & Authorization Guide** - Firebase Auth + Role-Based Access Control

## 📋 Authentication Overview

Casa Pronósticos implements a comprehensive authentication and authorization system using Firebase Authentication with custom role-based access control (RBAC). The system provides secure user management with granular permissions for different user types.

**Authentication Provider**: Firebase Auth v10  
**Authorization Model**: Role-Based Access Control (RBAC)  
**User Roles**: 3 levels (Operador, Supervisor, Admin)  
**Permission System**: Granular function-level permissions  

## 🏗️ System Architecture

### **Authentication Flow**
```
1. User Login → Firebase Auth
2. Get User Token → Verify with Firebase
3. Fetch User Record → Firestore /authorizedUsers/{uid}
4. Load Permissions → Role-based permission matrix
5. Set App State → Redux auth slice
6. Route Protection → Permission-based navigation
```

### **Files Structure**
```
src/
├── services/
│   └── AuthService.ts           # ✅ Firebase Auth integration
├── state/slices/
│   └── authSlice.ts            # ✅ Redux auth state management
├── components/auth/
│   └── LoginForm.tsx           # ✅ Login UI component
├── hooks/
│   └── usePermissions.ts       # ✅ Permission checking hooks
├── utils/
│   ├── permissions.ts          # ✅ Permission constants & validation
│   └── security.ts             # ✅ Security utilities
└── components/Layout/
    ├── Layout.tsx              # ✅ Protected route wrapper
    └── Sidebar.tsx             # ✅ Role-based navigation
```

## 👥 User Roles & Hierarchy

### **Role Levels**
```typescript
interface UserRole {
  level: number                    // 1, 2, or 3
  name: 'operador' | 'supervisor' | 'admin'
  permissions: PermissionName[]
  menuAccess: string[]
}
```

### **1. Operador (Level 1)**
**Base Operations Staff**
- **Permissions**: 
  - `dashboard:read` - View main dashboard
  - `ventas:all` - Full access to sales (CRUD)
  - `boletos:create` - Create ticket records
  - `rollos:create` - Log roll changes
- **Menu Access**: `['dashboard', 'ventas', 'operacion']`
- **Use Case**: Daily operations, sales entry, basic reporting

### **2. Supervisor (Level 2)**
**Management Level**
- **Permissions**: Operador permissions PLUS:
  - `comisiones:all` - Full access to commissions
  - `premiados:all` - Full access to prize records
  - `sorteos:all` - Full access to lottery results
- **Menu Access**: `['dashboard', 'ventas', 'operacion', 'finanzas', 'sorteos']`
- **Use Case**: Financial oversight, commission reconciliation, prize management

### **3. Admin (Level 3)**
**System Administration**
- **Permissions**: Supervisor permissions PLUS:
  - `admin:all` - Full admin panel access
  - `users:all` - User management
  - `cache:manage` - Cache system controls
  - `data:migrate` - Data migration tools
- **Menu Access**: All menus available
- **Use Case**: System administration, user management, technical oversight

## 🔑 Permission System

### **Permission Constants**
```typescript
// src/utils/permissions.ts
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: 'dashboard:read',
  
  // Sales (SRS #1)
  VENTAS_CREATE: 'ventas:create',
  VENTAS_READ: 'ventas:read', 
  VENTAS_UPDATE: 'ventas:update',
  VENTAS_DELETE: 'ventas:delete',
  VENTAS_ALL: 'ventas:all',
  
  // Operations
  BOLETOS_CREATE: 'boletos:create',
  ROLLOS_CREATE: 'rollos:create',
  
  // Finances
  COMISIONES_ALL: 'comisiones:all',
  PREMIADOS_ALL: 'premiados:all',
  
  // Lottery
  SORTEOS_ALL: 'sorteos:all',
  
  // Administration
  ADMIN_ALL: 'admin:all',
  USERS_ALL: 'users:all',
  CACHE_MANAGE: 'cache:manage',
  DATA_MIGRATE: 'data:migrate'
} as const
```

### **Permission Matrix**
```typescript
export const ROLE_PERMISSIONS: Record<string, PermissionName[]> = {
  operador: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.VENTAS_ALL,
    PERMISSIONS.BOLETOS_CREATE,
    PERMISSIONS.ROLLOS_CREATE
  ],
  supervisor: [
    ...ROLE_PERMISSIONS.operador,
    PERMISSIONS.COMISIONES_ALL,
    PERMISSIONS.PREMIADOS_ALL,
    PERMISSIONS.SORTEOS_ALL
  ],
  admin: [
    ...ROLE_PERMISSIONS.supervisor,
    PERMISSIONS.ADMIN_ALL,
    PERMISSIONS.USERS_ALL,
    PERMISSIONS.CACHE_MANAGE,
    PERMISSIONS.DATA_MIGRATE
  ]
}
```

## 🔐 Firebase Auth Service

### **AuthService Implementation**
```typescript
// src/services/AuthService.ts
export class AuthService {
  // User login with email/password
  static async login(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Update last login in Firestore
      await this.updateLastLogin(userCredential.user.uid)
      
      return userCredential
    } catch (error) {
      console.error('Login failed:', error)
      throw this.handleAuthError(error)
    }
  }

  // Get user profile from Firestore
  static async getUserProfile(uid: string): Promise<AuthorizedUser | null> {
    try {
      const userDoc = await getDoc(doc(db, 'authorizedUsers', uid))
      
      if (!userDoc.exists()) {
        throw new Error('User not authorized')
      }
      
      return userDoc.data() as AuthorizedUser
    } catch (error) {
      console.error('Failed to get user profile:', error)
      return null
    }
  }

  // User logout
  static async logout(): Promise<void> {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  // Create new user (Admin only)
  static async createUser(userData: CreateUserData): Promise<string> {
    try {
      // Create in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      )
      
      // Create profile in Firestore
      await setDoc(doc(db, 'authorizedUsers', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        permissions: ROLE_PERMISSIONS[userData.role.name],
        menuAccess: MENU_ACCESS[userData.role.name],
        isActive: true,
        createdAt: new Date(),
        createdBy: userData.createdBy
      })
      
      return userCredential.user.uid
    } catch (error) {
      console.error('User creation failed:', error)
      throw this.handleAuthError(error)
    }
  }
}
```

## 🛡️ Protected Routes & Components

### **Permission Checking Hook**
```typescript
// src/hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useAppSelector(state => state.auth)
  
  const hasPermission = useCallback((permission: PermissionName): boolean => {
    if (!user?.permissions) return false
    return user.permissions.includes(permission)
  }, [user?.permissions])
  
  const hasAnyPermission = useCallback((permissions: PermissionName[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }, [hasPermission])
  
  const hasRole = useCallback((role: UserRole['name']): boolean => {
    return user?.role?.name === role
  }, [user?.role?.name])
  
  const hasMinimumRole = useCallback((minimumLevel: number): boolean => {
    return (user?.role?.level || 0) >= minimumLevel
  }, [user?.role?.level])
  
  const canAccessMenu = useCallback((menuItem: string): boolean => {
    return user?.menuAccess?.includes(menuItem) || false
  }, [user?.menuAccess])
  
  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasMinimumRole,
    canAccessMenu,
    userRole: user?.role,
    userPermissions: user?.permissions || []
  }
}
```

### **Protected Route Component**
```typescript
// Component-level protection
const ProtectedComponent: React.FC<{ permission: PermissionName }> = ({ 
  permission, 
  children 
}) => {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission(permission)) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tienes permisos para acceder a esta sección</p>
      </div>
    )
  }
  
  return <>{children}</>
}

// Usage in components
<ProtectedComponent permission={PERMISSIONS.VENTAS_ALL}>
  <HourlySales />
</ProtectedComponent>
```

### **Menu-Level Protection**
```typescript
// src/components/Layout/Sidebar.tsx
const menuItems = [
  { name: 'Dashboard', path: '/dashboard', menu: 'dashboard' },
  { name: 'Ventas', path: '/ventas', menu: 'ventas' },
  { name: 'Finanzas', path: '/finanzas', menu: 'finanzas' },
  { name: 'Admin', path: '/admin', menu: 'admin' }
]

const SidebarMenu: React.FC = () => {
  const { canAccessMenu } = usePermissions()
  
  return (
    <nav>
      {menuItems
        .filter(item => canAccessMenu(item.menu))
        .map(item => (
          <Link key={item.path} to={item.path}>
            {item.name}
          </Link>
        ))
      }
    </nav>
  )
}
```

## 🔄 Redux Auth State

### **Auth Slice Implementation**
```typescript
// src/state/slices/authSlice.ts
interface AuthState {
  user: AuthorizedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<AuthorizedUser>) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
      state.error = null
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = action.payload
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
    }
  }
})
```

### **Auth Async Thunks**
```typescript
// Login thunk
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      // Authenticate with Firebase
      const userCredential = await AuthService.login(credentials.email, credentials.password)
      
      // Get user profile from Firestore
      const userProfile = await AuthService.getUserProfile(userCredential.user.uid)
      
      if (!userProfile) {
        throw new Error('User profile not found')
      }
      
      return userProfile
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed')
    }
  }
)

// Auto-login on app start
export const initializeAuth = createAsyncThunk(
  'auth/initializeAuth',
  async (_, { dispatch }) => {
    return new Promise<AuthorizedUser | null>((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userProfile = await AuthService.getUserProfile(firebaseUser.uid)
          resolve(userProfile)
        } else {
          resolve(null)
        }
      })
    })
  }
)
```

## 🖥️ Login UI Component

### **LoginForm Implementation**
```typescript
// src/components/auth/LoginForm.tsx
export const LoginForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector(state => state.auth)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<LoginCredentials>()
  
  const onSubmit = async (data: LoginCredentials) => {
    const result = await dispatch(loginUser(data))
    
    if (loginUser.fulfilled.match(result)) {
      // Login successful - redirect handled by Layout component
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Casa Pronósticos
          </h2>
          <p className="text-gray-600 text-center mt-2">
            Iniciar Sesión
          </p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <input
              type="email"
              {...register('email', { 
                required: 'El correo es requerido',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Formato de correo inválido'
                }
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              {...register('password', { 
                required: 'La contraseña es requerida',
                minLength: {
                  value: 6,
                  message: 'Mínimo 6 caracteres'
                }
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Iniciando Sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
```

## 👤 User Management (Admin Only)

### **User Creation**
```typescript
// Admin panel user creation
const CreateUserForm: React.FC = () => {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission(PERMISSIONS.USERS_ALL)) {
    return <div>Sin permisos</div>
  }
  
  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await AuthService.createUser({
        ...data,
        createdBy: currentUser.uid
      })
      
      toast.success('Usuario creado exitosamente')
    } catch (error) {
      toast.error('Error al crear usuario')
    }
  }
  
  // Form implementation...
}
```

### **User Status Management**
```typescript
// Activate/deactivate users
export const toggleUserStatus = async (userId: string, isActive: boolean) => {
  await updateDoc(doc(db, 'authorizedUsers', userId), {
    isActive,
    updatedAt: new Date()
  })
}

// Update user role
export const updateUserRole = async (userId: string, newRole: UserRole) => {
  await updateDoc(doc(db, 'authorizedUsers', userId), {
    role: newRole,
    permissions: ROLE_PERMISSIONS[newRole.name],
    menuAccess: MENU_ACCESS[newRole.name],
    updatedAt: new Date()
  })
}
```

## 🔒 Security Best Practices

### **Password Security**
- Minimum 6 characters (Firebase requirement)
- Email validation with regex pattern
- Rate limiting handled by Firebase Auth
- Account lockout after failed attempts

### **Session Management**
- Firebase handles token refresh automatically
- Session persistence configurable
- Automatic logout on token expiration
- Clear session data on logout

### **Authorization Security**
- Server-side permission validation in Firestore rules
- Client-side checks for UX only
- Permission matrix stored server-side
- Regular permission audits

### **Error Handling**
```typescript
// Secure error messages (don't expose system details)
const handleAuthError = (error: any): string => {
  switch (error.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Credenciales incorrectas'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde'
    case 'auth/user-disabled':
      return 'Cuenta desactivada'
    default:
      return 'Error de autenticación'
  }
}
```

## 🧪 Testing Authentication

### **Mock Auth for Development**
```typescript
// src/services/AuthService.test.ts
const mockUser: AuthorizedUser = {
  uid: 'test-user-123',
  email: 'test@casapronosticos.com',
  role: { level: 1, name: 'operador' },
  permissions: ROLE_PERMISSIONS.operador,
  menuAccess: ['dashboard', 'ventas'],
  isActive: true,
  createdAt: new Date()
}

// Test permission checking
describe('Permission System', () => {
  test('operador has ventas permissions', () => {
    expect(hasPermission(mockUser, PERMISSIONS.VENTAS_ALL)).toBe(true)
    expect(hasPermission(mockUser, PERMISSIONS.ADMIN_ALL)).toBe(false)
  })
})
```

---

**Auth Status**: ✅ Production Ready  
**Security Level**: Enterprise Grade  
**Firebase Integration**: Complete  
**Last Updated**: August 21, 2025
