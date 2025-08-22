# Casa Pronósticos - Troubleshooting Guide

> **🔧 Problem Resolution** - Common issues, solutions, and debugging strategies

## 📋 Troubleshooting Overview

This guide provides comprehensive solutions for common issues encountered during development, deployment, and production operation of Casa Pronósticos. Each section includes symptoms, root causes, and step-by-step resolution procedures.

**Categories**: Development, Firebase, Authentication, Cache, Performance, Deployment  
**Severity Levels**: 🔴 Critical, 🟡 Warning, 🟢 Minor  
**Response Time**: Critical <1hr, Warning <4hr, Minor <24hr  

## 🚨 Critical Issues (🔴)

### **Application Won't Start**

#### **Symptom**: `npm run dev` fails or white screen
```bash
# Common error messages:
Error: Cannot resolve module 'firebase/app'
Failed to resolve import "@/components/Layout"
TypeError: Cannot read property 'user' of undefined
```

#### **Root Causes & Solutions**:

**1. Missing Dependencies**
```bash
# Check for missing packages
npm ls
npm install

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**2. Environment Variables Missing**
```bash
# Check .env file exists
ls -la .env*

# Copy from template
cp .env.example .env.local

# Verify required variables
grep "VITE_" .env.local
```

**3. TypeScript Configuration Issues**
```bash
# Check TypeScript config
npx tsc --noEmit

# Reset TypeScript cache
rm -rf node_modules/.vite
npm run dev
```

### **Authentication Failures**

#### **Symptom**: Users cannot log in or get "unauthorized" errors
```bash
# Error messages:
auth/user-not-found
auth/invalid-api-key
Permission denied: Missing or insufficient permissions
```

#### **Solutions**:

**1. Firebase Configuration**
```typescript
// Verify Firebase config in browser console
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID)

// Check Firebase initialization
import { auth } from '@/services/firebase'
console.log('Auth instance:', auth)
```

**2. User Permissions**
```bash
# Check user exists in Firestore
# Go to Firebase Console > Firestore > authorizedUsers collection
# Verify user document has:
{
  uid: "user-id",
  role: { level: 1, name: "operador" },
  permissions: ["dashboard:read", "ventas:all"],
  isActive: true
}
```

**3. Security Rules**
```javascript
// Test Firestore rules in Firebase Console
// Go to Firestore > Rules > Simulator
// Test with actual user UID and document path
```

### **Data Loss or Corruption**

#### **Symptom**: Sales data missing or incorrect
```bash
# Check symptoms:
- Empty dashboard
- Incorrect totals
- Missing sales records
- Cache showing stale data
```

#### **Emergency Response**:

**1. Immediate Assessment**
```typescript
// Check cache vs Firebase data
import { CacheService } from '@/services/CacheService'
import { SalesService } from '@/services/SalesService'

// Compare cached vs fresh data
const cachedData = CacheService.get('sales:2025-08-21')
const freshData = await SalesService.getSalesByDate('2025-08-21')

console.log('Cache:', cachedData)
console.log('Firebase:', freshData)
```

**2. Data Recovery**
```bash
# Check Firebase Console for recent changes
# Go to Firestore > Usage tab
# Look for unusual read/write patterns

# Restore from backup if available
firebase firestore:import backup-2025-08-21.json
```

**3. Cache Reset**
```typescript
// Clear all caches
CacheService.clearAll()
localStorage.clear()
sessionStorage.clear()

// Force fresh data load
window.location.reload()
```

## ⚠️ Warning Issues (🟡)

### **Performance Degradation**

#### **Symptom**: Slow loading, high Firebase usage
```bash
# Performance indicators:
- Page load >5 seconds
- Firebase reads >10,000/day
- Cache hit rate <70%
- Bundle size >1MB
```

#### **Solutions**:

**1. Cache Analysis**
```typescript
// Check cache performance
import { CacheService } from '@/services/CacheService'

const stats = CacheService.getCacheStats()
console.log('Cache Hit Rate:', stats.hitRate)
console.log('Firebase Requests Today:', stats.firebaseRequests)

// If hit rate <70%, investigate cache configuration
```

**2. Bundle Size Optimization**
```bash
# Analyze bundle
npm run build
npm run analyze

# Common fixes:
# - Remove unused dependencies
# - Add dynamic imports for large components
# - Optimize images and assets
```

**3. Firebase Optimization**
```typescript
// Implement proper pagination
const salesQuery = query(
  collection(db, 'sales'),
  orderBy('timestamp', 'desc'),
  limit(50) // Don't load all records at once
)

// Use cached service instead of direct Firebase
import { CachedSalesService } from '@/services/SalesService.cached'
```

### **Cache Inconsistencies**

#### **Symptom**: Users see outdated data
```bash
# Signs of cache issues:
- Different users see different data
- Data doesn't update after changes
- Dashboard shows wrong totals
- Inconsistent between browser tabs
```

#### **Solutions**:

**1. Cache Investigation**
```typescript
// Check cache status
const cacheKey = 'sales:2025-08-21'
const cached = CacheService.get(cacheKey)
const metadata = CacheService.getMetadata(cacheKey)

console.log('Cached data:', cached)
console.log('Cache age:', Date.now() - metadata.timestamp)
console.log('TTL remaining:', metadata.ttl - (Date.now() - metadata.timestamp))
```

**2. Force Cache Refresh**
```typescript
// Admin panel solution
const handleCacheRefresh = async () => {
  // Clear specific cache
  CacheService.invalidatePattern('sales:*')
  
  // Force fresh data load
  await dispatch(fetchSales({ forceRefresh: true }))
  
  toast.success('Cache refreshed successfully')
}
```

**3. Cache Configuration Check**
```typescript
// Verify cache settings
const config = CacheService.getConfig()
console.log('Cache TTL:', config.defaultTTL)
console.log('Max size:', config.maxSize)
console.log('Current size:', CacheService.size())
```

### **UI/UX Issues**

#### **Symptom**: Layout broken, mobile issues
```bash
# Common UI problems:
- Sidebar doesn't collapse on mobile
- Forms don't validate properly
- Charts don't render
- Loading states stuck
```

#### **Solutions**:

**1. Responsive Design Check**
```bash
# Test responsive breakpoints
# Open Chrome DevTools
# Toggle device toolbar (Ctrl+Shift+M)
# Test at 320px, 768px, 1024px, 1920px
```

**2. Form Validation Debug**
```typescript
// Check React Hook Form state
const { formState: { errors, isValid } } = useForm()

console.log('Form errors:', errors)
console.log('Form valid:', isValid)
console.log('Form values:', getValues())
```

**3. Chart Rendering Issues**
```typescript
// Check Recharts data format
console.log('Chart data:', chartData)

// Verify data structure:
// - All required fields present
// - Numeric values are numbers, not strings
// - No null/undefined values
```

## 🟢 Minor Issues

### **Development Workflow Issues**

#### **Hot Reload Not Working**
```bash
# Solutions:
1. Restart dev server: Ctrl+C, npm run dev
2. Clear Vite cache: rm -rf node_modules/.vite
3. Check file watchers: echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
```

#### **ESLint/TypeScript Warnings**
```bash
# Fix ESLint issues
npm run lint
npm run lint:fix

# Fix TypeScript errors
npm run type-check
```

#### **Git Commit Issues**
```bash
# If pre-commit hooks fail
npm run lint:fix
npm run test
git add .
git commit -m "fix: resolve linting issues"
```

### **Deployment Issues**

#### **Firebase CLI Authentication**
```bash
# Re-authenticate
firebase logout
firebase login

# Check current project
firebase use
firebase projects:list
```

#### **Environment Variable Issues**
```bash
# Verify environment variables in CI/CD
# GitHub Actions: Settings > Secrets and variables > Actions
# Check all VITE_* variables are set

# Local development
grep "VITE_" .env.local
```

#### **Build Failures**
```bash
# Common solutions:
npm run clean
npm ci
npm run build

# Check for TypeScript errors
npm run type-check

# Check for circular dependencies
npx madge --circular src/
```

## 🔍 Debugging Strategies

### **Browser Console Debugging**

#### **Redux State Inspection**
```typescript
// In browser console (with Redux DevTools)
$r.store.getState()  // Current Redux state
$r.store.dispatch({ type: 'sales/clearError' })  // Dispatch action

// Component props inspection
$r.props  // Selected component props
$r.state  // Component state (if class component)
```

#### **Firebase Debugging**
```typescript
// Enable Firebase debug mode
localStorage.debug = 'firebase:*'

// Check current user
import { auth } from '@/services/firebase'
console.log('Current user:', auth.currentUser)

// Check Firestore connection
import { enableNetwork, disableNetwork } from 'firebase/firestore'
await disableNetwork(db)
await enableNetwork(db)
```

#### **Cache Debugging**
```typescript
// Enable cache debug mode
localStorage.setItem('cache-debug', 'true')

// View all cache entries
Object.keys(localStorage).filter(key => key.startsWith('cache:'))

// Cache size calculation
const cacheSize = Object.keys(localStorage)
  .filter(key => key.startsWith('cache:'))
  .reduce((size, key) => size + localStorage.getItem(key)?.length || 0, 0)

console.log('Total cache size:', Math.round(cacheSize / 1024), 'KB')
```

### **Network Debugging**

#### **Firebase Request Monitoring**
```javascript
// Monitor Firebase requests in Network tab
// Filter by:
// - firestore.googleapis.com (Firestore requests)
// - identitytoolkit.googleapis.com (Auth requests)
// - firebase.googleapis.com (General Firebase)

// Check request headers for authentication
// Verify response status codes
```

#### **API Response Validation**
```typescript
// Intercept Firebase responses
const originalFetch = window.fetch
window.fetch = function(...args) {
  console.log('Fetch request:', args[0])
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Fetch response:', response.status, args[0])
      return response
    })
}
```

### **Performance Debugging**

#### **Bundle Analysis**
```bash
# Generate bundle analysis
npm run build
npm run analyze

# Check for:
# - Large vendor chunks (>500KB)
# - Duplicate dependencies
# - Unused code
# - Large images/assets
```

#### **Memory Leak Detection**
```typescript
// Monitor memory usage
const memoryMonitor = () => {
  if (performance.memory) {
    console.log({
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    })
  }
}

// Run every 30 seconds
setInterval(memoryMonitor, 30000)
```

#### **React Performance**
```typescript
// Enable React DevTools Profiler
// Check for:
// - Unnecessary re-renders
// - Large component trees
// - Expensive computations
// - Missing React.memo/useMemo/useCallback

// Add to component for debugging
const renderCount = useRef(0)
renderCount.current++
console.log(`Component rendered ${renderCount.current} times`)
```

## 📞 Support Contacts

### **Emergency Escalation** (🔴 Critical Issues)
- **Technical Lead**: [Contact Information]
- **Firebase Support**: Firebase Console > Support
- **Hosting Provider**: Firebase Support Chat

### **Development Support** (🟡 Warning Issues)
- **Team Lead**: [Contact Information]
- **Code Review**: GitHub Issues
- **Documentation**: docs/ folder in repository

### **General Support** (🟢 Minor Issues)
- **Team Chat**: [Communication Channel]
- **Issue Tracking**: GitHub Issues
- **Knowledge Base**: This documentation

## 📋 Issue Reporting Template

### **Bug Report Template**
```markdown
## Bug Report

**Severity**: 🔴 Critical / 🟡 Warning / 🟢 Minor

**Environment**:
- Browser: [Chrome 119, Firefox 120, etc.]
- Device: [Desktop, Mobile, Tablet]
- User Role: [Operador, Supervisor, Admin]
- URL: [Specific page where issue occurs]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Screenshots/Videos**:
[Attach if helpful]

**Console Errors**:
```
[Paste any console errors]
```

**Additional Context**:
[Any other relevant information]
```

### **Performance Issue Template**
```markdown
## Performance Issue

**Symptoms**:
- [ ] Slow page load (>5 seconds)
- [ ] High Firebase usage
- [ ] Browser freezing
- [ ] Memory issues
- [ ] Other: ____________

**Browser Performance Tab Screenshot**:
[Attach Chrome DevTools Performance tab results]

**Network Tab Analysis**:
[List slow requests, large files, failed requests]

**System Information**:
- RAM: [8GB, 16GB, etc.]
- CPU: [Processor information]
- Network: [Wifi, 4G, etc.]
- Background tabs: [Number of open tabs]

**Metrics**:
- Page load time: ___ seconds
- Bundle size: ___ MB
- Firebase reads: ___ per day
- Cache hit rate: ___%
```

---

**Troubleshooting Status**: ✅ Comprehensive Guide Ready  
**Coverage**: Development, Firebase, Authentication, Cache, Performance, Deployment  
**Response Protocol**: Severity-based escalation procedures  
**Last Updated**: August 21, 2025
