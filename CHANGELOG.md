# Changelog

All notable changes to Casa Pronósticos project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] - 2025-11-03

### Added
- **SRS #3: Cambio de Rollo** (Complete Implementation)
  - Full CRUD operations for paper roll change tracking by machine
  - Event-based logging system for roll changes in machines 76 and 79
  - Monthly statistics with machine breakdown and frequency analysis
  - Time between changes calculation and average frequency metrics
  - Comprehensive UI with month picker, summary cards, and table view
  - CSV export functionality with full event data
  - Intelligent caching with 2hr TTL for event-based data
  - Services: `RollChangesService.ts`, `RollChangesService.cached.ts`
  - Hooks: `useCachedRollChanges.ts` with multiple data-fetching hooks
  - Module: `src/modules/operations/RollChanges.tsx`
  - Route: `/operations/roll-changes`
  - Hierarchical Firestore structure: `data/rollChanges/{year}/{month}/entries/{id}`
  - Permissions: `ROLLOS_CREATE`, `ROLLOS_READ`, `ROLLOS_UPDATE`, `ROLLOS_DELETE`, `ROLLOS_ALL`
  - Firestore rules: Operador+ can create/read, Supervisor+ can update/delete
  - Operador+ can create/read, Supervisor+ can update/delete
  - Updated sidebar navigation with "Cambios de Rollo" menu item
  - **Dashboard Integration**:
    - Added two insight cards showing last roll change dates per machine
    - "Último Cambio M76" card with emerald color theme displaying last change date
    - "Último Cambio M79" card with purple color theme displaying last change date
    - Quick action link to roll changes module with emerald hover effect
    - Integrated `useCachedMonthlyRollChanges` hook for real-time data
    - Date formatting in Spanish locale (Mexico City timezone)

- **Ticket Averages Chart Enhancement**
  - Added three separate trend lines in the ticket averages chart:
    - Overall average (blue dashed line) showing combined performance
    - Machine 76 average (green line) showing individual machine performance
    - Machine 79 average (purple line) showing individual machine performance
  - Lines use `connectNulls` to handle missing data gracefully
  - Increased chart height to 400px for better visibility
  - Color-coded lines match summary card colors for consistency

### Changed
- **Cache Service Enhancement**
  - Added `invalidateRollChangesData()` method to CacheManager
  - Roll changes cache invalidation with year/month specificity
  - Pattern-based cache invalidation: `rollChanges:.*:${year}-${month}`

### Fixed
- **Dashboard Tickets Sold Cards**
  - Removed interactive links from monthly and annual tickets sold insight cards
  - Cards now display as read-only data without navigation functionality
  - Maintains visual styling (cyan/teal colors) for consistency

- **Dashboard Roll Changes Insights**
  - Fixed insight cards to show last roll change across entire year instead of only current month
  - Now uses `useCachedRollChangesRange` hook to fetch data from January through current month
  - Displays most recent roll change date for each machine regardless of when it occurred
  - Properly handles empty data states with "Sin datos" fallback

---

## [2.3.0] - 2025-11-02

### Added
- **SRS #6: Promedio por Boleto** (Complete Implementation)
  - Full calculation module combining SRS #1 (sales) and SRS #5 (tickets) data
  - Automatic daily average calculations per machine
  - Monthly statistics with best/worst day identification
  - Comprehensive UI with month picker and summary cards
  - Trend chart visualization using Recharts (line chart)
  - Detailed table showing daily breakdown by machine
  - CSV export functionality with full daily data
  - Intelligent caching with adaptive TTL (1hr current, 2hr historical)
  - Services: `TicketAveragesService.ts`, `TicketAveragesService.cached.ts`
  - Hook: `useCachedTicketAverages.ts` with multiple data-fetching hooks
  - Route: `/finances/ticket-averages`
  - Dashboard integration with quick action link
  - Hierarchical Firestore structure: `data/ticketAverages/{year}/{month}/entries`
  - Supervisor+ access only
  - Permissions: `PROMEDIO_BOLETO_READ`, `PROMEDIO_BOLETO_WRITE`, `PROMEDIO_BOLETO_ALL`

- **SRS #10: Mismo Día y Hora Comparison** (Planned)
  - New comparison mode for sales comparison: "Mismo Día y Hora" (Same Day and Hour)
  - Compare sales at specific day+hour combination across custom date ranges
  - Example: Compare all Mondays at 5 PM over last 8 weeks
  - Features planned:
    - Hour selector (0-23) with friendly labels (e.g., "5 PM", "17:00")
    - Day of week selector (Lunes through Domingo)
    - Date range selector with start and end date pickers
    - Quick selections: "Últimas 4/8/12 semanas", "Último 1/3 meses"
    - Date validation: end date >= start date, max 6 months range
    - Line or bar chart visualization showing trend over time
    - Table view with full date breakdown
    - Machine filter for combined or individual breakdown
    - Occurrence counter (e.g., "10 lunes encontrados")
    - Smart data fetching: only queries months within selected range
  - Use cases: Track Monday evening trends, Friday peak hours, weekend patterns, seasonal analysis, promotional effectiveness
  - Will leverage existing SRS #1 data with 1hr cache TTL
  - Documentation: Updated SRS_REQUIREMENTS.md and srs.json

### Fixed
- **Browser Console Warnings**
  - Removed `X-Frame-Options` from HTML meta tags (must be set via HTTP headers)
  - Fixed Redux selector rerender warnings by memoizing `usePermissions` selector with `createSelector`
  - Added React Router v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`) to suppress migration warnings

---

## [2.2.0] - 2025-11-02

### Added
- **SRS #5: Boletos Vendidos - Comparison Features**
  - Complete comparison module with four modes: day, week, month, and weekday
  - TicketsComparisonChart component for interactive visualizations (line/bar charts)
  - Weekday comparison mode to analyze same day-of-week across multiple weeks
  - Quick selection buttons for 8/12 week comparisons in weekday mode
  - Chart/table visibility toggles with localStorage persistence
  - CSV export for all comparison modes
  - Route: `/finances/tickets/comparison` with navigation integration

### Fixed
- **Timezone Consistency Across Application**
  - Fixed x-axis labels showing incorrect day in comparison charts
  - Charts now correctly parse dates in Mexico City timezone to prevent day shift
  - Date inputs and selectors now use Mexico City timezone consistently
  - Modal date defaults now respect Mexico City timezone
  - Quick date selections (today, yesterday, last 7 days, etc.) now use Mexico timezone
  - Added utility functions: `getTodayInMexico()`, `getYesterdayInMexico()`, `getCurrentYearMonthInMexico()`, `formatDateInMexico()`
  - Affected components: SalesComparisonChart, TicketsComparisonChart, WeekdayHourChart, SalesComparison, PaidPrizes, Tickets, TicketsComparison, Commissions
  - All date operations now consistently use America/Mexico_City timezone

### Changed
- Enhanced dashboard with paid prizes insights (monthly and annual)
- Updated documentation with dashboard KPI details
- **Tickets Module UX Improvements**
  - Weekly summary clarification: totals only include days within selected month
  - Modal date defaulting: uses selected month's first day instead of today's date
  - Improved user experience when adding entries to historical months
- **Commissions Insights - Improved Calculations**
  - Dashboard commission totals now use Tira (paperTotal) instead of LN (systemTotal)
  - Commissions page comparative analysis insights now use Tira values
  - Monthly average calculation now adapts to elapsed months (current year only)
  - Updated label from "Promedio Anual" to "Promedio Mensual" for accuracy
  - For current year: average divides by months elapsed (1-11 in November)
  - For past years: average continues to use all 12 months
- **Sidebar Navigation**
  - Delete SRS ids from sidebar items for cleaner UI

---

## [2.1.0] - 2025-10-29

### Added
- **SRS #8: Boletos Premiados Pagados** (Complete Implementation)
  - Full CRUD operations for paid prizes tracking
  - Machine breakdown (76/79) with separate totals
  - Weekly aggregation with ISO week format (YYYY-Www)
  - Month picker with quick navigation (current/previous/next)
  - Summary cards with machine-specific totals
  - Weekly summary table with per-machine breakdown
  - Detailed entries table with machine column
  - CSV export functionality
  - Intelligent caching with adaptive TTL (1hr current, 2hr historical)
  - Hierarchical Firestore structure: `data/paidPrizes/{year}/{month}/entries`
  - Dashboard integration with monthly paid prizes card
  - Supervisor and Admin access only
- **Cache System Enhancements**
  - Added paid prizes cache configuration (PAID_PRIZES_WEEKLY, PAID_PRIZES_MONTHLY)
  - Cache key generators for monthly and weekly lists
  - `invalidatePaidPrizesData` method for automatic cache invalidation
- **React Hooks**
  - `useCachedMonthlyPaidPrizes`: Fetch all prizes for a month
  - `useCachedWeeklyPaidPrizes`: Fetch prizes by ISO week
  - `useCachedWeeklyTotals`: Get weekly aggregations
  - `useCachedMonthlyTotals`: Get monthly totals with machine breakdown

### Changed
- Updated Firestore security rules for `data/paidPrizes` collection
- Enhanced sidebar navigation with SRS #8 badge
- Improved routing with `/finances/paid-prizes` route
- Updated documentation (README, SRS_REQUIREMENTS, srs.json) for 44% completion

### Fixed
- Firestore permission errors for paid prizes collection
- Machine field integration across all service layers

---

## [2.0.0] - 2025-10-29

### Added
- **Sales Comparison Enhancements**
  - Weekday-hour comparison analysis mode ("Mismo Día y Hora")
  - Compare same day-of-week and hour across multiple weeks
  - Chart visualizations (line/bar) for all comparison modes
  - View toggles to show/hide charts and tables independently
  - localStorage persistence for user display preferences
- **Commission Features**
  - Chart visualization for annual commission comparison
  - View controls for chart/table visibility
  - Annual total display in commission module
- **Documentation Updates**
  - Comprehensive documentation for new comparison features
  - Updated UI_COMPONENTS.md with chart components
  - Enhanced SRS_REQUIREMENTS.md with weekday-hour details
  - Updated CACHE_SYSTEM.md with new cache patterns

### Fixed
- Chart mode toggle buttons not switching between line and bar views
- Data persistence across mode switches causing user confusion
- Custom day selection showing day after in sales comparison

---

## [1.8.0] - 2025-10-25

### Added
- **SRS #2: Monthly Commissions** (Complete Implementation)
  - Full CRUD operations for monthly commission tracking
  - Month picker with quick navigation (current/previous/next)
  - Year-over-year comparison table (all 12 months)
  - Insights cards (best month, worst month, annual average)
  - Dashboard integration with monthly and annual commission cards
  - Quick action link from dashboard to commissions
  - CSV export functionality
  - Intelligent caching with adaptive TTL (4hr)

### Changed
- Standardized commission routes to match sales pattern (`/finances/commissions`)
- Updated SRS and migration progress documentation for completed SRS #2
- Improved sales comparison with last 2 days comparison feature

### Fixed
- Sales comparison custom day selection showing incorrect date
- Cache invalidation and date handling for sales operations
- Machine ID handling when creating sales from hourly sale form
- Update/delete failures by using stored date field
- Commission month picker to enforce valid selection
- Comparison table month order (January to December)

---

## [1.7.0] - 2025-10-25

### Added
- Centralized delta calculation in UI via `computeHourlyDelta`
- Sales comparison feature for last 2 days
- Enhanced login error messaging

### Fixed
- Hours count calculation in sales module
- Cache invalidation for sales operations
- Date handling edge cases in sales service

---

## [1.6.0] - 2025-08-21

### Added
- **Intelligent Cache System** for Firebase optimization
  - Multi-layer caching architecture (sales, dashboard, user caches)
  - CacheService with LRU eviction and localStorage persistence
  - CachedSalesService wrapper with smart invalidation
  - React hooks: `useCachedDashboard`, `useCacheStats`, `useCachedSales`
  - Cache monitoring in dashboard with performance indicators
  - Expected 75-90% reduction in Firestore requests
- **Enhanced Admin Panel**
  - Cache management tab with full monitoring interface
  - Comprehensive cache statistics and controls
  - Manual cache invalidation and cleanup tools

### Changed
- **HourlySales Module Refactoring**
  - Reduced from 1,033 → 239 lines (77% reduction)
  - Component composition: SalesFilters, SalesTable, SalesForm, SalesStats, ExportTools
  - UI component system: Button, Card, Modal
  - Enhanced business logic validation
  - Async form validation with progressive totals
  - Future date/time prevention with Mexico timezone

### Fixed
- Removed 150+ console.log statements across services
- TypeScript type safety for timeout declarations

---

## [1.5.0] - 2025-08-21

### Added
- **Comprehensive Documentation Structure**
  - 14 complete documentation files in docs/ folder
  - Core docs: PROJECT_OVERVIEW, ARCHITECTURE, SRS_REQUIREMENTS
  - Implementation guides: AUTHENTICATION, UI_COMPONENTS, STATE_MANAGEMENT
  - Operational guides: DEPLOYMENT, TROUBLESHOOTING
  - Complete developer handoff documentation
- **GitHub Copilot Instructions**
  - Comprehensive project context for AI assistance
  - Architecture patterns and conventions

---

## [1.4.0] - 2025-08-21

### Added
- **Complete Migration to React + TypeScript**
  - React 18 with functional components and hooks
  - Redux Toolkit for centralized state management
  - Vite build system with hot reload
  - TailwindCSS for modern responsive styling
  - Firebase v9 SDK with improved tree-shaking
- **Enhanced Authentication & Security**
  - Role-based access control (RBAC)
  - Comprehensive security framework (CSP, XSS protection)
  - Domain validation and anti-phishing measures
  - Secure user management with permission system
- **Sales Management (SRS #1)**
  - Complete CRUD functionality for hourly sales
  - Automatic total calculations with real-time updates
  - Mexico City timezone handling
  - Sales comparison tool with flexible date selection
  - Edit functionality with automatic recalculation
- **Dashboard & Analytics**
  - Comprehensive dashboard with real-time data
  - Weekly sales tracking (Monday-to-today)
  - Parallel data loading for performance
  - Loading states and error handling
  - Responsive card-based layout
- **Admin Tools**
  - Backup/restore system for data management
  - Complete data export (users + sales)
  - Data validation and restore functionality
  - User management with role assignment
  - Comprehensive logging
- **Data Architecture**
  - Hierarchical Firestore structure: `data/sales/{year}/{month}/{day}`
  - Efficient batch processing
  - Data caching with CacheService
  - Error boundaries and fallback handling
  - Audit trails for operations
- **SEO & Privacy**
  - Comprehensive robots.txt for private application
  - No-index directives across search engines
  - security.txt for responsible disclosure
  - Custom domain support

### Changed
- Complete UI rewrite from vanilla JS to React
- New authentication flow with role assignment
- Data structure from flat to hierarchical collections
- API patterns from direct Firebase to service layer

### Fixed
- GitHub Actions compatibility (updated to Node 20)

### Breaking Changes
- Legacy components incompatible with new React architecture
- User accounts require re-setup with new role system
- New backup/restore system replaces legacy tools

---

## [1.3.0] - 2025-08-20

### Added
- Navigation system enhancements
  - Moved logout button from main content to sidebar footer
  - Enhanced user info display (email + role) in sidebar footer
  - Responsive logout button (icon + text / icon only)
- File structure reorganization
  - Moved core files to `js/core/` directory
  - Updated all imports and paths
  - Improved modular structure

### Fixed
- Deferred protected routing until after authentication
- Prevented premature "access denied" popup on page load
- Removed duplicate logout event listeners

---

## [1.2.0] - 2025-08-18

### Added
- **Progress Tracker Improvements**
  - Accurate progress calculations using actual hours
  - Auto-update progress on status/report commands
  - Sync command for manual recalculation
  - Real vs estimated hours in detailed reports
  - Enhanced help documentation
- **Role-Based Security System**
  - Comprehensive permissions system
  - Role hierarchy: operador < supervisor < admin
  - Permission mapping to SRS functionalities
  - Integration with authorizedUsers collection
  - Route protection in router
  - Role-based menu filtering

### Changed
- Simplified authorizedUsers collection path
- Updated Firestore rules for proper role validation
- Improved auth flow for unauthorized users
- Progress tracking now shows 27% (3/11 tasks completed)

### Fixed
- Circular reference in permissions.js
- Firestore segments error in collection paths
- Console errors with setup functions
- Import binding errors (added missing exports)
- Role-based Firestore security rules
- Auth flow to allow initial admin setup

---

## [1.1.0] - 2025-08-18

### Added
- **Navigation System (Phase 1, Task 1.1)**
  - SPA Router with route registration and history management
  - Sidebar navigation with role-based menu filtering
  - BaseModule class for consistent architecture
  - Dashboard module with KPIs and quick actions
  - HourlySales module (migrated functionality)
  - Collapsible sidebar with responsive design
- **Modular Architecture (Phase 1, Task 1.2)**
  - Generic data API supporting all 9 SRS functionalities
  - Dedicated modules with proper event handling
  - Enhanced Firestore rules
  - Backward compatibility with legacy API

### Fixed
- Sidebar content overlap with proper CSS calculations
- Horizontal scroll bar elimination
- Nav-item styling for collapsed state
- Chart cloning issues in hourly sales
- Firebase permissions with correct appId
- Collection path to preserve existing data

---

## [1.0.0] - 2025-08-18

### Added
- **Project Foundation**
  - Comprehensive refactor plan and progress tracking system
  - `refactor-plan.json` with complete architecture
  - `progress-tracker.js` script for monitoring development
  - 4-phase implementation plan for SRS requirements
  - Time estimation and blocker management

---

## [0.9.0] - 2025-08-16

### Fixed
- CSV import/export Firebase Timestamp compatibility
- Timezone handling in CSV operations

---

## [0.8.0] - 2025-08-15

### Added
- Full historical export functionality
- Import-compatible CSV format

### Fixed
- Missing validation helpers import (sanitizeInput ReferenceError)
- Event handling issues

---

## [0.7.0] - 2025-08-14

### Added
- **Security Enhancements**
  - Comprehensive measures to resolve Google Cloud phishing alert
  - Google Search Console verification file
  - Security headers and CSP policies
  - Domain validation
  - Anti-phishing measures
- Updated README with security information

---

## [0.6.0] - 2025-07-27

### Added
- **Environment-Based Configuration**
  - Removed hardcoded Firebase credentials
  - Environment variable support (.env)
  - GitHub Actions secrets injection
  - Automated setup script (setup.sh)
  - `.env.example` template
  - `.firebaserc.template` for project config

### Changed
- Auth.js uses environment-based Firebase config
- Updated deployment workflow
- Enhanced .gitignore for sensitive files
- Updated README with new setup process

### Security
- Repository now safe for public sharing
- Production credentials secured

---

## [0.5.0] - 2025-06-29

### Fixed
- Toast notification system (v1 and v2)

---

## [0.4.0] - 2025-06-28

### Added
- Login and logout functionality
- Tests for login authentication
- Import from CDN support

### Fixed
- Snyk vulnerabilities
- Test errors
- Toast notification issues

---

## [0.3.0] - 2025-06-08

### Added
- Edit dates functionality
- Delete registry functionality
- Unit tests for CRUD operations
- Comprehensive error handling
- Loading states
- Unitary tests

### Changed
- Improved optimization and scalability
- Separated code into JS modules

---

## [0.2.0] - 2025-06-08

### Added
- GitHub Action for Firebase deployment
- Workflows folder structure
- README documentation

### Changed
- Modified .gitignore
- Renamed workflows folder

---

## [0.1.0] - 2025-06-08

### Added
- Initial project setup
- First working version
- Basic sales tracking functionality
- Firebase integration
- Core application structure

---

## Project Metadata

**Repository**: gonthegeek/ventas-Pronosticos  
**Branch**: main  
**Technology Stack**: React 18, TypeScript, Firebase, Redux Toolkit, TailwindCSS, Vite  
**Current Status**: Phase 1 Complete (44% - SRS #1, #2, #4 implemented)

---

## Legend

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

**Last Updated**: October 29, 2025  
**Total Commits**: 80+  
**Project Duration**: June 2025 - October 2025 (Active Development)
