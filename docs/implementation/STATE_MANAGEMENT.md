# Casa Pronósticos - State Management Documentation

> **🔄 Redux State Architecture** - Global state with Redux Toolkit + RTK Query

## 📋 State Overview

Casa Pronósticos uses Redux Toolkit as the primary state management solution, providing predictable state updates, excellent DevTools integration, and optimized performance. The state architecture follows domain-driven design with feature-based slices.

**State Library**: Redux Toolkit + RTK Query  
**Structure**: Feature-based slices with normalized data  
**Middleware**: Redux DevTools, persistence, cache management  
**Performance**: Memoized selectors, normalized state shape  

## 🏗️ State Architecture

### **Store Configuration**
```typescript
// src/state/store.ts
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    sales: salesSlice.reducer,
    ui: uiSlice.reducer,
    // Future slices:
    // commissions: commissionsSlice.reducer,
    // tickets: ticketsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    }),
  devTools: process.env.NODE_ENV !== 'production'
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### **Typed Redux Hooks**
```typescript
// src/state/hooks.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './store'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

## 🔐 Auth Slice

### **Auth State Structure**
```typescript
// src/state/slices/authSlice.ts
interface AuthState {
  user: AuthorizedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Session Management
  lastActivity: number | null
  sessionExpiry: number | null
  
  // Permission Cache
  permissionsCache: {
    [permission: string]: boolean
  }
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  lastActivity: null,
  sessionExpiry: null,
  permissionsCache: {}
}
```

### **Auth Actions & Reducers**
```typescript
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous actions
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    
    loginSuccess: (state, action: PayloadAction<AuthorizedUser>) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
      state.error = null
      state.lastActivity = Date.now()
      state.sessionExpiry = Date.now() + (8 * 60 * 60 * 1000) // 8 hours
      
      // Cache permissions for quick access
      state.permissionsCache = action.payload.permissions.reduce((cache, permission) => {
        cache[permission] = true
        return cache
      }, {} as Record<string, boolean>)
    },
    
    loginFailure: (state, action: PayloadAction<string>) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = action.payload
      state.permissionsCache = {}
    },
    
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
      state.lastActivity = null
      state.sessionExpiry = null
      state.permissionsCache = {}
    },
    
    updateLastActivity: (state) => {
      state.lastActivity = Date.now()
    },
    
    clearError: (state) => {
      state.error = null
    }
  }
})
```

### **Auth Async Thunks**
```typescript
// Login user with Firebase
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const userCredential = await AuthService.login(credentials.email, credentials.password)
      const userProfile = await AuthService.getUserProfile(userCredential.user.uid)
      
      if (!userProfile) {
        throw new Error('Usuario no autorizado')
      }
      
      return userProfile
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error de login')
    }
  }
)

// Initialize auth on app start
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

// Logout user
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout()
    } catch (error) {
      return rejectWithValue('Error al cerrar sesión')
    }
  }
)
```

### **Auth Selectors**
```typescript
// Memoized selectors for performance
export const selectAuthUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectAuthLoading = (state: RootState) => state.auth.isLoading
export const selectAuthError = (state: RootState) => state.auth.error

// Advanced selectors with memoization
export const selectUserRole = createSelector(
  [selectAuthUser],
  (user) => user?.role || null
)

export const selectUserPermissions = createSelector(
  [selectAuthUser],
  (user) => user?.permissions || []
)

export const selectHasPermission = createSelector(
  [(state: RootState) => state.auth.permissionsCache, (_, permission: string) => permission],
  (permissionsCache, permission) => permissionsCache[permission] || false
)

export const selectCanAccessMenu = createSelector(
  [selectAuthUser, (_, menu: string) => menu],
  (user, menu) => user?.menuAccess?.includes(menu) || false
)
```

## 💰 Sales Slice

### **Sales State Structure**
```typescript
// src/state/slices/salesSlice.ts
interface SalesState {
  // Current sales data
  sales: HourlySalesData[]
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  isDeleting: boolean
  
  // Error handling
  error: string | null
  
  // Filters and pagination
  filters: SalesFilters
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  
  // Cache information
  cacheStatus: {
    lastFetch: number | null
    isStale: boolean
    hitRate: number
  }
  
  // UI state for sales module
  selectedSale: HourlySalesData | null
  showCreateModal: boolean
  showEditModal: boolean
  bulkSelection: string[]
}

interface SalesFilters {
  dateRange: {
    start: string
    end: string
  }
  machineId: '76' | '79' | 'all'
  operatorId: string | null
  hourRange: {
    start: number
    end: number
  }
}

const initialState: SalesState = {
  sales: [],
  isLoading: false,
  isSaving: false,
  isDeleting: false,
  error: null,
  filters: {
    dateRange: {
      start: TimezoneUtils.getCurrentDateString(),
      end: TimezoneUtils.getCurrentDateString()
    },
    machineId: 'all',
    operatorId: null,
    hourRange: { start: 0, end: 23 }
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: false
  },
  cacheStatus: {
    lastFetch: null,
    isStale: false,
    hitRate: 0
  },
  selectedSale: null,
  showCreateModal: false,
  showEditModal: false,
  bulkSelection: []
}
```

### **Sales Actions & Reducers**
```typescript
const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload
    },
    
    // Sales data management
    setSales: (state, action: PayloadAction<HourlySalesData[]>) => {
      state.sales = action.payload
      state.error = null
    },
    
    addSale: (state, action: PayloadAction<HourlySalesData>) => {
      state.sales.push(action.payload)
      // Keep sorted by date and hour
      state.sales.sort((a, b) => {
        const dateComparison = a.date.localeCompare(b.date)
        if (dateComparison !== 0) return dateComparison
        return a.hour - b.hour
      })
    },
    
    updateSale: (state, action: PayloadAction<HourlySalesData>) => {
      const index = state.sales.findIndex(sale => sale.id === action.payload.id)
      if (index !== -1) {
        state.sales[index] = action.payload
      }
    },
    
    removeSale: (state, action: PayloadAction<string>) => {
      state.sales = state.sales.filter(sale => sale.id !== action.payload)
    },
    
    // Filters
    setFilters: (state, action: PayloadAction<Partial<SalesFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    
    resetFilters: (state) => {
      state.filters = initialState.filters
    },
    
    // UI state
    setSelectedSale: (state, action: PayloadAction<HourlySalesData | null>) => {
      state.selectedSale = action.payload
    },
    
    setShowCreateModal: (state, action: PayloadAction<boolean>) => {
      state.showCreateModal = action.payload
    },
    
    setShowEditModal: (state, action: PayloadAction<boolean>) => {
      state.showEditModal = action.payload
    },
    
    // Bulk operations
    setBulkSelection: (state, action: PayloadAction<string[]>) => {
      state.bulkSelection = action.payload
    },
    
    toggleBulkSelection: (state, action: PayloadAction<string>) => {
      const saleId = action.payload
      const index = state.bulkSelection.indexOf(saleId)
      if (index === -1) {
        state.bulkSelection.push(saleId)
      } else {
        state.bulkSelection.splice(index, 1)
      }
    },
    
    clearBulkSelection: (state) => {
      state.bulkSelection = []
    },
    
    // Cache status
    updateCacheStatus: (state, action: PayloadAction<Partial<SalesState['cacheStatus']>>) => {
      state.cacheStatus = { ...state.cacheStatus, ...action.payload }
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    
    clearError: (state) => {
      state.error = null
    }
  }
})
```

### **Sales Async Thunks**
```typescript
// Fetch sales with cache integration
export const fetchSales = createAsyncThunk(
  'sales/fetchSales',
  async (params: SalesQueryParams, { dispatch, getState, rejectWithValue }) => {
    try {
      dispatch(salesSlice.actions.setLoading(true))
      
      // Use cached service for optimized Firebase reads
      const salesData = await CachedSalesService.getSalesByDateRange(
        params.startDate,
        params.endDate,
        params.machineId
      )
      
      // Update cache status
      const cacheStats = CacheService.getCacheStats('sales')
      dispatch(salesSlice.actions.updateCacheStatus({
        lastFetch: Date.now(),
        hitRate: cacheStats.hitRate,
        isStale: false
      }))
      
      return salesData
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error al cargar ventas')
    } finally {
      dispatch(salesSlice.actions.setLoading(false))
    }
  }
)

// Create new sale
export const createSale = createAsyncThunk(
  'sales/createSale',
  async (saleData: CreateSalesData, { dispatch, rejectWithValue }) => {
    try {
      dispatch(salesSlice.actions.setSaving(true))
      
      const newSale = await SalesService.createSale(saleData)
      
      // Invalidate cache for affected date range
      CacheService.invalidatePattern(`sales:${saleData.date}`)
      
      return newSale
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error al crear venta')
    } finally {
      dispatch(salesSlice.actions.setSaving(false))
    }
  }
)

// Update existing sale
export const updateSale = createAsyncThunk(
  'sales/updateSale',
  async ({ saleId, updates }: { saleId: string; updates: Partial<HourlySalesData> }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(salesSlice.actions.setSaving(true))
      
      const updatedSale = await SalesService.updateSale(saleId, updates)
      
      // Invalidate cache
      CacheService.invalidatePattern(`sales:${updatedSale.date}`)
      
      return updatedSale
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error al actualizar venta')
    } finally {
      dispatch(salesSlice.actions.setSaving(false))
    }
  }
)

// Delete sale
export const deleteSale = createAsyncThunk(
  'sales/deleteSale',
  async (saleId: string, { dispatch, getState, rejectWithValue }) => {
    try {
      dispatch(salesSlice.actions.setDeleting(true))
      
      // Get sale data for cache invalidation
      const sale = (getState() as RootState).sales.sales.find(s => s.id === saleId)
      
      await SalesService.deleteSale(saleId)
      
      // Invalidate cache
      if (sale) {
        CacheService.invalidatePattern(`sales:${sale.date}`)
      }
      
      return saleId
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Error al eliminar venta')
    } finally {
      dispatch(salesSlice.actions.setDeleting(false))
    }
  }
)
```

### **Sales Selectors**
```typescript
// Basic selectors
export const selectSales = (state: RootState) => state.sales.sales
export const selectSalesLoading = (state: RootState) => state.sales.isLoading
export const selectSalesError = (state: RootState) => state.sales.error
export const selectSalesFilters = (state: RootState) => state.sales.filters

// Computed selectors with memoization
export const selectFilteredSales = createSelector(
  [selectSales, selectSalesFilters],
  (sales, filters) => {
    return sales.filter(sale => {
      // Date range filter
      const saleDate = new Date(sale.date)
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      
      if (saleDate < startDate || saleDate > endDate) {
        return false
      }
      
      // Machine filter
      if (filters.machineId !== 'all' && sale.machineId !== filters.machineId) {
        return false
      }
      
      // Hour range filter
      if (sale.hour < filters.hourRange.start || sale.hour > filters.hourRange.end) {
        return false
      }
      
      // Operator filter
      if (filters.operatorId && sale.operatorId !== filters.operatorId) {
        return false
      }
      
      return true
    })
  }
)

export const selectSalesTotalAmount = createSelector(
  [selectFilteredSales],
  (sales) => sales.reduce((total, sale) => total + sale.amount, 0)
)

export const selectSalesByMachine = createSelector(
  [selectFilteredSales],
  (sales) => {
    const machine76 = sales.filter(sale => sale.machineId === '76')
    const machine79 = sales.filter(sale => sale.machineId === '79')
    
    return {
      '76': {
        sales: machine76,
        total: machine76.reduce((sum, sale) => sum + sale.amount, 0),
        count: machine76.length
      },
      '79': {
        sales: machine79,
        total: machine79.reduce((sum, sale) => sum + sale.amount, 0),
        count: machine79.length
      }
    }
  }
)

export const selectSalesByHour = createSelector(
  [selectFilteredSales],
  (sales) => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      machine76: 0,
      machine79: 0,
      total: 0
    }))
    
    sales.forEach(sale => {
      const hourData = hourlyData[sale.hour]
      if (sale.machineId === '76') {
        hourData.machine76 += sale.amount
      } else {
        hourData.machine79 += sale.amount
      }
      hourData.total += sale.amount
    })
    
    return hourlyData
  }
)
```

## 🎨 UI Slice

### **UI State Structure**
```typescript
// src/state/slices/uiSlice.ts
interface UiState {
  // Global UI state
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  
  // Loading overlays
  globalLoading: boolean
  loadingMessage: string | null
  
  // Notifications
  notifications: Notification[]
  
  // Modals
  modals: {
    [modalId: string]: boolean
  }
  
  // Cache management UI
  cachePanel: {
    isOpen: boolean
    selectedCache: string | null
    showStats: boolean
  }
  
  // Data tables
  tablePreferences: {
    [tableId: string]: {
      pageSize: number
      sortColumn: string
      sortDirection: 'asc' | 'desc'
      columnVisibility: Record<string, boolean>
    }
  }
}
```

### **UI Actions & Reducers**
```typescript
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Sidebar
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    
    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    
    // Global loading
    setGlobalLoading: (state, action: PayloadAction<{ loading: boolean; message?: string }>) => {
      state.globalLoading = action.payload.loading
      state.loadingMessage = action.payload.message || null
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.push(action.payload)
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    
    clearAllNotifications: (state) => {
      state.notifications = []
    },
    
    // Modals
    setModal: (state, action: PayloadAction<{ modalId: string; isOpen: boolean }>) => {
      state.modals[action.payload.modalId] = action.payload.isOpen
    },
    
    // Cache panel
    setCachePanel: (state, action: PayloadAction<Partial<UiState['cachePanel']>>) => {
      state.cachePanel = { ...state.cachePanel, ...action.payload }
    },
    
    // Table preferences
    setTablePreference: (state, action: PayloadAction<{
      tableId: string
      preferences: Partial<UiState['tablePreferences'][string]>
    }>) => {
      const { tableId, preferences } = action.payload
      state.tablePreferences[tableId] = {
        ...state.tablePreferences[tableId],
        ...preferences
      }
    }
  }
})
```

## 🔄 Future Slice Structure

### **Commission Slice (SRS #2)**
```typescript
interface CommissionsState {
  commissions: CommissionData[]
  isLoading: boolean
  error: string | null
  filters: CommissionFilters
  reconciliation: {
    systemTotal: number
    paperTotal: number
    difference: number
    isReconciled: boolean
  }
}
```

### **Tickets Slice (SRS #5)**
```typescript
interface TicketsState {
  tickets: TicketData[]
  isLoading: boolean
  error: string | null
  weeklyTotals: WeeklyTicketSummary[]
  dailyAverages: DailyTicketAverage[]
}
```

## 🎯 Usage Patterns

### **Component Integration**
```typescript
// Using Redux state in components
const SalesComponent: React.FC = () => {
  const dispatch = useAppDispatch()
  const { sales, isLoading, error } = useAppSelector(state => state.sales)
  
  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchSales({
      startDate: '2025-08-01',
      endDate: '2025-08-31',
      machineId: 'all'
    }))
  }, [dispatch])
  
  // Handle actions
  const handleCreateSale = async (saleData: CreateSalesData) => {
    const result = await dispatch(createSale(saleData))
    if (createSale.fulfilled.match(result)) {
      // Success handling
    }
  }
  
  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {sales.map(sale => (
        <SaleItem key={sale.id} sale={sale} />
      ))}
    </div>
  )
}
```

### **Selector Usage**
```typescript
// Using memoized selectors
const SalesStatsComponent: React.FC = () => {
  const totalAmount = useAppSelector(selectSalesTotalAmount)
  const salesByMachine = useAppSelector(selectSalesByMachine)
  const hourlyData = useAppSelector(selectSalesByHour)
  
  return (
    <div>
      <p>Total: ${totalAmount.toFixed(2)}</p>
      <p>Máquina 76: ${salesByMachine['76'].total.toFixed(2)}</p>
      <p>Máquina 79: ${salesByMachine['79'].total.toFixed(2)}</p>
      <HourlyChart data={hourlyData} />
    </div>
  )
}
```

## 🎯 Best Practices

### **State Design**
1. **Normalized Data**: Keep data flat, use IDs for relationships
2. **Single Source of Truth**: Don't duplicate data across slices
3. **Immutable Updates**: Use Redux Toolkit's Immer integration
4. **Memoized Selectors**: Use createSelector for computed data
5. **Loading States**: Include loading/error states for all async operations

### **Performance Optimization**
1. **Selective Updates**: Only update necessary state slices
2. **Batch Actions**: Combine related actions when possible
3. **Memoization**: Use React.memo and useMemo with selectors
4. **Cache Integration**: Coordinate with cache system for optimal performance
5. **Lazy Loading**: Load state data only when needed

### **Error Handling**
1. **Graceful Degradation**: Handle errors without breaking UI
2. **User-Friendly Messages**: Convert technical errors to user messages
3. **Error Recovery**: Provide retry mechanisms
4. **Error Logging**: Log errors for debugging
5. **Fallback States**: Show meaningful fallback content

---

**State Status**: ✅ Core Slices Complete | 🔄 Additional Slices Planned  
**Performance**: Optimized with memoization and caching  
**Type Safety**: 100% TypeScript coverage  
**Last Updated**: August 21, 2025
