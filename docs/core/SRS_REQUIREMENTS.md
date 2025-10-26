# Casa Pronósticos - System Requirements Specification (SRS)

> **📊 Complete SRS Documentation** - All 9 core functionalities with implementation details

## 📋 SRS Overview

Casa Pronósticos implements 9 core System Requirements Specifications (SRS) for comprehensive sales and lottery management. Each SRS represents a specific business functionality with defined data structures, user interfaces, and system behaviors.

**Current Status**: 2 of 9 SRS implemented (44% complete)  
**Architecture**: React + TypeScript + Firebase + Intelligent Cache  
**Implementation Approach**: Modular, cache-optimized, hierarchical data structure

## 🎯 SRS Implementation Status

### ✅ **IMPLEMENTED (2 of 9)**

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
- **Status**: Smart Implementation Complete
- **Module**: `src/modules/sales/SalesComparisonPage.tsx` + `src/components/sales/SalesComparison.tsx`
- **Implementation Approach**: Intelligent aggregation from existing SRS #1 data
- **Data Source**: Calculated on-demand from hourly sales (no separate collection)
- **Cache Strategy**: Leverages existing sales cache + calculation caching

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
```

### 🔄 **PENDING (7 of 9)**

#### **SRS #2: Comisiones mensuales**
- **Status**: Not Started
- **Target Module**: `src/modules/finances/Commissions.tsx`
- **Collection**: `data/commissions/{year}/{month}/{commissionId}`
- **Cache Strategy**: 4hr TTL, monthly data aggregation
- **Purpose**: Monthly comparison between system records vs paper records

**Fields**:
```typescript
interface CommissionsData {
  id?: string
  date: string            // YYYY-MM
  machineId: '76' | '79'
  totalSystem: number     // System-recorded total
  totalPaper: number      // Paper-recorded total
  difference: number      // Calculated: totalSystem - totalPaper
  operatorId: string
  notes?: string
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

#### **SRS #5: Boletos vendidos**
- **Status**: Not Started
- **Target Module**: `src/modules/finances/Tickets.tsx`
- **Collection**: `data/tickets/{year}/{month}/{ticketId}`
- **Cache Strategy**: 2hr TTL, daily aggregation
- **Purpose**: Track tickets sold by machine with daily/weekly aggregation

**Fields**:
```typescript
interface TicketsData {
  id?: string
  week: string            // YYYY-Www format
  date: string            // YYYY-MM-DD
  machineId: '76' | '79'
  ticketsDay: number      // Tickets sold that day
  ticketsTotal: number    // Calculated weekly total
  operatorId: string
  timestamp: Date
  createdAt: Date
}
```

**Features**:
- Daily ticket tracking
- Weekly total calculations
- Machine breakdown analysis
- Historical ticket trends
- Export functionality
- Role-based access (Operador+)

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

#### **SRS #8: Boletos premiados pagados**
- **Status**: Not Started
- **Target Module**: `src/modules/finances/PaidPrizes.tsx`
- **Collection**: `data/paidPrizes/{year}/{month}/{prizeId}`
- **Cache Strategy**: 2hr TTL, weekly aggregation
- **Purpose**: Track paid out prize tickets with weekly reconciliation

**Fields**:
```typescript
interface PaidPrizesData {
  id?: string
  date: string            // YYYY-MM-DD
  week: string            // YYYY-Www format
  amountPaid: number      // Total amount paid out
  ticketCount: number     // Number of tickets paid
  operatorId: string
  timestamp: Date
  createdAt: Date
}
```

**Features**:
- Payment tracking
- Weekly aggregation
- Prize reconciliation
- Payout analytics
- Export functionality
- Role-based access (Supervisor+)

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
- Monthly commission differences
- System vs paper accuracy
- Commission trends

#### **SRS #3 Contributions**
- Roll change frequency
- Time between changes
- Machine reliability metrics

#### **SRS #4 Contributions**
- Daily/weekly trends
- Day-of-week performance
- Monthly comparisons

#### **Remaining SRS Contributions**
- #5: Ticket sales trends
- #6: Average spending patterns
- #7: Prize distribution analysis
- #8: Payout tracking
- #9: Jackpot accumulation trends

## 🚀 Implementation Priority

### **Phase 2: Core Business Functions (Next)**
1. **SRS #2 (Comisiones mensuales)** - High priority financial tracking
2. **SRS #8 (Boletos premiados pagados)** - Prize tracking
3. **SRS #5 (Boletos vendidos)** - Foundation for SRS #6

### **Phase 3: Advanced Features**
4. **SRS #6 (Promedio por boleto)** - Depends on SRS #5
5. **SRS #7 (Raspados premiados)** - Lottery management
6. **SRS #9 (Primeros lugares)** - Jackpot management
7. **SRS #3 (Cambio de rollo)** - Operational necessity

### **Implementation Dependencies**
- SRS #6 requires SRS #5 (ticket data for averages)
- SRS #4 leverages SRS #1 (smart aggregation)
- Dashboard KPIs depend on multiple SRS for comprehensive metrics

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

**SRS Status**: 2 of 9 Complete (44%)  
**Next Implementation**: SRS #2 (Comisiones mensuales)  
**Reference**: SRS #1 (HourlySales) for implementation patterns  
**Last Updated**: August 21, 2025
