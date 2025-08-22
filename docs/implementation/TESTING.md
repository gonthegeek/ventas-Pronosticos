# Casa Pronósticos - Testing Guide

> **🧪 Testing Strategy** - Comprehensive testing with Vitest + React Testing Library

## 📋 Testing Overview

Casa Pronósticos implements a comprehensive testing strategy to ensure reliability, maintainability, and bug prevention. The testing suite covers unit tests, integration tests, and end-to-end testing with modern tools optimized for React and TypeScript.

**Testing Framework**: Vitest (faster Jest alternative)  
**Component Testing**: React Testing Library  
**E2E Testing**: Playwright (future implementation)  
**Coverage Target**: >80% code coverage for critical paths  

## 🏗️ Testing Architecture

### **Testing Stack**
```json
// package.json testing dependencies
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "jsdom": "^23.0.0",
    "msw": "^2.0.0",
    "playwright": "^1.40.0"
  }
}
```

### **Test File Structure**
```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── __tests__/
│   │       ├── LoginForm.test.tsx      # Component tests
│   │       └── LoginForm.integration.test.tsx
├── services/
│   ├── AuthService.ts
│   ├── SalesService.ts
│   └── __tests__/
│       ├── AuthService.test.ts         # Service unit tests
│       ├── SalesService.test.ts
│       └── CacheService.test.ts
├── utils/
│   ├── permissions.ts
│   └── __tests__/
│       ├── permissions.test.ts         # Utility tests
│       └── timezone.test.ts
├── state/
│   ├── slices/
│   │   ├── authSlice.ts
│   │   └── __tests__/
│   │       ├── authSlice.test.ts       # Redux slice tests
│   │       └── salesSlice.test.ts
└── __tests__/
    ├── setup.ts                        # Test setup
    ├── mocks/                          # Global mocks
    │   ├── firebase.ts
    │   ├── authService.ts
    │   └── salesData.ts
    └── e2e/                            # E2E tests
        ├── auth.spec.ts
        ├── sales.spec.ts
        └── dashboard.spec.ts
```

## ⚙️ Test Configuration

### **Vitest Configuration**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/**/*.test.{ts,tsx}',
        'src/vite-env.d.ts',
        'src/main.tsx'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Test patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    
    // Mock configuration
    globals: true,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true
  },
  
  // Path resolution for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
      '@state': resolve(__dirname, './src/state')
    }
  }
})
```

### **Test Setup**
```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase
vi.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  app: {}
}))

// Mock environment variables
vi.mock('../config/env', () => ({
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_PROJECT_ID: 'test-project'
}))

// Global test utilities
global.mockUser = {
  uid: 'test-user-123',
  email: 'test@casapronosticos.com',
  role: { level: 1, name: 'operador' },
  permissions: ['dashboard:read', 'ventas:all'],
  menuAccess: ['dashboard', 'ventas'],
  isActive: true,
  createdAt: new Date('2025-01-01')
}

global.mockSalesData = [
  {
    id: 'sale-1',
    date: '2025-08-21',
    hour: 14,
    machineId: '76',
    amount: 1250.50,
    operatorId: 'test-user-123',
    timestamp: new Date('2025-08-21T14:00:00Z'),
    createdAt: new Date('2025-08-21T14:05:00Z')
  }
]

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

## 🧪 Testing Patterns

### **Component Testing**
```typescript
// src/components/auth/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { LoginForm } from '../LoginForm'
import authSlice from '@state/slices/authSlice'
import { vi } from 'vitest'

// Mock AuthService
vi.mock('@services/AuthService', () => ({
  AuthService: {
    login: vi.fn()
  }
}))

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...initialState
      }
    }
  })
}

const renderWithRedux = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState)
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  }
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders login form fields', () => {
    renderWithRedux(<LoginForm />)
    
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  test('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithRedux(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    await user.click(submitButton)
    
    expect(screen.getByText(/el correo es requerido/i)).toBeInTheDocument()
    expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument()
  })

  test('validates email format', async () => {
    const user = userEvent.setup()
    renderWithRedux(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/correo electrónico/i)
    await user.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/formato de correo inválido/i)).toBeInTheDocument()
  })

  test('submits form with valid data', async () => {
    const mockLogin = vi.mocked(AuthService.login)
    mockLogin.mockResolvedValue({ user: { uid: 'test-uid' } } as any)
    
    const user = userEvent.setup()
    renderWithRedux(<LoginForm />)
    
    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  test('displays loading state during submission', async () => {
    const mockLogin = vi.mocked(AuthService.login)
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    const user = userEvent.setup()
    renderWithRedux(<LoginForm />)
    
    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    
    expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  test('displays error message on failed login', async () => {
    const mockLogin = vi.mocked(AuthService.login)
    mockLogin.mockRejectedValue(new Error('Credenciales incorrectas'))
    
    const user = userEvent.setup()
    const { store } = renderWithRedux(<LoginForm />)
    
    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument()
    })
  })
})
```

### **Service Testing**
```typescript
// src/services/__tests__/SalesService.test.ts
import { SalesService } from '../SalesService'
import { collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { vi } from 'vitest'

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}))

vi.mock('../firebase', () => ({
  db: {}
}))

describe('SalesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSale', () => {
    test('creates sale with correct data structure', async () => {
      const mockAddDoc = vi.mocked(addDoc)
      mockAddDoc.mockResolvedValue({ id: 'new-sale-id' } as any)

      const saleData = {
        date: '2025-08-21',
        hour: 14,
        machineId: '76' as const,
        amount: 1250.50,
        operatorId: 'user-123'
      }

      const result = await SalesService.createSale(saleData)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(), // collection reference
        expect.objectContaining({
          ...saleData,
          timestamp: expect.any(Date),
          createdAt: expect.any(Date),
          yearMonth: '2025-08'
        })
      )

      expect(result).toEqual(
        expect.objectContaining({
          id: 'new-sale-id',
          ...saleData
        })
      )
    })

    test('generates correct collection path', async () => {
      const mockCollection = vi.mocked(collection)
      mockCollection.mockReturnValue({} as any)

      await SalesService.createSale({
        date: '2025-08-21',
        hour: 14,
        machineId: '76',
        amount: 100,
        operatorId: 'user-123'
      })

      expect(mockCollection).toHaveBeenCalledWith(
        {}, // db
        'data/sales/2025/08/21'
      )
    })

    test('handles errors appropriately', async () => {
      const mockAddDoc = vi.mocked(addDoc)
      mockAddDoc.mockRejectedValue(new Error('Firebase error'))

      await expect(SalesService.createSale({
        date: '2025-08-21',
        hour: 14,
        machineId: '76',
        amount: 100,
        operatorId: 'user-123'
      })).rejects.toThrow('Error creating sale')
    })
  })

  describe('getSalesByDateRange', () => {
    test('fetches sales for date range', async () => {
      const mockGetDocs = vi.mocked(getDocs)
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'sale-1',
            data: () => mockSalesData[0]
          }
        ]
      } as any)

      const result = await SalesService.getSalesByDateRange(
        '2025-08-21',
        '2025-08-21',
        '76'
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'sale-1',
          machineId: '76'
        })
      )
    })

    test('handles multiple date collections', async () => {
      const mockGetDocs = vi.mocked(getDocs)
      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ id: 'sale-1', data: () => mockSalesData[0] }] } as any)
        .mockResolvedValueOnce({ docs: [{ id: 'sale-2', data: () => mockSalesData[0] }] } as any)

      const result = await SalesService.getSalesByDateRange(
        '2025-08-21',
        '2025-08-22',
        'all'
      )

      expect(mockGetDocs).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
    })
  })
})
```

### **Redux Slice Testing**
```typescript
// src/state/slices/__tests__/authSlice.test.ts
import authSlice, { loginUser, logoutUser } from '../authSlice'
import { configureStore } from '@reduxjs/toolkit'

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    lastActivity: null,
    sessionExpiry: null,
    permissionsCache: {}
  }

  test('should return initial state', () => {
    expect(authSlice.reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  test('should handle loginStart', () => {
    const actual = authSlice.reducer(initialState, authSlice.actions.loginStart())
    expect(actual.isLoading).toBe(true)
    expect(actual.error).toBe(null)
  })

  test('should handle loginSuccess', () => {
    const user = global.mockUser
    const actual = authSlice.reducer(
      initialState,
      authSlice.actions.loginSuccess(user)
    )

    expect(actual.user).toEqual(user)
    expect(actual.isAuthenticated).toBe(true)
    expect(actual.isLoading).toBe(false)
    expect(actual.error).toBe(null)
    expect(actual.lastActivity).toBeTypeOf('number')
    expect(actual.permissionsCache).toEqual({
      'dashboard:read': true,
      'ventas:all': true
    })
  })

  test('should handle loginFailure', () => {
    const error = 'Invalid credentials'
    const actual = authSlice.reducer(
      initialState,
      authSlice.actions.loginFailure(error)
    )

    expect(actual.user).toBe(null)
    expect(actual.isAuthenticated).toBe(false)
    expect(actual.isLoading).toBe(false)
    expect(actual.error).toBe(error)
    expect(actual.permissionsCache).toEqual({})
  })

  test('should handle logout', () => {
    const authenticatedState = {
      ...initialState,
      user: global.mockUser,
      isAuthenticated: true,
      permissionsCache: { 'ventas:all': true }
    }

    const actual = authSlice.reducer(authenticatedState, authSlice.actions.logout())

    expect(actual).toEqual(initialState)
  })
})

describe('authSlice async thunks', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice.reducer
      }
    })
  })

  test('loginUser success', async () => {
    // Mock AuthService
    vi.doMock('@services/AuthService', () => ({
      AuthService: {
        login: vi.fn().mockResolvedValue({ user: { uid: 'test-uid' } }),
        getUserProfile: vi.fn().mockResolvedValue(global.mockUser)
      }
    }))

    await store.dispatch(loginUser({
      email: 'test@example.com',
      password: 'password123'
    }))

    const state = store.getState().auth
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(global.mockUser)
    expect(state.error).toBe(null)
  })

  test('loginUser failure', async () => {
    vi.doMock('@services/AuthService', () => ({
      AuthService: {
        login: vi.fn().mockRejectedValue(new Error('Invalid credentials'))
      }
    }))

    await store.dispatch(loginUser({
      email: 'test@example.com',
      password: 'wrongpassword'
    }))

    const state = store.getState().auth
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBe(null)
    expect(state.error).toBe('Invalid credentials')
  })
})
```

### **Utility Testing**
```typescript
// src/utils/__tests__/permissions.test.ts
import { hasPermission, hasRole, canAccessMenu, PERMISSIONS, ROLE_PERMISSIONS } from '../permissions'

describe('permissions utilities', () => {
  const operadorUser = {
    ...global.mockUser,
    role: { level: 1, name: 'operador' as const },
    permissions: ROLE_PERMISSIONS.operador,
    menuAccess: ['dashboard', 'ventas']
  }

  const adminUser = {
    ...global.mockUser,
    role: { level: 3, name: 'admin' as const },
    permissions: ROLE_PERMISSIONS.admin,
    menuAccess: ['dashboard', 'ventas', 'admin']
  }

  describe('hasPermission', () => {
    test('returns true for user with permission', () => {
      expect(hasPermission(operadorUser, PERMISSIONS.VENTAS_ALL)).toBe(true)
    })

    test('returns false for user without permission', () => {
      expect(hasPermission(operadorUser, PERMISSIONS.ADMIN_ALL)).toBe(false)
    })

    test('returns false for null user', () => {
      expect(hasPermission(null, PERMISSIONS.VENTAS_ALL)).toBe(false)
    })
  })

  describe('hasRole', () => {
    test('returns true for correct role', () => {
      expect(hasRole(operadorUser, 'operador')).toBe(true)
    })

    test('returns false for incorrect role', () => {
      expect(hasRole(operadorUser, 'admin')).toBe(false)
    })
  })

  describe('canAccessMenu', () => {
    test('returns true for accessible menu', () => {
      expect(canAccessMenu(operadorUser, 'ventas')).toBe(true)
    })

    test('returns false for inaccessible menu', () => {
      expect(canAccessMenu(operadorUser, 'admin')).toBe(false)
    })
  })

  describe('role hierarchy', () => {
    test('admin has all permissions', () => {
      expect(hasPermission(adminUser, PERMISSIONS.VENTAS_ALL)).toBe(true)
      expect(hasPermission(adminUser, PERMISSIONS.ADMIN_ALL)).toBe(true)
    })

    test('operador has limited permissions', () => {
      expect(hasPermission(operadorUser, PERMISSIONS.VENTAS_ALL)).toBe(true)
      expect(hasPermission(operadorUser, PERMISSIONS.ADMIN_ALL)).toBe(false)
    })
  })
})
```

## 🔧 Mock Services

### **Firebase Mock**
```typescript
// src/__tests__/mocks/firebase.ts
import { vi } from 'vitest'

export const mockFirebaseApp = {}

export const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}

export const mockDb = {}

export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date())
}

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => mockFirebaseApp)
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}))

vi.mock('firebase/firestore', () => mockFirestore)
```

### **MSW API Mocking** (Future Enhancement)
```typescript
// src/__tests__/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  // Mock Firebase REST API if needed
  rest.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', (req, res, ctx) => {
    return res(
      ctx.json({
        idToken: 'mock-id-token',
        refreshToken: 'mock-refresh-token',
        localId: 'mock-user-id'
      })
    )
  })
]
```

## 📊 Integration Testing

### **Component + Redux Integration**
```typescript
// src/modules/sales/__tests__/HourlySales.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { HourlySales } from '../HourlySales'
import authSlice from '@state/slices/authSlice'
import salesSlice from '@state/slices/salesSlice'

const createIntegrationStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      sales: salesSlice.reducer
    },
    preloadedState: {
      auth: {
        user: global.mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null
      },
      sales: {
        sales: global.mockSalesData,
        isLoading: false,
        error: null,
        filters: {
          dateRange: { start: '2025-08-21', end: '2025-08-21' },
          machineId: 'all'
        }
      }
    }
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const store = createIntegrationStore()
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    ),
    store
  }
}

describe('HourlySales Integration', () => {
  test('displays sales data from Redux store', async () => {
    renderWithProviders(<HourlySales />)
    
    await waitFor(() => {
      expect(screen.getByText(/\$1,250\.50/)).toBeInTheDocument()
      expect(screen.getByText(/máquina 76/i)).toBeInTheDocument()
    })
  })

  test('filters sales by machine', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HourlySales />)
    
    const machineFilter = screen.getByLabelText(/máquina/i)
    await user.selectOptions(machineFilter, '76')
    
    await waitFor(() => {
      expect(screen.getByText(/máquina 76/i)).toBeInTheDocument()
      expect(screen.queryByText(/máquina 79/i)).not.toBeInTheDocument()
    })
  })

  test('creates new sale', async () => {
    const user = userEvent.setup()
    const { store } = renderWithProviders(<HourlySales />)
    
    // Open create modal
    await user.click(screen.getByText(/nueva venta/i))
    
    // Fill form
    await user.type(screen.getByLabelText(/monto/i), '500.00')
    await user.selectOptions(screen.getByLabelText(/máquina/i), '79')
    
    // Submit
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    
    await waitFor(() => {
      const state = store.getState().sales
      expect(state.sales).toHaveLength(2)
      expect(state.sales.find(s => s.amount === 500)).toBeDefined()
    })
  })
})
```

## 🎯 Test Scripts

### **Package.json Scripts**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### **Coverage Configuration**
```typescript
// Coverage thresholds in vitest.config.ts
coverage: {
  thresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Critical paths require higher coverage
    'src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/utils/permissions.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
}
```

## 🎯 Testing Best Practices

### **Component Testing**
1. **Test User Interactions**: Focus on what users can see and do
2. **Avoid Implementation Details**: Test behavior, not internal state
3. **Use Realistic Data**: Test with data similar to production
4. **Mock External Dependencies**: Keep tests isolated and fast
5. **Test Accessibility**: Verify screen reader compatibility

### **Service Testing**
1. **Test Error Scenarios**: Verify error handling and recovery
2. **Mock Firebase**: Don't hit real database in tests
3. **Test Edge Cases**: Empty responses, malformed data, etc.
4. **Verify Data Transformation**: Ensure data is properly formatted
5. **Test Async Operations**: Verify promises resolve/reject correctly

### **Integration Testing**
1. **Test Real User Flows**: Complete user journeys
2. **Test Component Communication**: Redux actions and state updates
3. **Test Route Protection**: Verify authentication and authorization
4. **Test Form Validation**: End-to-end form submission
5. **Test Error Boundaries**: Verify graceful error handling

### **Performance Testing**
1. **Test Rendering Performance**: Avoid unnecessary re-renders
2. **Test Memory Leaks**: Verify cleanup in useEffect
3. **Test Bundle Size**: Keep components lightweight
4. **Test Cache Efficiency**: Verify cache hit rates
5. **Test Load Times**: Measure component mount times

---

**Testing Status**: 🔄 Framework Ready | 📝 Tests Planned  
**Coverage Target**: >80% for critical paths  
**Tools**: Vitest + React Testing Library + Playwright  
**Last Updated**: August 21, 2025
