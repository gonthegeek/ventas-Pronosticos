import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// Types for sales data (migrated from legacy system)
export interface SaleEntry {
  id: string
  machineId: string // '76' or '79'
  amount: number
  totalSales?: number // Cumulative total on the machine
  timestamp: Date
  hour: number
  operatorId: string
  notes?: string
}

export interface HourlySalesData {
  hour: number
  machine76: number
  machine79: number
  total: number
  lastUpdated: string // Store as ISO string for Redux serialization
}

interface SalesState {
  hourlySales: HourlySalesData[]
  currentSale: Partial<SaleEntry>
  isLoading: boolean
  error: string | null
  selectedDate: string
}

const initialState: SalesState = {
  hourlySales: [],
  currentSale: {},
  isLoading: false,
  error: null,
  selectedDate: new Date().toISOString().split('T')[0],
}

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setHourlySales: (state, action: PayloadAction<HourlySalesData[]>) => {
      state.hourlySales = action.payload
    },
    updateCurrentSale: (state, action: PayloadAction<Partial<SaleEntry>>) => {
      state.currentSale = { ...state.currentSale, ...action.payload }
    },
    clearCurrentSale: (state) => {
      state.currentSale = {}
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const {
  setHourlySales,
  updateCurrentSale,
  clearCurrentSale,
  setSelectedDate,
  setLoading,
  setError,
} = salesSlice.actions

export default salesSlice.reducer
