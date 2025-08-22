# Casa Pronósticos - React Migration

> **🔄 Hybrid Migration**: Legacy SPA → Modern React + TailwindCSS Architecture

## 📋 Migration Overview

This project represents the modernization of the existing Sales & Lottery Management System from a monolithic SPA structure to a modular React + TailwindCSS architecture while preserving all working functionality.

### 🚀 Deployment

### Automatic Deployment with GitHub Actions

This project includes automatic deployment to Firebase Hosting via GitHub Actions when pushing to the `main` branch.

#### Setup GitHub Secrets

In your GitHub repository, go to Settings → Secrets and Variables → Actions, and add these secrets:

```bash
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Service Account (JSON key)
FIREBASE_SERVICE_ACCOUNT_ADMINISTRACIONPRONOSTICOS=your_service_account_json
```

#### Getting Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Copy the entire JSON content and paste it as the `FIREBASE_SERVICE_ACCOUNT_ADMINISTRACIONPRONOSTICOS` secret

#### Manual Deployment

```bash
# Build for production
npm run build

# Deploy using Firebase CLI
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

## 🚀 Intelligent Cache System

Casa Pronósticos now includes a comprehensive caching system designed to minimize Firestore requests and stay within Firebase free tier limits while maintaining optimal performance.

### Key Features

- **Cost Reduction**: 75-90% reduction in Firestore reads
- **Performance**: Instant loading for cached data
- **Smart Invalidation**: Automatic cache updates when data changes
- **Persistence**: Cache survives browser refreshes
- **Analytics**: Real-time cache performance monitoring

### Cache Layers

1. **Sales Cache**: Historical sales data with extended TTL
2. **Dashboard Cache**: Real-time stats with shorter TTL
3. **User Cache**: User profiles and permissions

### Usage

```tsx
// Cached dashboard data with auto-refresh
const { todaysSales, weekSales, monthSales, loading } = useCachedDashboard(10)

// Cached hourly sales
const { data, loading } = useCachedHourlySales(selectedDate)

// Cache performance monitoring
const { stats } = useCacheStats()
```

### Cache Management

- **Admin Panel**: Full cache monitoring and management tools
- **Automatic Cleanup**: Expired entries removed every 5 minutes
- **Manual Controls**: Clear specific caches or invalidate all
- **Performance Metrics**: Hit rates, efficiency, cost savings

See [CACHE_SYSTEM.md](./CACHE_SYSTEM.md) for detailed documentation.

### Local Development

1. Copy environment file:
```bash
cp .env.example .env
```

2. Fill in your Firebase configuration in `.env`

3. Start development server:
```bash
npm run dev
```

## 🎯 Migration Goals

- ✅ **Preserve Working Features**: Keep existing Firebase auth, role-based access, and hourly sales functionality
- ✅ **Modernize Architecture**: Implement modular structure with proper separation of concerns
- ✅ **Improve Maintainability**: Use TypeScript, Redux Toolkit, and modern React patterns
- ✅ **Align with SRS**: Ensure all 9 SRS functionalities are properly structured and traceable

## 🏗️ New Architecture

### Directory Structure

```
src/
├── core/                 # Core application logic
├── services/            # Business logic and external integrations
│   ├── firebase.ts      # Firebase configuration
│   ├── AuthService.ts   # Authentication service (migrated)
│   └── SalesService.ts  # Sales operations (migrated)
├── modules/             # Feature modules (SRS functionalities)
│   ├── dashboard/       # Dashboard overview
│   └── sales/          # SRS #1: Hourly Sales (migrated)
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components
│   └── ui/            # Generic UI components
├── state/              # Redux Toolkit state management
│   ├── store.ts       # Main store configuration
│   ├── hooks.ts       # Typed Redux hooks
│   └── slices/        # Redux slices for each domain
└── types/             # TypeScript type definitions
```

### 🔄 Migration Status

| Component | Status | Source | Notes |
|-----------|--------|--------|-------|
| ✅ Firebase Auth | Migrated | `legacy/js/auth.js` | Full role-based access preserved |
| ✅ Hourly Sales UI | Migrated | `legacy/modules/sales/` | SRS #1 implementation |
| ✅ Navigation | Migrated | `legacy/js/ui/navigation.js` | Permission-based menu |
| ✅ State Management | New | Redux Toolkit | Replaces legacy state handling |
| 🚧 Sales Forms | In Progress | `legacy/modules/sales/` | Form functionality being added |
| ⏳ Reports Module | Planned | `legacy/` | SRS #2-9 to be migrated |

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase project credentials
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   
4. **Open Application**
   - Navigate to: http://localhost:3000/
   - Login with Firebase credentials

## Current Status ✅

- ✅ **Project Setup**: React + Vite + TypeScript + TailwindCSS
- ✅ **Architecture**: Modular structure with services/, modules/, components/, state/
- ✅ **State Management**: Redux Toolkit with auth, sales, UI slices
- ✅ **Firebase Integration**: AuthService and SalesService migrated
- ✅ **Layout System**: Responsive sidebar/header with role-based navigation
- ✅ **SRS Module #1**: HourlySales component with data visualization
- ✅ **Development Server**: Running at http://localhost:3000/ ✨

### ⚠️ Next Steps Required

1. **Firebase Environment Setup**: Copy `.env.example` to `.env` and configure with your Firebase project credentials
2. **Authentication Testing**: Test login flow with existing Firebase users
3. **Form Implementation**: Complete HourlySales data entry functionality
4. **Remaining SRS Modules**: Migrate modules #2-9 from legacy system

## 🔧 Key Technologies

### Frontend Stack
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type safety and better developer experience  
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **Redux Toolkit** - State management with modern patterns
- **React Hook Form** - Performant form handling
- **Recharts** - Chart library for data visualization

### Backend (Firebase)
- **Firebase Authentication** - User management with role-based access
- **Firestore** - NoSQL database with real-time sync
- **Firebase Functions** - Serverless backend logic
- **Firebase Hosting** - Static site hosting

## 📚 Migration Guide

### Migrating Legacy Components

1. **Identify the legacy component** in `ventas-Pronosticos/public/js/`
2. **Extract business logic** into appropriate service
3. **Create React component** in corresponding module
4. **Connect to Redux state** using typed hooks
5. **Preserve existing permissions** and role checks
6. **Test with existing Firebase data**

### Example: Migrating a Module

```typescript
// 1. Create service (src/services/ExampleService.ts)
export class ExampleService {
  static async getData() {
    // Migrated Firestore logic
  }
}

// 2. Create Redux slice (src/state/slices/exampleSlice.ts)
const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    // State management
  }
})

// 3. Create React component (src/modules/example/Example.tsx)
const Example: React.FC = () => {
  const dispatch = useAppDispatch()
  const data = useAppSelector(state => state.example)
  
  // Component logic
}
```

## 🔐 Authentication & Permissions

The new system maintains full compatibility with the existing role system:

- **operador** (level 1): Basic sales operations
- **supervisor** (level 2): Sales + reports access  
- **admin** (level 3): Full system access

```typescript
// Check permissions (same as legacy)
if (AuthService.hasPermission(userProfile, 'sales:create')) {
  // User can create sales
}

// Check role level (same as legacy)  
if (AuthService.getRoleLevel(userProfile) >= 2) {
  // Supervisor or admin access
}
```

## 📊 SRS Functionality Mapping

| SRS # | Functionality | Legacy Location | New Location | Status |
|-------|---------------|----------------|--------------|---------|
| 1 | Hourly Sales | `modules/sales/hourly-sales.js` | `modules/sales/HourlySales.tsx` | ✅ Migrated |
| 2 | Daily Reports | `modules/reports/` | `modules/reports/` | ⏳ Planned |
| 3 | Weekly Analysis | `modules/analytics/` | `modules/analytics/` | ⏳ Planned |
| 4 | Monthly Summary | `modules/reports/` | `modules/reports/` | ⏳ Planned |
| 5 | User Management | `utils/admin-panel.js` | `modules/admin/` | ⏳ Planned |
| 6 | Lottery Tracking | `modules/lottery/` | `modules/lottery/` | ⏳ Planned |
| 7 | Financial Reports | `modules/finance/` | `modules/finance/` | ⏳ Planned |
| 8 | Audit Logs | `utils/audit.js` | `modules/audit/` | ⏳ Planned |
| 9 | Export Functions | `utils/export.js` | `modules/export/` | ⏳ Planned |

## 🚦 Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/migrate-srs-2-reports
```

### 2. Follow Migration Pattern
- Create service layer for business logic
- Implement Redux slice for state management  
- Build React component with proper TypeScript
- Add proper permission checks
- Test with existing data

### 3. Update Progress
Update this README and the migration checklist as components are completed.

### 4. Code Review & Merge
Ensure code follows established patterns and maintains compatibility.

## 🧪 Testing Strategy

### Unit Tests
- Service layer functions
- Redux reducers and actions
- Utility functions

### Integration Tests  
- Firebase connectivity
- Authentication flows
- Permission checks

### Manual Testing
- Verify compatibility with existing data
- Test role-based access
- Validate real-time sync

## 📈 Performance Considerations

### Code Splitting
- Lazy load module components
- Dynamic imports for heavy libraries

### State Management
- Normalized data structures
- Selective re-renders with proper memoization

### Bundle Optimization
- Tree shaking unused code
- Optimize asset loading

## � User Guide

### Adding Sales Entries

#### Current Day Sales
1. Use the **Quick Sales Entry** on the dashboard
2. Select machine (76 or 79), verify hour, and enter total accumulated amount
3. The system automatically calculates the hourly difference

#### Historical Sales (Previous Days)
1. **Option 1: Dashboard Quick Entry**
   - Change the date field to the desired historical date
   - Follow the same process as current day sales
   
2. **Option 2: Hourly Sales Module**
   - Navigate to "Ventas por Hora" from the sidebar
   - Use the date picker at the top right to select any historical date
   - Click "Agregar Venta" to add entries for that specific date

#### Important Notes
- **Time Period Concept**: When you register at 14:00, you're recording sales from 13:00 to 14:00
- **Cumulative System**: Always enter the total accumulated amount on the machine, not just the hourly amount
- **Automatic Calculation**: The system calculates hourly sales by subtracting the previous hour's total
- **Validation**: The system prevents entering totals lower than the previous hour
- **Timezone**: All dates and times are automatically handled in Mexico City timezone (UTC-6)

## �🔧 Troubleshooting

### Common Migration Issues

1. **Firebase Connection**
   - Verify environment variables
   - Check Firebase project settings
   - Ensure Firestore rules allow access

2. **Permission Errors**  
   - Check user role assignment
   - Verify permission strings match legacy system
   - Test with different user roles

3. **Data Compatibility**
   - Ensure date formats match legacy system
   - Verify collection/document structure
   - Check field naming consistency

## 📝 Contributing

1. Follow the established architecture patterns
2. Maintain TypeScript strict mode compliance
3. Add proper JSDoc comments referencing SRS numbers
4. Test with existing Firebase data
5. Update migration documentation

## 🔗 Related Documentation

- [Legacy System README](../ventas-Pronosticos/README.md)
- [SRS Requirements](../ventas-Pronosticos/srs.json)
- [Refactor Plan](../ventas-Pronosticos/refactor-plan.json)
- [Firebase Setup Guide](../ventas-Pronosticos/setup.sh)

---

**Migration Progress**: 🟢 Architecture Setup Complete | 🟡 Core Modules In Progress | 🔴 Advanced Features Pending
