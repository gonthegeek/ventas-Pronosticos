# Casa Pronósticos - Deployment Guide

> **🚀 Production Deployment** - Firebase Hosting + CI/CD with GitHub Actions

## 📋 Deployment Overview

Casa Pronósticos uses Firebase Hosting for static asset deployment with automated CI/CD through GitHub Actions. The deployment strategy supports multiple environments (staging/production) with automated testing, building, and cache management.

**Hosting**: Firebase Hosting  
**CI/CD**: GitHub Actions  
**Environments**: Staging, Production  
**Domain**: Custom domain with SSL  

## 🏗️ Infrastructure Architecture

### **Hosting Stack**
```
Production Environment:
├── Firebase Hosting (Static Assets)
├── Firebase Firestore (Database)
├── Firebase Auth (Authentication)
├── Custom Domain with SSL
└── CDN (Firebase CDN)

Development/Staging:
├── Firebase Hosting (Preview Channels)
├── Firestore (Staging Database)
├── Firebase Auth (Staging)
└── GitHub Actions (CI/CD)
```

### **Environment Configuration**
```typescript
// Environment Variables Structure
interface Environment {
  // Firebase Configuration
  VITE_FIREBASE_API_KEY: string
  VITE_FIREBASE_AUTH_DOMAIN: string
  VITE_FIREBASE_PROJECT_ID: string
  VITE_FIREBASE_STORAGE_BUCKET: string
  VITE_FIREBASE_MESSAGING_SENDER_ID: string
  VITE_FIREBASE_APP_ID: string
  
  // Application Configuration
  VITE_APP_ENV: 'development' | 'staging' | 'production'
  VITE_APP_VERSION: string
  VITE_APP_BUILD_DATE: string
  
  // Feature Flags
  VITE_ENABLE_CACHE_DEBUG: boolean
  VITE_ENABLE_PERFORMANCE_MONITORING: boolean
  
  // Analytics
  VITE_GOOGLE_ANALYTICS_ID?: string
}
```

## 🔧 Build Configuration

### **Vite Production Config**
```typescript
// vite.config.ts (production optimizations)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  
  // Build optimizations
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: mode === 'production' ? false : true,
    
    // Chunk splitting for optimal caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['@reduxjs/toolkit', 'react-redux'],
          
          // Feature-based chunks
          auth: ['./src/components/auth', './src/services/AuthService'],
          sales: ['./src/modules/sales', './src/services/SalesService'],
          charts: ['recharts']
        },
        
        // Asset naming for cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    
    // Bundle size optimization
    minify: 'esbuild',
    
    // Asset size warnings
    chunkSizeWarningLimit: 1000,
    
    // Remove debug code in production
    define: {
      __DEV__: mode !== 'production',
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
      '@state': resolve(__dirname, './src/state')
    }
  },
  
  // Development server
  server: {
    port: 3000,
    host: true,
    open: true
  },
  
  // Preview server
  preview: {
    port: 4173,
    host: true
  }
}))
```

### **Firebase Configuration**
```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ],
    "redirects": [
      {
        "source": "/old-path",
        "destination": "/new-path",
        "type": 301
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"],
    "source": "functions"
  }
}
```

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          file: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_APP_ENV: production
          VITE_APP_VERSION: ${{ github.sha }}
          VITE_APP_BUILD_DATE: ${{ github.event.head_commit.timestamp }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-files
          path: dist/

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-files
          path: dist/

      - name: Deploy to Firebase Hosting (Staging)
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: casa-pronosticos-staging
          channelId: live

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-files
          path: dist/

      - name: Deploy to Firebase Hosting (Production)
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: casa-pronosticos-prod
          channelId: live

      - name: Create GitHub Release
        if: github.ref == 'refs/heads/main'
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            Deployed to production at ${{ github.event.head_commit.timestamp }}
            Commit: ${{ github.sha }}
          draft: false
          prerelease: false

  lighthouse:
    if: github.ref == 'refs/heads/main'
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://casapronosticos.com
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### **Preview Deployments**
```yaml
# .github/workflows/preview.yml
name: Deploy Preview

on:
  pull_request:
    branches: [ main ]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Deploy to Firebase Preview Channel
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: casa-pronosticos-staging
          expires: 7d
        id: firebase_hosting_preview

      - name: Comment PR with preview URL
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed to: ${{ steps.firebase_hosting_preview.outputs.details_url }}'
            })
```

## 🌍 Environment Management

### **Environment Files**
```bash
# .env.example
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Application config
VITE_APP_ENV=development
VITE_APP_VERSION=local
VITE_APP_BUILD_DATE=2025-08-21

# Feature flags
VITE_ENABLE_CACHE_DEBUG=true
VITE_ENABLE_PERFORMANCE_MONITORING=false

# Analytics (optional)
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

### **Environment-Specific Builds**
```typescript
// src/config/env.ts
const getEnvConfig = () => {
  const env = import.meta.env.VITE_APP_ENV || 'development'
  
  const baseConfig = {
    firebase: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    },
    app: {
      env,
      version: import.meta.env.VITE_APP_VERSION || 'unknown',
      buildDate: import.meta.env.VITE_APP_BUILD_DATE || new Date().toISOString()
    }
  }
  
  // Environment-specific overrides
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        features: {
          cacheDebug: false,
          performanceMonitoring: true,
          analytics: true
        },
        cache: {
          defaultTTL: 240, // 4 hours
          maxSize: 50
        }
      }
      
    case 'staging':
      return {
        ...baseConfig,
        features: {
          cacheDebug: true,
          performanceMonitoring: true,
          analytics: false
        },
        cache: {
          defaultTTL: 120, // 2 hours
          maxSize: 25
        }
      }
      
    default: // development
      return {
        ...baseConfig,
        features: {
          cacheDebug: true,
          performanceMonitoring: false,
          analytics: false
        },
        cache: {
          defaultTTL: 30, // 30 minutes
          maxSize: 10
        }
      }
  }
}

export const ENV_CONFIG = getEnvConfig()
```

## 🔒 Security Configuration

### **Content Security Policy**
```html
<!-- dist/index.html (injected during build) -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### **Firebase Security Rules**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User authentication
    match /authorizedUsers/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || isAdmin(request.auth.uid));
    }
    
    // Business data with role-based access
    match /data/{collection}/{year}/{month}/{document=**} {
      allow read: if isAuthenticated() && hasPermission(collection + ':read');
      allow create: if isAuthenticated() && hasPermission(collection + ':create') &&
        isValidData(resource.data);
      allow update: if isAuthenticated() && hasPermission(collection + ':update') &&
        isValidData(resource.data) && 
        resource.data.operatorId == request.auth.uid;
      allow delete: if isAuthenticated() && hasPermission(collection + ':delete');
    }
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin(uid) {
      return exists(/databases/$(database)/documents/authorizedUsers/$(uid)) &&
        get(/databases/$(database)/documents/authorizedUsers/$(uid)).data.role.name == 'admin';
    }
    
    function hasPermission(permission) {
      return permission in get(/databases/$(database)/documents/authorizedUsers/$(request.auth.uid)).data.permissions;
    }
    
    function isValidData(data) {
      return data.operatorId == request.auth.uid &&
        data.timestamp is timestamp &&
        data.createdAt is timestamp;
    }
  }
}
```

## 📊 Performance Monitoring

### **Web Vitals Tracking**
```typescript
// src/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export const initPerformanceMonitoring = () => {
  if (ENV_CONFIG.features.performanceMonitoring) {
    // Core Web Vitals
    getCLS(sendToAnalytics)
    getFID(sendToAnalytics)
    getFCP(sendToAnalytics)
    getLCP(sendToAnalytics)
    getTTFB(sendToAnalytics)
  }
}

const sendToAnalytics = (metric: any) => {
  // Send to Google Analytics or custom analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.value),
      non_interaction: true
    })
  }
  
  // Log to console in development
  if (ENV_CONFIG.app.env === 'development') {
    console.log('Performance metric:', metric)
  }
}
```

### **Bundle Analysis**
```json
// package.json scripts for bundle analysis
{
  "scripts": {
    "analyze": "npm run build && npx vite-bundle-analyzer dist",
    "lighthouse": "npx lighthouse http://localhost:4173 --view",
    "size-check": "npm run build && npx bundlesize"
  },
  "bundlesize": [
    {
      "path": "dist/assets/js/*.js",
      "maxSize": "500kb"
    },
    {
      "path": "dist/assets/css/*.css",
      "maxSize": "50kb"
    }
  ]
}
```

## 🚀 Deployment Commands

### **Local Development**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### **Firebase Deployment**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (one-time setup)
firebase init

# Deploy to staging
firebase hosting:channel:deploy staging --project=casa-pronosticos-staging

# Deploy to production
firebase deploy --project=casa-pronosticos-prod

# Deploy specific functions
firebase deploy --only functions,firestore:rules

# Deploy with custom message
firebase deploy -m "Deploy version 2.1.0"
```

### **Manual Deployment Steps**
```bash
# Complete manual deployment process
npm ci                    # Install dependencies
npm run test:coverage     # Run tests with coverage
npm run build            # Build for production
firebase deploy          # Deploy to Firebase

# Verify deployment
curl -I https://casapronosticos.com
npm run lighthouse       # Run Lighthouse audit
```

## 🔧 Troubleshooting

### **Common Deployment Issues**

#### **Build Failures**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json dist
npm install
npm run build

# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint
```

#### **Firebase Deployment Errors**
```bash
# Check Firebase project configuration
firebase projects:list
firebase use --add

# Verify authentication
firebase login:list
firebase logout && firebase login

# Check security rules syntax
firebase firestore:rules:validate
```

#### **Performance Issues**
```bash
# Analyze bundle size
npm run analyze

# Check for unused dependencies
npx depcheck

# Optimize images
npx @squoosh/cli --webp dist/assets/images/*.{jpg,png}
```

### **Rollback Procedures**
```bash
# List deployment history
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID

# Rollback to previous version
firebase hosting:clone casapronosticos:PREVIOUS_VERSION casapronosticos

# Emergency rollback (if needed)
git revert HEAD
git push origin main  # Triggers automatic deployment
```

---

**Deployment Status**: 🔄 CI/CD Ready | 🚀 Firebase Hosting Configured  
**Environments**: Staging + Production with preview channels  
**Performance**: Optimized with code splitting and caching  
**Last Updated**: August 21, 2025
