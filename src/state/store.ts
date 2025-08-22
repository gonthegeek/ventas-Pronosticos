import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import salesSlice from './slices/salesSlice'
import uiSlice from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    sales: salesSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'auth/setUser',
          'auth/signIn/fulfilled',
          'auth/signOut/fulfilled',
          'auth/initializeAuth/fulfilled',
          'sales/setHourlySales',
        ],
        ignoredActionsPaths: ['payload', 'meta.arg', 'register', 'rehydrate'],
        ignoredPaths: ['auth.user', 'sales.hourlySales'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
