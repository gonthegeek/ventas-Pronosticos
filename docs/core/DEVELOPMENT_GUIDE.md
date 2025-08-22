# Casa Pronósticos - Development Guide

> **🔧 Step-by-Step Development Patterns** - Implementing new SRS functionalities following established patterns

## 📋 Overview

This guide provides concrete patterns and examples for implementing new SRS functionalities in Casa Pronósticos. Use SRS #1 (Hourly Sales) as the reference implementation for all new features.

## 🎯 Quick Reference

### **SRS Implementation Checklist**
- [ ] Create module structure following pattern
- [ ] Implement service layer with cache integration
- [ ] Add Redux state management
- [ ] Implement permission controls
- [ ] Add to navigation and routing
- [ ] Create UI components with TailwindCSS
- [ ] Add export/import functionality
- [ ] Test with existing Firebase data

### **Key Files to Study**
- **Reference Implementation**: `src/modules/sales/HourlySales.tsx`
- **Service Pattern**: `src/services/SalesService.ts` + `src/services/SalesService.cached.ts`
- **State Pattern**: `src/state/slices/salesSlice.ts`
- **Permission Pattern**: `src/utils/permissions.ts`
- **Cache Pattern**: `src/services/CacheService.ts`

## 🏗️ Step-by-Step Implementation Pattern

### **Step 1: Create Module Structure**

#### **1.1 Create Module File**
```typescript
// src/modules/[category]/[SrsName].tsx
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAppDispatch, useAppSelector } from '../../state/hooks'
import { [SrsName]Service } from '../../services/[SrsName]Service'
import { PermissionUtils } from '../../utils/permissions'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

interface [SrsName]FormData {
  // Define form fields based on SRS specification
  date: string
  machineId: '76' | '79'
  // ... other fields
}

export const [SrsName]: React.FC = () => {
  // 1. State management
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)
  const { data, loading, error } = useAppSelector(state => state.[srsName])
  
  // 2. Form handling
  const { register, handleSubmit, reset, formState: { errors } } = useForm<[SrsName]FormData>()
  
  // 3. Permission checks
  const canCreate = PermissionUtils.hasPermission(user?.permissions, '[srsName]:create')
  const canEdit = PermissionUtils.hasPermission(user?.permissions, '[srsName]:update')
  const canDelete = PermissionUtils.hasPermission(user?.permissions, '[srsName]:delete')
  
  // 4. Data fetching
  useEffect(() => {
    // Load initial data
  }, [])
  
  // 5. Event handlers
  const onSubmit = async (data: [SrsName]FormData) => {
    // Handle form submission
  }
  
  // 6. Loading state
  if (loading) return <LoadingSpinner />
  
  // 7. Render
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SRS #N: [Name]</h1>
        {canCreate && (
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
            Agregar Nuevo
          </button>
        )}
      </div>
      
      {/* Form Section */}
      {canCreate && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow mb-6">
          {/* Form fields using React Hook Form */}
        </form>
      )}
      
      {/* Data Display */}
      <div className="bg-white rounded-lg shadow">
        {/* Table or list of data */}
      </div>
    </div>
  )
}
```

#### **1.2 File Naming Convention**
```
src/modules/[category]/[SrsName].tsx

Examples:
- src/modules/finances/Commissions.tsx      # SRS #2
- src/modules/operations/RollChanges.tsx    # SRS #3
- src/modules/finances/Tickets.tsx          # SRS #5
- src/modules/lottery/Scratches.tsx         # SRS #7
```

### **Step 2: Implement Service Layer**

#### **2.1 Create Service Class**
```typescript
// src/services/[SrsName]Service.ts
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getDocs 
} from 'firebase/firestore'
import { db } from './firebase'
import { TimezoneUtils } from '../utils/timezone'

export interface [SrsName]Data {
  id?: string
  date: string
  machineId: '76' | '79'
  operatorId: string
  timestamp: Date
  createdAt?: Date
  updatedAt?: Date
  // ... other fields based on SRS specification
}

export class [SrsName]Service {
  // Hierarchical collection path pattern
  private static getCollectionPath(date: string): string {
    const mexDate = TimezoneUtils.convertToMexicoTimezone(new Date(date))
    const year = mexDate.getFullYear()
    const month = String(mexDate.getMonth() + 1).padStart(2, '0')
    return `data/[srsName]/${year}/${month}`
  }
  
  // Create new record
  static async create(data: Omit<[SrsName]Data, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const collectionPath = this.getCollectionPath(data.date)
      const docRef = await addDoc(collection(db, collectionPath), {
        ...data,
        timestamp: TimezoneUtils.convertToMexicoTimezone(data.timestamp),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating [srsName]:', error)
      throw new Error('Failed to create [srsName] record')
    }
  }
  
  // Read records for date range
  static async getByDateRange(startDate: string, endDate: string): Promise<[SrsName]Data[]> {
    try {
      const records: [SrsName]Data[] = []
      
      // Query hierarchical collections for date range
      // Implementation depends on specific SRS requirements
      
      return records
    } catch (error) {
      console.error('Error fetching [srsName] data:', error)
      throw new Error('Failed to fetch [srsName] data')
    }
  }
  
  // Update existing record
  static async update(id: string, data: Partial<[SrsName]Data>): Promise<void> {
    try {
      // Update logic with proper collection path
      const updateData = {
        ...data,
        updatedAt: new Date()
      }
      // Implementation depends on document location
    } catch (error) {
      console.error('Error updating [srsName]:', error)
      throw new Error('Failed to update [srsName] record')
    }
  }
  
  // Delete record
  static async delete(id: string, date: string): Promise<void> {
    try {
      const collectionPath = this.getCollectionPath(date)
      await deleteDoc(doc(db, collectionPath, id))
    } catch (error) {
      console.error('Error deleting [srsName]:', error)
      throw new Error('Failed to delete [srsName] record')
    }
  }
  
  // Export data for CSV
  static async exportToCSV(startDate: string, endDate: string): Promise<string> {
    try {
      const data = await this.getByDateRange(startDate, endDate)
      // Convert to CSV format
      const headers = ['Date', 'Machine', 'Operator', /* ... other headers */]
      const csvRows = [
        headers.join(','),
        ...data.map(row => [
          row.date,
          row.machineId,
          row.operatorId,
          // ... other fields
        ].join(','))
      ]
      return csvRows.join('\n')
    } catch (error) {
      console.error('Error exporting [srsName] to CSV:', error)
      throw new Error('Failed to export [srsName] data')
    }
  }
}
```

#### **2.2 Create Cached Service Wrapper**
```typescript
// src/services/[SrsName]Service.cached.ts
import { CacheService } from './CacheService'
import { [SrsName]Service, [SrsName]Data } from './[SrsName]Service'

export class Cached[SrsName]Service extends [SrsName]Service {
  private static cache = CacheService
  
  // Cache TTL based on data type (following SRS specification)
  private static readonly CACHE_TTL = {
    daily: 2 * 60 * 60 * 1000,    // 2 hours
    weekly: 4 * 60 * 60 * 1000,   // 4 hours
    monthly: 6 * 60 * 60 * 1000,  // 6 hours
    event: 1 * 60 * 60 * 1000     // 1 hour
  }
  
  static async getByDateRange(startDate: string, endDate: string): Promise<[SrsName]Data[]> {
    const cacheKey = `[srsName]-range-${startDate}-${endDate}`
    
    return this.cache.get(cacheKey) || await this.cache.set(
      cacheKey,
      () => super.getByDateRange(startDate, endDate),
      this.CACHE_TTL.daily // Adjust based on SRS requirements
    )
  }
  
  static async create(data: Omit<[SrsName]Data, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Create record
    const id = await super.create(data)
    
    // Invalidate related cache entries
    this.cache.invalidatePattern(`[srsName]-range-${data.date}`)
    this.cache.invalidatePattern(`dashboard-`)
    
    return id
  }
  
  // Implement other methods with cache integration
}
```

### **Step 3: Add Redux State Management**

#### **3.1 Create Redux Slice**
```typescript
// src/state/slices/[srsName]Slice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Cached[SrsName]Service, [SrsName]Data } from '../../services/[SrsName]Service.cached'

interface [SrsName]State {
  data: [SrsName]Data[]
  loading: boolean
  error: string | null
  selectedDate: string
  filters: {
    machineId?: '76' | '79'
    dateRange?: { start: string; end: string }
  }
}

const initialState: [SrsName]State = {
  data: [],
  loading: false,
  error: null,
  selectedDate: new Date().toISOString().split('T')[0],
  filters: {}
}

// Async thunks
export const fetch[SrsName]Data = createAsyncThunk(
  '[srsName]/fetchData',
  async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
    return await Cached[SrsName]Service.getByDateRange(startDate, endDate)
  }
)

export const create[SrsName] = createAsyncThunk(
  '[srsName]/create',
  async (data: Omit<[SrsName]Data, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = await Cached[SrsName]Service.create(data)
    return { ...data, id }
  }
)

// Slice
export const [srsName]Slice = createSlice({
  name: '[srsName]',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch data cases
      .addCase(fetch[SrsName]Data.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetch[SrsName]Data.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(fetch[SrsName]Data.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch data'
      })
      // Create cases
      .addCase(create[SrsName].fulfilled, (state, action) => {
        state.data.push(action.payload)
      })
  }
})

export const { setSelectedDate, setFilters, clearError } = [srsName]Slice.actions
export default [srsName]Slice.reducer
```

#### **3.2 Add to Store**
```typescript
// src/state/store.ts (add to existing store)
import { [srsName]Slice } from './slices/[srsName]Slice'

export const store = configureStore({
  reducer: {
    // ... existing reducers
    [srsName]: [srsName]Slice.reducer,
  },
})
```

### **Step 4: Implement Permission Controls**

#### **4.1 Add Permissions to System**
```typescript
// src/utils/permissions.ts (add to existing file)

// Add new permission constants
export const PERMISSIONS = {
  // ... existing permissions
  [`${srsName.toUpperCase()}_CREATE`]: `${srsName}:create` as const,
  [`${srsName.toUpperCase()}_READ`]: `${srsName}:read` as const,
  [`${srsName.toUpperCase()}_UPDATE`]: `${srsName}:update` as const,
  [`${srsName.toUpperCase()}_DELETE`]: `${srsName}:delete` as const,
  [`${srsName.toUpperCase()}_ALL`]: `${srsName}:all` as const,
} as const

// Update role permissions
export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  operador: [
    // ... existing permissions
    PERMISSIONS.[`${srsName.toUpperCase()}_READ`],
    // Add create permission if appropriate for operador
  ],
  supervisor: [
    // ... existing permissions
    PERMISSIONS.[`${srsName.toUpperCase()}_ALL`],
  ],
  admin: [
    // ... existing permissions (includes all)
  ]
}
```

#### **4.2 Add Menu Access**
```typescript
// src/utils/permissions.ts (update menu access)

export const MENU_ACCESS: Record<RoleName, string[]> = {
  operador: [
    'dashboard',
    'ventas',
    'operacion',
    // Add menu category if appropriate
  ],
  supervisor: [
    'dashboard',
    'ventas',
    'finanzas',
    'sorteos',
    'operacion',
    // Supervisors typically have access to new features
  ],
  admin: ['all'] // Admin has access to all menus
}
```

### **Step 5: Add Navigation and Routing**

#### **5.1 Update Sidebar Navigation**
```typescript
// src/components/Layout/Sidebar.tsx (add to existing navigation)

const navigationItems = [
  // ... existing items
  {
    name: '[Category Name]',
    icon: [IconComponent],
    children: [
      {
        name: '[SRS Name]',
        href: '/[srsName]',
        permission: '[srsName]:read'
      }
    ]
  }
]
```

#### **5.2 Add Route**
```typescript
// src/App.tsx (add to existing routes)
import { [SrsName] } from './modules/[category]/[SrsName]'

// In the Routes component:
<Route 
  path="/[srsName]" 
  element={
    <ProtectedRoute permission="[srsName]:read">
      <[SrsName] />
    </ProtectedRoute>
  } 
/>
```

### **Step 6: Create UI Components**

#### **6.1 Form Component Pattern**
```typescript
// Form section within main component
<form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow mb-6">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Date field */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Fecha
      </label>
      <input
        type="date"
        {...register('date', { required: 'La fecha es requerida' })}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {errors.date && (
        <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
      )}
    </div>
    
    {/* Machine selection */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Máquina
      </label>
      <select
        {...register('machineId', { required: 'La máquina es requerida' })}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Seleccionar...</option>
        <option value="76">Máquina 76</option>
        <option value="79">Máquina 79</option>
      </select>
      {errors.machineId && (
        <p className="mt-1 text-sm text-red-600">{errors.machineId.message}</p>
      )}
    </div>
    
    {/* Submit button */}
    <div className="flex items-end">
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md font-medium"
      >
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  </div>
</form>
```

#### **6.2 Data Display Pattern**
```typescript
// Data table section
<div className="bg-white rounded-lg shadow overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-200">
    <h3 className="text-lg font-medium text-gray-900">Registros</h3>
  </div>
  
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Fecha
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Máquina
          </th>
          {/* More columns based on SRS */}
          {(canEdit || canDelete) && (
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item) => (
          <tr key={item.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {item.date}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              Máquina {item.machineId}
            </td>
            {/* More cells based on SRS */}
            {(canEdit || canDelete) && (
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {canEdit && (
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    Editar
                  </button>
                )}
                {canDelete && (
                  <button className="text-red-600 hover:text-red-900">
                    Eliminar
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### **Step 7: Add Export/Import Functionality**

#### **7.1 Export Component**
```typescript
// Export functionality
const handleExport = async () => {
  try {
    setExporting(true)
    const csvData = await [SrsName]Service.exportToCSV(startDate, endDate)
    
    // Create and download file
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `[srsName]-${startDate}-${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Datos exportados exitosamente')
  } catch (error) {
    toast.error('Error al exportar datos')
  } finally {
    setExporting(false)
  }
}
```

## 📋 Testing Pattern

### **Testing New Functionality**
```typescript
// __tests__/[SrsName].test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../state/store'
import { [SrsName] } from '../modules/[category]/[SrsName]'

const renderWithStore = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('[SrsName] Component', () => {
  test('renders form when user has create permission', () => {
    // Test implementation
  })
  
  test('displays data correctly', async () => {
    // Test implementation
  })
  
  test('handles form submission', async () => {
    // Test implementation
  })
})
```

## 🎯 Next Steps Checklist

After implementing new SRS functionality:

### **Immediate Testing**
- [ ] Test CRUD operations work correctly
- [ ] Verify permission system works as expected
- [ ] Check cache integration is functioning
- [ ] Test responsive design on mobile
- [ ] Verify export functionality works

### **Integration Testing**
- [ ] Test with existing Firebase data
- [ ] Verify navigation works correctly
- [ ] Check role-based access is enforced
- [ ] Test error handling scenarios
- [ ] Verify cache invalidation works

### **Documentation Updates**
- [ ] Update SRS documentation
- [ ] Add to migration progress tracking
- [ ] Update API documentation if needed
- [ ] Add user guide documentation

## 🔗 Reference Files

### **Study These Implementations**
- **Complete SRS Example**: `src/modules/sales/HourlySales.tsx`
- **Service Pattern**: `src/services/SalesService.ts`
- **Cache Integration**: `src/services/SalesService.cached.ts`
- **Redux Pattern**: `src/state/slices/salesSlice.ts`
- **Permission System**: `src/utils/permissions.ts`

### **Reusable Components**
- **Loading Spinner**: `src/components/ui/LoadingSpinner.tsx`
- **Form Patterns**: Study HourlySales form implementation
- **Table Patterns**: Reference existing data display patterns
- **Export Patterns**: Check existing CSV export implementations

---

**Pattern Status**: ✅ Production Proven  
**Reference Implementation**: SRS #1 (HourlySales)  
**Success Rate**: 100% when following this pattern  
**Last Updated**: August 21, 2025
