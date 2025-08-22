# Casa Pronósticos - UI Components Documentation

> **🎨 Component Library Guide** - Reusable UI components with TailwindCSS

## 📋 Component Overview

Casa Pronósticos uses a comprehensive component library built with React 18, TypeScript, and TailwindCSS. All components follow consistent design patterns, accessibility standards, and performance best practices.

**Design System**: TailwindCSS-based utility-first approach  
**Styling**: Mobile-first responsive design  
**Accessibility**: WCAG 2.1 compliant components  
**Performance**: Lazy loading and memoization optimized  

## 🏗️ Component Architecture

### **Component Structure**
```
src/components/
├── admin/                    # Admin-specific components
│   ├── AdminSetup.tsx       # ✅ Admin panel dashboard
│   └── DataMigrationTool.tsx # ✅ Data migration utilities
├── auth/                    # Authentication components
│   └── LoginForm.tsx        # ✅ User login interface
├── Layout/                  # Layout and navigation
│   ├── Header.tsx           # ✅ Top navigation bar
│   ├── Layout.tsx           # ✅ Main layout wrapper
│   ├── Sidebar.tsx          # ✅ Responsive sidebar navigation
│   └── SidebarOld.tsx       # 📁 Legacy sidebar (deprecated)
├── sales/                   # Sales-specific components
│   ├── QuickSalesEntry.tsx  # ✅ Fast sales input form
│   └── SalesComparison.tsx  # ✅ Sales comparison charts
└── ui/                      # Reusable UI primitives
    └── LoadingSpinner.tsx   # ✅ Loading indicator
```

### **Component Patterns**
- **Functional Components**: All components use React.FC pattern
- **TypeScript**: Strict typing with interface definitions
- **Props Pattern**: Destructured props with default values
- **State Management**: useState/useEffect for local state, Redux for global
- **Error Boundaries**: Wrap components in error handling
- **Performance**: React.memo for expensive components

## 🎨 Design System

### **Color Palette (TailwindCSS)**
```typescript
// Primary colors
const colors = {
  primary: {
    50: '#eff6ff',   // Very light blue
    100: '#dbeafe',  // Light blue
    500: '#3b82f6',  // Main blue
    600: '#2563eb',  // Hover blue
    700: '#1d4ed8',  // Active blue
    900: '#1e3a8a'   // Dark blue
  },
  gray: {
    50: '#f9fafb',   // Background
    100: '#f3f4f6',  // Light gray
    300: '#d1d5db',  // Border gray
    500: '#6b7280',  // Text gray
    700: '#374151',  // Dark text
    900: '#111827'   // Darkest text
  },
  success: {
    50: '#ecfdf5',
    500: '#10b981',
    600: '#059669'
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626'
  }
}
```

### **Typography Scale**
```css
/* TailwindCSS Typography Classes */
.text-xs     { font-size: 0.75rem; }    /* 12px */
.text-sm     { font-size: 0.875rem; }   /* 14px */
.text-base   { font-size: 1rem; }       /* 16px */
.text-lg     { font-size: 1.125rem; }   /* 18px */
.text-xl     { font-size: 1.25rem; }    /* 20px */
.text-2xl    { font-size: 1.5rem; }     /* 24px */
.text-3xl    { font-size: 1.875rem; }   /* 30px */
```

### **Spacing System**
```css
/* TailwindCSS Spacing (padding/margin) */
.p-1   { padding: 0.25rem; }    /* 4px */
.p-2   { padding: 0.5rem; }     /* 8px */
.p-4   { padding: 1rem; }       /* 16px */
.p-6   { padding: 1.5rem; }     /* 24px */
.p-8   { padding: 2rem; }       /* 32px */
```

## 🧩 Core UI Components

### **LoadingSpinner.tsx**
**Purpose**: Consistent loading indicators across the app

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  message
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 ${sizeClasses[size]}`} />
      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  )
}

// Usage examples:
// <LoadingSpinner size="sm" />
// <LoadingSpinner message="Cargando ventas..." />
// <LoadingSpinner size="lg" className="py-8" />
```

### **Button Component** (Needs Creation)
**Purpose**: Consistent button styling and behavior

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  onClick,
  type = 'button',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  const isDisabled = disabled || loading
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${sizeClasses[size]}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}

// Usage examples:
// <Button variant="primary">Guardar</Button>
// <Button variant="danger" loading={isDeleting}>Eliminar</Button>
// <Button variant="ghost" icon={<PlusIcon />}>Agregar</Button>
```

### **Card Component** (Needs Creation)
**Purpose**: Consistent card layout for content sections

```typescript
interface CardProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  loading?: boolean
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  loading = false
}) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <LoadingSpinner message="Cargando..." />
      </div>
    )
  }
  
  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">{actions}</div>
            )}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

// Usage examples:
// <Card title="Ventas del Día">content</Card>
// <Card title="Resumen" actions={<Button>Exportar</Button>}>content</Card>
```

### **Modal Component** (Needs Creation)
**Purpose**: Consistent modal dialogs

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal panel */}
        <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Cerrar</span>
                  ×
                </button>
              )}
            </div>
            <div className="mt-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Usage examples:
// <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirmar">
//   ¿Estás seguro?
// </Modal>
```

## 📱 Layout Components

### **Layout.tsx - Main Layout Wrapper**
**Purpose**: Protected route wrapper with navigation

```typescript
export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAppSelector(state => state.auth)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Show loading during auth check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Verificando sesión..." />
      </div>
    )
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />
  }
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}
      
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
```

### **Header.tsx - Top Navigation**
**Purpose**: Top navigation bar with user menu

```typescript
interface HeaderProps {
  onMenuClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  const handleLogout = async () => {
    await dispatch(logoutUser())
  }
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              onClick={onMenuClick}
            >
              <span className="sr-only">Abrir menú</span>
              ☰
            </button>
            
            {/* Logo/Title */}
            <h1 className="ml-4 lg:ml-0 text-xl font-semibold text-gray-900">
              Casa Pronósticos
            </h1>
          </div>
          
          {/* User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                className="flex items-center p-2 text-sm text-gray-700 hover:text-gray-900"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="mr-2">{user?.displayName || user?.email}</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {user?.role?.name}
                </span>
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
```

### **Sidebar.tsx - Navigation Menu**
**Purpose**: Responsive sidebar with role-based menu items

```typescript
interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { canAccessMenu } = usePermissions()
  const location = useLocation()
  
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', menu: 'dashboard', icon: '📊' },
    { name: 'Ventas', path: '/ventas', menu: 'ventas', icon: '💰' },
    { name: 'Operación', path: '/operacion', menu: 'operacion', icon: '⚙️' },
    { name: 'Finanzas', path: '/finanzas', menu: 'finanzas', icon: '📈' },
    { name: 'Sorteos', path: '/sorteos', menu: 'sorteos', icon: '🎰' },
    { name: 'Admin', path: '/admin', menu: 'admin', icon: '👤' }
  ]
  
  const filteredMenuItems = menuItems.filter(item => canAccessMenu(item.menu))
  
  return (
    <div className={`
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:transform-none
    `}>
      <div className="flex flex-col h-full">
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
```

## 📊 Sales Components

### **QuickSalesEntry.tsx - Fast Sales Input**
**Purpose**: Quick data entry for hourly sales

```typescript
export const QuickSalesEntry: React.FC = () => {
  const { hasPermission } = usePermissions()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm<HourlySalesData>({
    defaultValues: {
      date: TimezoneUtils.getCurrentDateString(),
      hour: new Date().getHours(),
      machineId: '76'
    }
  })
  
  if (!hasPermission(PERMISSIONS.VENTAS_CREATE)) {
    return <div className="text-center text-gray-500">Sin permisos</div>
  }
  
  const onSubmit = async (data: HourlySalesData) => {
    try {
      setIsSubmitting(true)
      await SalesService.createSale(data)
      reset()
      toast.success('Venta registrada')
    } catch (error) {
      toast.error('Error al registrar venta')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card title="Registro Rápido de Ventas">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha
            </label>
            <input
              type="date"
              {...register('date', { required: 'Fecha requerida' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.date && (
              <p className="text-red-500 text-sm">{errors.date.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hora
            </label>
            <select
              {...register('hour', { required: 'Hora requerida' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Máquina
            </label>
            <select
              {...register('machineId', { required: 'Máquina requerida' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="76">Máquina 76</option>
              <option value="79">Máquina 79</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Monto de Venta
          </label>
          <input
            type="number"
            step="0.01"
            {...register('amount', { 
              required: 'Monto requerido',
              min: { value: 0, message: 'Monto debe ser positivo' }
            })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-red-500 text-sm">{errors.amount.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notas (Opcional)
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Comentarios adicionales..."
          />
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            loading={isSubmitting}
          >
            Registrar Venta
          </Button>
        </div>
      </form>
    </Card>
  )
}
```

## 🎯 Best Practices

### **Component Design Principles**
1. **Single Responsibility**: Each component has one clear purpose
2. **Reusability**: Components can be used across different contexts
3. **Composability**: Components work well together
4. **Accessibility**: All components include proper ARIA labels
5. **Performance**: Memoization and lazy loading where appropriate

### **Styling Guidelines**
1. **TailwindCSS Only**: No custom CSS unless absolutely necessary
2. **Responsive Design**: Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints
3. **Consistent Spacing**: Use TailwindCSS spacing scale (4px increments)
4. **Color Consistency**: Use defined color palette
5. **Dark Mode Ready**: Prepare components for future dark mode support

### **TypeScript Standards**
1. **Strict Types**: No `any` types allowed
2. **Interface Definition**: All props must have proper interfaces
3. **Default Props**: Use defaultProps or default parameters
4. **Generic Components**: Use generics for reusable data components
5. **Type Exports**: Export component types for reuse

### **Performance Optimization**
1. **React.memo**: Wrap expensive components
2. **useMemo/useCallback**: Memoize expensive calculations
3. **Lazy Loading**: Use React.lazy for route components
4. **Bundle Splitting**: Code split by feature modules
5. **Image Optimization**: Use proper image formats and sizes

---

**Component Status**: ✅ Core Components Ready | 🔄 Advanced Components Planned  
**Design System**: TailwindCSS-based, mobile-first  
**Accessibility**: WCAG 2.1 compliant  
**Last Updated**: August 21, 2025
