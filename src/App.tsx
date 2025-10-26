import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './state/hooks'
import { initializeAuth, setUser, setUserProfile } from './state/slices/authSlice'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { AuthService } from './services/AuthService'
import { initSecurity } from './utils/security'
import { useCachePreloader } from './hooks/useCachedSales'
import Layout from './components/Layout/Layout'
import Dashboard from './modules/dashboard/Dashboard'
import HourlySales from './modules/sales/HourlySales'
import SalesComparisonPage from './modules/sales/SalesComparisonPage'
import EnhancedAdminPanel from './components/admin/EnhancedAdminPanel'
import LoadingSpinner from './components/ui/LoadingSpinner'
import Commissions from './modules/finances/Commissions'

function App() {
  const dispatch = useAppDispatch()
  const { isLoading } = useAppSelector((state) => state.auth)
  
  // Preload cache on app startup for better performance
  const { preloaded, preloading } = useCachePreloader()

  useEffect(() => {
    // Initialize security measures first
    initSecurity()

    // Initialize auth and set up continuous auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userProfile = await AuthService.getUserProfile(user.uid)
          dispatch(setUser(user))
          dispatch(setUserProfile(userProfile))
        } catch (error) {
          dispatch(setUser(null))
          dispatch(setUserProfile(null))
        }
      } else {
        dispatch(setUser(null))
        dispatch(setUserProfile(null))
      }
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [dispatch])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sales/hourly" element={<HourlySales />} />
        <Route path="/sales/comparison" element={<SalesComparisonPage />} />
  <Route path="/comisiones" element={<Commissions />} />
        <Route path="/admin" element={<EnhancedAdminPanel />} />
        {/* Additional routes will be added as we migrate more modules */}
      </Routes>
    </Layout>
  )
}

export default App
