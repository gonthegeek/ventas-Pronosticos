# Casa Pronósticos - System Requirements Specification (SRS)

> **📊 Complete SRS Documentation** - All 10 core functionalities with implementation details

## 📋 SRS Overview

Casa Pronósticos implements 10 core System Requirements Specifications (SRS) for comprehensive sales and lottery management. Each SRS represents a specific business functionality with defined data structures, user interfaces, and system behaviors.

**Current Status**: 3 of 10 SRS implemented (33% complete)  
**Architecture**: React + TypeScript + Firebase + Intelligent Cache  
**Implementation Approach**: Modular, cache-optimized, hierarchical data structure

## 🎯 SRS Implementation Status

### ✅ **IMPLEMENTED (3 of 10)**

#### **SRS #1: Ventas por hora** ✅
- **Status**: Complete Implementation
- **Module**: `src/modules/sales/HourlySales.tsx`
- **Service**: `src/services/SalesService.ts` + `src/services/SalesService.cached.ts`
- **Collection**: `data/sales/{year}/{month}/{day}/{saleId}`
- **Cache Strategy**: 30-240min TTL, automatic invalidation
- **Features**: 
  - ✅ Complete CRUD operations
  - ✅ CSV export functionality
  - ✅ Sales comparisons and analysis
  - ✅ Real-time updates
  - ✅ Cache optimization
  - ✅ Mobile-responsive design

**Fields**:
```typescript
interface HourlySalesData {
  id?: string
  date: string           // YYYY-MM-DD
  hour: number          // 0-23
  machineId: '76' | '79'
  amount: number
  totalSales?: number   // Optional cumulative total
  operatorId: string
  notes?: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}
```

#### **SRS #4: Ventas diarias y semanales** ⭐ ✅
- **Status**: Smart Implementation Complete + Enhanced with Weekday-Hour Comparison
- **Module**: `src/modules/sales/SalesComparisonPage.tsx` + `src/components/sales/SalesComparison.tsx`
- **Implementation Approach**: Intelligent aggregation from existing SRS #1 data
- **Data Source**: Calculated on-demand from hourly sales (no separate collection)
- **Cache Strategy**: Leverages existing sales cache + calculation caching (1hr TTL for weekday-hour queries)

**Smart Features**:
- ✅ Daily totals calculation from hourly data
- ✅ Weekly pattern analysis (last N days of specific weekday)
- ✅ Monthly aggregations (this month, last month, year-to-date)
- ✅ Custom date range comparisons
- ✅ Quick selections (last 7/14 days, this/last month)
- ✅ Machine-specific breakdowns (76/79 totals)
- ✅ Peak hour identification
- ✅ Best/worst/average day statistics
- ✅ No duplicate data storage required
- ✅ **NEW: Weekday-Hour Comparison** - Compare same day-of-week and hour across multiple weeks
- ✅ **NEW: Chart Visualizations** - Line and bar charts for all comparison modes
- ✅ **NEW: View Controls** - Toggle chart/table visibility with persistence
- ✅ **NEW: User Preferences** - localStorage persistence for display preferences

**Weekday-Hour Comparison Mode** (New Feature):
```typescript
// Compare all Wednesdays at 21:00 for the last 8 weeks
interface WeekdayHourParams {
  dayOfWeek: 0-6           // 0=Sunday, 3=Wednesday, 6=Saturday
  hour: 0-23               // Hour of day to compare
  numberOfOccurrences: 4-12 // How many weeks back to compare
}

// Service method with caching
CachedSalesService.getWeekdayHourlyComparison(
  dayOfWeek: 3,           // Wednesday
  hour: 21,               // 21:00
  numberOfOccurrences: 8  // Last 8 weeks
)

// Returns array of ComparisonData for each matching occurrence
// Cache key: `weekday-hour-${dayOfWeek}-${hour}-${count}`
// TTL: 1 hour (historical data unlikely to change)
```

**UI Features**:
- Mode selector with 4 tabs: Custom, Weekly, Monthly, **Weekday-Hour**
- Dynamic selectors: Day of week dropdown, hour selector (0-23), week count
- Chart visualization with smart labeling (day names for ≤7 items, day numbers for ≤31, abbreviated dates for longer periods)
- Chart mode toggle: Line charts or bar charts
- View toggles: Show/hide chart and table independently
- Auto-refresh on data changes
- Data clearing when switching modes for cleaner UX

**localStorage Persistence**:
```typescript
// Keys used for preference storage
'salesComparison_showChart': 'true' | 'false'
'salesComparison_showTable': 'true' | 'false'
'salesComparison_chartMode': 'line' | 'bar'

// Survives browser refresh and provides consistent UX
```

**Calculated Fields**:
```typescript
interface DailyWeeklySalesData {
  date: string              // Calculated from hourly data
  dayOfWeek: number        // 0-6, calculated
  machineId: '76' | '79'   // Aggregated from hourly sales
  dailySale: number        // Sum of hourly amounts
  weeklySale: number       // Sum of daily totals
  peakHour: number         // Hour with highest sales
  machineBreakdown: {      // 76/79 breakdown
    '76': number
    '79': number
  }
}

interface ComparisonData {
  date: string              // Date of the comparison point
  displayName: string       // User-friendly label (e.g., "Mié 2024-01-10 - 21:00")
  totalSales: number        // Combined sales for both machines
  machine76: number         // Machine 76 specific total
  machine79: number         // Machine 79 specific total
  peakHour: number          // Hour with highest sales (or selected hour)
  peakAmount: number        // Amount at peak hour
  hourlyData: HourlySalesData[] // Full hourly breakdown if needed
}
```

**Example Use Cases**:
1. **Weekly Performance**: Compare this week vs last 3 weeks
2. **Monthly Trends**: Compare current month vs last month vs same month last year
3. **Peak Hour Analysis**: Compare all Fridays at 20:00 to identify consistent patterns
4. **Day-of-Week Patterns**: Compare all Mondays, Tuesdays, etc. at specific hours
5. **Custom Ranges**: Any date range for special events or promotions
6. **Hourly Cross-Week Analysis**: Compare same hour across all days of the week (e.g., 5 PM on Monday, Tuesday, Wednesday, etc.)

#### **SRS #2: Comisiones mensuales** ✅
- **Status**: Complete Implementation
- **Module**: `src/modules/finances/Commissions.tsx`
- **Service**: `src/services/CommissionsService.ts` + `src/services/CommissionsService.cached.ts`
- **Hook**: `src/hooks/useCachedCommissions.ts`
- **Route**: `/finances/commissions`
- **Collection**: `data/commissions/{year}/{month}/entries/{entryId}`
- **Cache Strategy**: 4hr TTL via financesCache (current month 2h, historical 6h)
- **Dashboard Integration**: Monthly and annual commission cards with quick action link

#### **SRS #8: Boletos premiados pagados** ✅
- **Status**: Complete Implementation
- **Module**: `src/modules/finances/PaidPrizes.tsx`
- **Service**: `src/services/PaidPrizesService.ts` + `src/services/PaidPrizesService.cached.ts`
- **Hook**: `src/hooks/useCachedPaidPrizes.ts`
- **Route**: `/finances/paid-prizes`
- **Collection**: `data/paidPrizes/{year}/{month}/entries/{entryId}`
- **Cache Strategy**: 2hr TTL via financesCache (current month 1h, historical 2h)
- **Firestore Rules**: Supervisor and Admin access only

**Features**:
- ✅ Complete CRUD operations for monthly commissions
- ✅ Month picker with quick navigation (current/previous/next month)
- ✅ Summary cards showing LN, Tira, and Diferencia totals
- ✅ Year-over-year comparison table (all 12 months)
- ✅ Insights cards (best month, worst month, annual average)
- ✅ Auto-refresh comparison on data changes
- ✅ CSV export functionality
- ✅ Dashboard integration with monthly and annual totals
- ✅ Intelligent caching with adaptive TTL

**Fields**:
```typescript
interface CommissionsData {
  id?: string
  year: number
  month: number          // 1-12
  machineId: '76' | '79'
  systemTotal: number    // System-recorded total (LN)
  paperTotal: number     // Paper-recorded total (Tira)
  difference: number     // Calculated: systemTotal - paperTotal
  notes?: string
  createdAt: Date
  updatedAt?: Date
}
```

  timestamp: Date
  createdAt: Date
}
```

**Features**:
- Monthly commission tracking
- System vs paper comparison
- Automatic difference calculation
- Historical trend analysis
- Export functionality
- Role-based access (Supervisor+)

**Fields**:
```typescript
interface PaidPrizeEntry {
  id?: string
  date: string           // YYYY-MM-DD
  week: string          // YYYY-Www format (ISO week)
  machineId: '76' | '79'
  amountPaid: number
  ticketCount: number
  notes?: string
  operatorId: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}
```

**Features**:
- ✅ Complete CRUD operations for paid prizes
- ✅ Month picker with quick navigation (current/previous/next month)
- ✅ Summary cards showing total amount, total tickets, and average per ticket
- ✅ Machine breakdown (76/79) with individual totals
- ✅ Weekly summary table with aggregated data by ISO week
- ✅ Detailed entries table with machine column
- ✅ Auto-calculated ISO week format (YYYY-Www)
- ✅ CSV export functionality with machine data
- ✅ Intelligent caching with adaptive TTL
- ✅ Role-based access (Supervisor+ only)
- ✅ Dashboard integration with monthly and annual paid prizes cards
- ✅ Quick action link from dashboard to paid prizes module

#### **SRS #4: Ventas diarias y semanales** ⭐ ✅

### 🔄 **PENDING (5 of 9)**

#### **SRS #10: Comparación de ventas por hora cross-semana** 🆕
- **Status**: Planned Enhancement to SRS #4
- **Target Module**: Enhancement to `src/modules/sales/SalesComparisonPage.tsx`
- **Implementation Approach**: New comparison mode in existing comparison component
- **Data Source**: Calculated from SRS #1 hourly sales data
- **Cache Strategy**: Leverages existing sales cache + calculation caching (1hr TTL)
- **Purpose**: Compare sales at the same hour across all days of the week to identify hourly patterns by weekday

**Comparison Mode**:
```typescript
// Compare sales at 5 PM (17:00) across all weekdays for a date range
interface HourlyWeekdayParams {
  hour: 0-23                    // Hour to compare (e.g., 17 for 5 PM)
  dayOfWeek: 0-6                // Specific day of week (0=Sun, 1=Mon, etc.)
  startDate: string             // Start date of range (YYYY-MM-DD)
  endDate: string               // End date of range (YYYY-MM-DD)
  includeAllMachines: boolean   // Combine or separate machine data
}

// Service method with caching
CachedSalesService.getHourlyWeekdayComparison(
  hour: 17,                     // 5 PM
  dayOfWeek: 1,                 // Monday
  startDate: '2024-10-01',      // Start of date range
  endDate: '2024-11-01',        // End of date range
  includeAllMachines: true      // Total for both machines
)

// Returns array of ComparisonData for each matching weekday+hour occurrence
// Cache key: `hourly-weekday-${hour}-${dayOfWeek}-${startDate}-${endDate}`
// TTL: 1 hour (historical data unlikely to change frequently)
```

**UI Features**:
- Mode selector: Add "Mismo Día y Hora" tab to existing comparison modes
- Hour selector: Dropdown for hours 0-23 (with friendly labels like "5 PM", "17:00", etc.)
- Day of week selector: Dropdown for specific weekday (Lunes, Martes, Miércoles, etc.)
- Date range selector: 
  - Start date and end date pickers for custom intervals
  - Quick selections: "Últimas 4 semanas", "Últimas 8 semanas", "Últimas 12 semanas", "Último mes", "Últimos 3 meses"
  - Date validation: ensure end date >= start date
  - Smart filtering: automatically finds all occurrences of selected day+hour within range
- Machine filter: Toggle for combined view or individual machine breakdown
- Chart visualization: Line or bar chart showing sales trend for selected day+hour across date range
- Table view: Detailed breakdown with date, weekday, hour, and sales columns
- Export: CSV download with hourly weekday data including full date information

**Chart Labels**:
- X-axis: Dates (abbreviated format for readability, e.g., "4 nov", "11 nov", "18 nov")
- Y-axis: Sales amount ($)
- Title: "Ventas [Día] a las [HH]:00 - [startDate] a [endDate]" (e.g., "Ventas Lunes a las 17:00 - 01 oct a 01 nov")
- Legend: Machine breakdown if separate view enabled
- Tooltip: Full date, weekday name, hour, and sales amount

**Calculated Fields**:
```typescript
interface HourlyWeekdayData {
  hour: number                  // Selected hour
  dayOfWeek: number            // 0-6 (0=Sun, 1=Mon, etc.)
  dayName: string              // "Lunes", "Martes", etc.
  date: string                 // Specific date (YYYY-MM-DD)
  displayLabel: string         // User-friendly label (e.g., "lun 4 nov")
  totalSales: number           // Combined sales for both machines at that hour
  machine76: number            // Machine 76 sales at that hour
  machine79: number            // Machine 79 sales at that hour
  hasSales: boolean            // Whether sales data exists for this hour/day
}
```

**Example Use Cases**:
1. **Monday Evening Trend**: Compare all Mondays at 6 PM over last 8 weeks to identify sales trend
2. **Friday Peak Analysis**: Compare all Fridays at 8 PM over last 3 months to validate peak hour
3. **Weekend Opening**: Compare all Saturdays at 10 AM over last 2 months for staffing decisions
4. **Holiday Impact**: Compare specific day+hour across custom date range including holidays
5. **Seasonal Patterns**: Compare same day+hour across quarters to identify seasonal trends
6. **Promotional Effectiveness**: Track Tuesday 5 PM sales before/during/after promotions

**Implementation Notes**:
- Reuse existing `SalesComparisonChart` component with new data shape
- Add new quick selections: "Últimas 4 semanas", "Últimas 8 semanas", "Últimas 12 semanas", "Último mes", "Últimos 3 meses"
- Date range validation: ensure end date >= start date, max range of 6 months for performance
- Smart data fetching: only query months within the selected date range to minimize Firestore reads
- Cache results per hour/dayOfWeek/dateRange combination with 1hr TTL
- Integrate with existing comparison filters and export tools
- Show occurrence count in UI (e.g., "10 lunes encontrados" - "10 Mondays found")

#### **SRS #3: Cambio de rollo**
- **Status**: Not Started
- **Target Module**: `src/modules/operations/RollChanges.tsx`
- **Collection**: `data/rollChanges/{year}/{month}/{changeId}`
- **Cache Strategy**: 2hr TTL, event-based caching
- **Purpose**: Track paper roll changes for each machine

**Fields**:
```typescript
interface RollChangesData {
  id?: string
  date: string            // YYYY-MM-DD
  machineId: '76' | '79'
  operatorId: string
  notes?: string          // Optional notes about the change
  timestamp: Date
  createdAt: Date
}
```

**Features**:
- Event logging for roll changes
- Machine tracking and history
- Time-based analytics
- Change frequency analysis
- Operator tracking
- Role-based access (Operador+)

#### **SRS #5: Boletos vendidos** ✅
- **Status**: Complete Implementation + Advanced Comparison Features
- **Module**: `src/modules/finances/Tickets.tsx`
- **Comparison Module**: `src/modules/finances/TicketsComparison.tsx`
- **Chart Component**: `src/components/sales/TicketsComparisonChart.tsx`
- **Service**: `src/services/TicketsService.ts` + `src/services/TicketsService.cached.ts`
- **Hook**: `src/hooks/useCachedTickets.ts`
- **Route**: `/finances/tickets` + `/finances/tickets/comparison`
- **Collection**: `data/tickets/{year}/{month}/entries/{ticketId}`
- **Cache Strategy**: 1-3hr adaptive TTL (current month 1h, historical 3h), weekly aggregation
- **Purpose**: Track tickets sold by machine with daily/weekly aggregation and comprehensive comparison tools

**Fields**:
```typescript
interface TicketEntry {
  id?: string
  date: string            // YYYY-MM-DD
  week: string            // YYYY-Www format (auto-calculated ISO week)
  machineId: '76' | '79'
  ticketsDay: number      // Tickets sold that day
  ticketsTotal: number    // Calculated weekly total for this machine
  operatorId: string
  notes?: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}
```

**Core Features** ✅:
- ✅ Complete CRUD operations with cross-month date handling
- ✅ Daily ticket tracking with machine breakdown
- ✅ Automatic ISO week calculation and weekly totals
- ✅ Month picker with navigation (current/previous/next)
- ✅ Summary cards: Total tickets, Machine 76/79 breakdown, Daily average
- ✅ Weekly summary table (with clarification for month-spanning weeks)
- ✅ Detailed entries table with inline edit/delete
- ✅ CSV export functionality
- ✅ Smart modal date defaulting (uses selected month instead of always today)
- ✅ Immediate stats refresh after CRUD operations
- ✅ Dashboard integration with monthly/annual KPI cards
- ✅ Role-based access (Operador+ can create/read, Supervisor+ can update/delete)

**Comparison Features** ⭐ NEW ✅:
- ✅ **Four Comparison Modes**:
  1. **Por Día**: Daily ticket comparison across custom date ranges
  2. **Por Semana**: Weekly total comparison with ISO week aggregation
  3. **Por Mes**: Monthly total comparison across multiple months
  4. **Por Día de la Semana**: Compare same weekday across multiple weeks (e.g., all Mondays)
  
- ✅ **Weekday Comparison Mode** - Analyze day-of-week patterns:
  - Select specific weekday (Lunes through Domingo)
  - Quick selections: Last 8 weeks, Last 12 weeks
  - Visual display: "lunes 4 nov", "lunes 11 nov", etc.
  - Identify consistent patterns by day of week

- ✅ **Interactive Visualizations**:
  - Line charts for trend analysis
  - Bar charts for direct comparisons
  - Chart mode toggle with persistence
  - Smart axis labels based on data volume
  - Color-coded machine breakdown

- ✅ **Advanced Filtering**:
  - Date range selection with validation
  - Quick date selections (last 7/30 days, this/last month, 3/6 months)
  - Machine filter (76, 79, or both)
  - Mode-specific quick selections

- ✅ **Data Management**:
  - CSV export for all comparison modes
  - Chart/table visibility toggles
  - localStorage preference persistence
  - Real-time data aggregation across months

**UX Enhancements**:
- Weekly summary clarification: "Totals only include days within selected month" note
- Table header: "Total Boletos (días en este mes)" for transparency
- Modal date defaults to selected month's first day (not today)
- Navigation: "Ver Comparaciones" button from main tickets page
- Back link from comparison page to main tickets view

**localStorage Persistence**:
```typescript
'ticketsComparison_chartMode': 'line' | 'bar'
'ticketsComparison_showChart': 'true' | 'false'
'ticketsComparison_showTable': 'true' | 'false'
```

#### **SRS #6: Promedio por boleto**
- **Status**: Not Started
- **Target Module**: `src/modules/finances/TicketAverages.tsx`
- **Collection**: `data/ticketAverages/{year}/{month}/{averageId}`
- **Cache Strategy**: 2hr TTL, calculated metrics
- **Purpose**: Calculate average spending per ticket with trend analysis

**Fields**:
```typescript
interface TicketAveragesData {
  id?: string
  week: string            // YYYY-Www format
  date: string            // YYYY-MM-DD
  machineId: '76' | '79'
  ticketsSold: number     // From SRS #5
  totalSale: number       // From SRS #1
  averagePerTicket: number // Calculated: totalSale / ticketsSold
  operatorId: string
  timestamp: Date
  createdAt: Date
}
```

**Features**:
- Automatic average calculations
- Trend analysis over time
- Machine comparison metrics
- Performance insights
- Export functionality
- Role-based access (Supervisor+)

#### **SRS #7: Raspados premiados**
- **Status**: Not Started
- **Target Module**: `src/modules/lottery/Scratches.tsx`
- **Collection**: `data/scratches/{year}/{month}/{scratchId}`
- **Cache Strategy**: 1hr TTL, event-based caching
- **Purpose**: Track scratch-off lottery prizes by lottery type

**Fields**:
```typescript
interface ScratchesData {
  id?: string
  date: string            // YYYY-MM-DD
  week: string            // YYYY-Www format
  lottery: string         // Lottery name/type
  winningTicket: string   // Winning ticket number
  prizeAmount: number     // Prize amount won
  operatorId: string
  timestamp: Date
  createdAt: Date
}
```

**Features**:
- Prize tracking by lottery type
- Lottery categorization
- Winner management
- Prize distribution analysis
- Export functionality
- Role-based access (Supervisor+)

#### **SRS #8: Boletos premiados pagados** ✅
- **Status**: Complete Implementation  
- **Module**: `src/modules/finances/PaidPrizes.tsx`
- **Service**: `src/services/PaidPrizesService.ts` + `src/services/PaidPrizesService.cached.ts`
- **Hook**: `src/hooks/useCachedPaidPrizes.ts`
- **Route**: `/finances/paid-prizes`
- **Collection**: `data/paidPrizes/{year}/{month}/entries/{prizeId}`
- **Cache Strategy**: 2hr TTL, weekly aggregation (current month 1h, historical 2h)
- **Firestore Rules**: Supervisor and Admin access only

**Fields**:
```typescript
interface PaidPrizeEntry {
  id?: string
  date: string            // YYYY-MM-DD
  week: string            // YYYY-Www format (ISO week)
  machineId: '76' | '79'  // Machine tracking
  amountPaid: number      // Total amount paid out
  ticketCount: number     // Number of tickets paid
  notes?: string          // Optional notes
  operatorId: string
  timestamp: Date
  createdAt: Date
  updatedAt?: Date
}
```

**Features**:
- ✅ Complete CRUD operations
- ✅ Payment tracking by machine (76/79)
- ✅ Weekly aggregation with ISO week format
- ✅ Monthly totals with machine breakdown
- ✅ Prize reconciliation analytics
- ✅ Payout analytics with averages
- ✅ CSV export functionality
- ✅ Intelligent caching with adaptive TTL
- ✅ Role-based access (Supervisor+)

#### **SRS #9: Primeros lugares de sorteos**
- **Status**: Not Started
- **Target Module**: `src/modules/lottery/FirstPlaces.tsx`
- **Collection**: `data/firstPlaces/{year}/{month}/{placeId}`
- **Cache Strategy**: 4hr TTL, event-based caching
- **Purpose**: Track lottery first place winners and jackpot accumulations

**Fields**:
```typescript
interface FirstPlacesData {
  id?: string
  date: string            // YYYY-MM-DD
  lottery: string         // Lottery name/type
  accumulatedJackpot: number // Jackpot amount
  winnerCount: number     // Number of winners
  operatorId: string
  timestamp: Date
  createdAt: Date
}
```

**Features**:
- Jackpot tracking
- Winner counting
- Accumulation management
- First place analytics
- Export functionality
- Role-based access (Supervisor+)

## 🏗️ Firebase Schema Design

### **Hierarchical Collection Structure**
All SRS implementations follow the hierarchical pattern for optimal performance and cost:

```
Firestore Collections:
├── /authorizedUsers/{userId}           # User authentication and roles
├── /data/sales/{year}/{month}/{day}   # ✅ SRS #1 - Hierarchical sales data
├── /data/commissions/{year}/{month}   # 🔄 SRS #2 - Monthly commissions
├── /data/rollChanges/{year}/{month}   # 🔄 SRS #3 - Roll changes
├── /data/tickets/{year}/{month}       # 🔄 SRS #5 - Tickets sold
├── /data/ticketAverages/{year}/{month} # 🔄 SRS #6 - Ticket averages
├── /data/scratches/{year}/{month}     # 🔄 SRS #7 - Scratch prizes
├── /data/paidPrizes/{year}/{month}    # 🔄 SRS #8 - Paid prizes
└── /data/firstPlaces/{year}/{month}   # 🔄 SRS #9 - First places
```

### **Schema Benefits**
- **Scalability**: Distributes data across time-based subcollections
- **Performance**: Reduces query size and improves cache efficiency
- **Cost Optimization**: Minimizes Firebase reads through intelligent partitioning
- **Cache Friendly**: Hierarchical structure aligns with cache strategies
- **Timezone Handling**: All dates in Mexico timezone (`America/Mexico_City`)

### **Common Field Standards**
All SRS implementations include these standard fields:
```typescript
interface StandardFields {
  id?: string           // Document ID (generated)
  operatorId: string    // User who created/modified record
  timestamp: Date       // Business timestamp (Mexico timezone)
  createdAt: Date       // System creation timestamp
  updatedAt?: Date      // System update timestamp (optional)
}
```

## 🔐 Role-Based Access Control

### **Permission Matrix**
| SRS | Operador | Supervisor | Admin | Notes |
|-----|----------|------------|-------|--------|
| #1 Ventas por hora | CREATE, READ | ALL | ALL | Core functionality |
| #2 Comisiones | READ | ALL | ALL | Financial data |
| #3 Cambio de rollo | CREATE, READ | ALL | ALL | Operational task |
| #4 Ventas diarias/semanales | READ | ALL | ALL | Calculated data |
| #5 Boletos vendidos | CREATE, READ | ALL | ALL | Ticket tracking |
| #6 Promedio por boleto | READ | ALL | ALL | Calculated metrics |
| #7 Raspados premiados | - | ALL | ALL | Lottery management |
| #8 Boletos premiados | - | ALL | ALL | Prize management |
| #9 Primeros lugares | - | ALL | ALL | Jackpot management |

### **Permission Implementation**
```typescript
// Permission constants for each SRS
export const SRS_PERMISSIONS = {
  // SRS #1
  VENTAS_CREATE: 'ventas:create',
  VENTAS_READ: 'ventas:read',
  VENTAS_UPDATE: 'ventas:update',
  VENTAS_DELETE: 'ventas:delete',
  VENTAS_ALL: 'ventas:all',
  
  // SRS #2
  COMISIONES_CREATE: 'comisiones:create',
  COMISIONES_READ: 'comisiones:read',
  COMISIONES_UPDATE: 'comisiones:update',
  COMISIONES_DELETE: 'comisiones:delete',
  COMISIONES_ALL: 'comisiones:all',
  
  // Continue for all SRS...
} as const
```

## ⚡ Cache Strategy by SRS

### **Cache TTL Guidelines**
| SRS | Data Type | TTL | Reason |
|-----|-----------|-----|--------|
| #1 | Historical Sales | 2-4 hours | Static historical data |
| #1 | Current Day | 30 minutes | Frequently updated |
| #2 | Monthly Commissions | 4 hours | Monthly aggregates |
| #3 | Roll Changes | 2 hours | Event-based updates |
| #4 | Daily/Weekly | Uses SRS #1 cache | Calculated data |
| #5 | Ticket Sales | 2 hours | Daily tracking |
| #6 | Ticket Averages | 2 hours | Calculated metrics |
| #7 | Scratch Prizes | 1 hour | Event-based |
| #8 | Paid Prizes | 2 hours | Weekly aggregates |
| #9 | First Places | 4 hours | Event-based |

### **Cache Invalidation Patterns**
```typescript
// Pattern for cache invalidation
const cacheInvalidationRules = {
  // When SRS #1 data changes
  onSalesUpdate: [
    'sales-*',           // Invalidate all sales cache
    'dashboard-*',       // Invalidate dashboard cache
    'daily-weekly-*'     // Invalidate SRS #4 calculations
  ],
  
  // When SRS #5 data changes
  onTicketsUpdate: [
    'tickets-*',         // Invalidate tickets cache
    'ticket-averages-*', // Invalidate SRS #6 calculations
    'dashboard-*'        // Invalidate dashboard KPIs
  ]
}
```

## 📊 KPI Dashboard Integration

### **Dashboard KPIs by SRS**
Each SRS contributes specific KPIs to the main dashboard:

#### **SRS #1 Contributions**
- Today's total sales (both machines)
- Current hour sales
- Peak hour identification
- Machine performance comparison

#### **SRS #2 Contributions**
- Monthly commission total (current month)
- Annual commission total (year-to-date)
- System vs paper accuracy
- Commission trends
- Quick action link to commissions

#### **SRS #8 Contributions**
- Monthly paid prizes total (current month)
- Annual paid prizes total (year-to-date)
- Machine breakdown (76/79)
- Prize payout tracking
- Quick action link to paid prizes

#### **SRS #3 Contributions**
- Roll change frequency
- Time between changes
- Machine reliability metrics

#### **SRS #4 Contributions**
- Daily/weekly trends
- Day-of-week performance
- Monthly comparisons

#### **SRS #5 Contributions**
- Monthly tickets sold total (current month)
- Annual tickets sold total (year-to-date)
- Machine breakdown (76/79)
- Daily average tickets
- Quick action link to tickets
- Weekday pattern analysis

#### **Remaining SRS Contributions**
- #3: Roll change frequency and machine reliability
- #6: Average spending patterns per ticket
- #7: Prize distribution and scratch lottery analysis
- #9: Jackpot accumulation and first place trends

## 🚀 Implementation Priority

### **Phase 2: Core Business Functions (Completed ✅)**
1. ✅ **SRS #2 (Comisiones mensuales)** - Financial tracking implemented
2. ✅ **SRS #8 (Boletos premiados pagados)** - Prize tracking implemented
3. ✅ **SRS #5 (Boletos vendidos)** - Complete with advanced comparison features

### **Phase 3: Advanced Features**
4. **SRS #10 (Mismo Día y Hora Comparison)** - Next: Enhancement to SRS #4 for hourly weekday pattern analysis with date ranges
5. **SRS #6 (Promedio por boleto)** - Depends on SRS #5 (now available)
6. **SRS #7 (Raspados premiados)** - Lottery management
7. **SRS #9 (Primeros lugares)** - Jackpot management
8. **SRS #3 (Cambio de rollo)** - Operational necessity

### **Implementation Dependencies**
- ✅ SRS #10 ready to implement (SRS #1 and #4 infrastructure available)
- ✅ SRS #6 ready to implement (SRS #5 ticket data now available)
- ✅ SRS #4 leverages SRS #1 (smart aggregation implemented)
- ✅ Dashboard KPIs enhanced with tickets data (SRS #5)
- Remaining dependencies clear for Phase 3

## 📋 Implementation Checklist

For each new SRS implementation:

### **Development Tasks**
- [ ] Create module structure following pattern
- [ ] Implement service layer with hierarchical collections
- [ ] Add cached service wrapper with appropriate TTL
- [ ] Create Redux slice for state management
- [ ] Add permission constants and role mappings
- [ ] Update navigation and routing
- [ ] Implement UI components with TailwindCSS
- [ ] Add form validation and error handling
- [ ] Implement export/import functionality
- [ ] Add dashboard KPI integration
- [ ] Create unit and integration tests

### **Quality Assurance**
- [ ] Test CRUD operations
- [ ] Verify cache integration works
- [ ] Test permission system
- [ ] Validate responsive design
- [ ] Check error handling
- [ ] Test export functionality
- [ ] Verify role-based access

### **Documentation**
- [ ] Update SRS documentation
- [ ] Add to migration progress
- [ ] Update API documentation
- [ ] Create user guide section

---

**SRS Status**: 5 of 10 Complete (50%) + 1 Enhancement Planned  
**Completed**: SRS #1 (Ventas), #2 (Comisiones), #4 (Comparación), #5 (Boletos), #8 (Premiados)  
**Next Implementation**: SRS #6 (Promedio por boleto) - Now ready with SRS #5 data available  
**New Enhancement**: SRS #10 (Hourly Cross-Week Comparison) - Extension to SRS #4 for hourly weekday pattern analysis  
**Reference**: Established patterns for hierarchical data, caching, permissions, and advanced comparisons  
**Last Updated**: November 2, 2025
