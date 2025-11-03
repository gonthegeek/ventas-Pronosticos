import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { RootState } from '../../state/store'
import { useCachedDashboard, useCacheStats, useCachePreloader } from '../../hooks/useCachedSales'
import { useCachedMonthlyCommissions } from '../../hooks/useCachedCommissions'
import { useCachedMonthlyTotals } from '../../hooks/useCachedPaidPrizes'
import { useCachedMonthlyTicketStats } from '../../hooks/useCachedTickets'
import { CommissionsService } from '../../services/CommissionsService'
import { PaidPrizesService } from '../../services/PaidPrizesService'
import TicketsService from '../../services/TicketsService'
import QuickSalesEntry from '../../components/sales/QuickSalesEntry'

/**
 * Dashboard Component - Main overview page with caching
 * Uses intelligent caching to minimize Firestore requests
 */
const Dashboard: React.FC = () => {
  const { userProfile } = useSelector((state: RootState) => state.auth)
  
  // Use cached dashboard data with auto-refresh every 10 minutes
  const {
    todaysSales,
    weekSales,
    monthSales,
    loading,
    lastUpdated,
    error,
    refresh
  } = useCachedDashboard(10)
  
  // Get current month commissions and paid prizes
  const nowMexico = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
  const currentYearMonth = `${nowMexico.getFullYear()}-${String(nowMexico.getMonth() + 1).padStart(2, '0')}`
  const { data: commissionsData, loading: commissionsLoading } = useCachedMonthlyCommissions(currentYearMonth)
  const { totals: paidPrizesTotals, loading: paidPrizesLoading } = useCachedMonthlyTotals(currentYearMonth)
  
  // Get current month tickets stats
  const { stats: ticketsStats, loading: ticketsLoading } = useCachedMonthlyTicketStats(currentYearMonth)
  
  // Calculate monthly commission total from Tira (paperTotal) instead of LN (systemTotal)
  const monthlyCommissionTotal = React.useMemo(() => {
    return commissionsData.reduce((sum, entry) => sum + (entry.paperTotal || 0), 0)
  }, [commissionsData])
  
  // Get annual commissions total
  const [annualCommissionTotal, setAnnualCommissionTotal] = useState(0)
  const [annualLoading, setAnnualLoading] = useState(false)
  
  useEffect(() => {
    const loadAnnualCommissions = async () => {
      setAnnualLoading(true)
      try {
        const currentYear = nowMexico.getFullYear()
        let yearTotal = 0
        
        // Fetch all 12 months - using Tira (paperTotal) instead of LN (systemTotal)
        for (let month = 1; month <= 12; month++) {
          const monthData = await CommissionsService.list(currentYear, month)
          const monthTotal = monthData.reduce((sum, entry) => sum + (entry.paperTotal || 0), 0)
          yearTotal += monthTotal
        }
        
        setAnnualCommissionTotal(yearTotal)
      } catch (err) {
        console.error('Error loading annual commissions:', err)
      } finally {
        setAnnualLoading(false)
      }
    }
    
    loadAnnualCommissions()
  }, [commissionsData]) // Refresh when current month data changes
  
  // Get annual paid prizes total
  const [annualPaidPrizesTotal, setAnnualPaidPrizesTotal] = useState(0)
  const [annualPaidPrizesLoading, setAnnualPaidPrizesLoading] = useState(false)
  
  useEffect(() => {
    const loadAnnualPaidPrizes = async () => {
      setAnnualPaidPrizesLoading(true)
      try {
        const currentYear = nowMexico.getFullYear()
        let yearTotal = 0
        
        // Fetch all 12 months
        for (let month = 1; month <= 12; month++) {
          const monthData = await PaidPrizesService.list(currentYear, month)
          const monthTotal = monthData.reduce((sum, entry) => sum + (entry.amountPaid || 0), 0)
          yearTotal += monthTotal
        }
        
        setAnnualPaidPrizesTotal(yearTotal)
      } catch (err) {
        console.error('Error loading annual paid prizes:', err)
      } finally {
        setAnnualPaidPrizesLoading(false)
      }
    }
    
    loadAnnualPaidPrizes()
  }, [paidPrizesTotals]) // Refresh when current month data changes
  
  // Get annual tickets total
  const [annualTicketsTotal, setAnnualTicketsTotal] = useState(0)
  const [annualTicketsLoading, setAnnualTicketsLoading] = useState(false)
  
  useEffect(() => {
    const loadAnnualTickets = async () => {
      setAnnualTicketsLoading(true)
      try {
        const currentYear = nowMexico.getFullYear()
        let yearTotal = 0
        
        // Fetch all 12 months
        for (let month = 1; month <= 12; month++) {
          const monthStats = await TicketsService.getMonthlyStats(currentYear, month)
          yearTotal += monthStats.totalTickets
        }
        
        setAnnualTicketsTotal(yearTotal)
      } catch (err) {
        console.error('Error loading annual tickets:', err)
      } finally {
        setAnnualTicketsLoading(false)
      }
    }
    
    loadAnnualTickets()
  }, [ticketsStats]) // Refresh when current month data changes
  
  const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0)
  
  // Cache statistics for monitoring
  const { stats } = useCacheStats()
  
  // Preload cache on component mount
  const { preloaded, preloading } = useCachePreloader()
  
  const [showCacheStats, setShowCacheStats] = useState(false)
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenido a Casa Pronósticos
              </h2>
              <p className="text-gray-600">
                Conectado como: <span className="font-medium capitalize">{userProfile?.role.name}</span>
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Última actualización: {lastUpdated.toLocaleTimeString()}
                  {preloading && <span className="ml-2 text-blue-500">(Cargando caché...)</span>}
                  {preloaded && !preloading && <span className="ml-2 text-green-500">✓ Cached</span>}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-500 mt-1">
                  Error: {error}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Actualizando...
                  </span>
                ) : (
                  'Actualizar Datos'
                )}
              </button>
              
              {/* Cache stats toggle */}
              <button
                onClick={() => setShowCacheStats(!showCacheStats)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                title="Cache Statistics"
              >
                📊 Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Statistics Panel */}
      {showCacheStats && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Rendimiento de Caché
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-600">Eficiencia</div>
                <div className="text-2xl font-bold text-blue-900">{stats.efficiency}%</div>
                <div className="text-xs text-blue-600">Tasa de aciertos de caché</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-600">Consultas Evitadas</div>
                <div className="text-2xl font-bold text-green-900">{stats.requestsSaved}</div>
                <div className="text-xs text-green-600">Consultas de Firestore evitadas</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-purple-600">Sales Cache</div>
                <div className="text-2xl font-bold text-purple-900">{stats.sales.size}</div>
                <div className="text-xs text-purple-600">{stats.sales.efficiency}% hit rate</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-orange-600">Dashboard Cache</div>
                <div className="text-2xl font-bold text-orange-900">{stats.dashboard.size}</div>
                <div className="text-xs text-orange-600">{stats.dashboard.efficiency}% hit rate</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Beneficios de Caché:</strong> Se redujeron las consultas a Firestore en {stats.requestsSaved} consultas.
                Esto ayuda a mantenerse dentro de los límites del nivel gratuito de Firebase mientras se mantiene un rendimiento rápido.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ventas de Hoy
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <span className="text-green-600">
                        ${todaysSales?.toLocaleString() || '0'}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ventas de esta Semana
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <span className="text-purple-600">
                        ${weekSales?.toLocaleString() || '0'}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ventas de este Mes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <span className="text-blue-600">
                        ${monthSales?.toLocaleString() || '0'}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Commission Cards */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Comisiones del Mes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {commissionsLoading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <span className="text-indigo-600">
                        {numberFmt(monthlyCommissionTotal)}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Comisiones Anuales
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {annualLoading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <span className="text-amber-600">
                        {numberFmt(annualCommissionTotal)}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Premios Pagados (Mes)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {paidPrizesLoading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <span className="text-rose-600">
                        {numberFmt(paidPrizesTotals?.totalAmount || 0)}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Premios Pagados (Año)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {annualPaidPrizesLoading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <span className="text-pink-600">
                        {numberFmt(annualPaidPrizesTotal)}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Sold Cards */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Boletos Vendidos (Mes)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {ticketsLoading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <Link to="/finances/tickets" className="text-cyan-600 hover:text-cyan-700">
                        {(ticketsStats?.totalTickets || 0).toLocaleString()}
                      </Link>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Boletos Vendidos (Año)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {annualTicketsLoading ? (
                      <span className="text-gray-500">Cargando...</span>
                    ) : (
                      <Link to="/finances/tickets" className="text-teal-600 hover:text-teal-700">
                        {annualTicketsTotal.toLocaleString()}
                      </Link>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Current Hour
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Date().getHours()}:00
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Sales Entry */}
      <QuickSalesEntry />

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link 
              to="/sales/hourly" 
              className="block text-left p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Ventas por Hora</div>
                  <div className="text-sm text-gray-500">Registrar y ver ventas por hora</div>
                </div>
              </div>
            </Link>

            <Link 
              to="/finances/commissions" 
              className="block text-left p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="h-6 w-6 text-indigo-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Comisiones Mensuales</div>
                  <div className="text-sm text-gray-500">Registrar comisiones del mes</div>
                </div>
              </div>
            </Link>

            <Link 
              to="/finances/paid-prizes" 
              className="block text-left p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-500 hover:bg-rose-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="h-6 w-6 text-rose-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Premios Pagados</div>
                  <div className="text-sm text-gray-500">Registrar premios pagados</div>
                </div>
              </div>
            </Link>

            <Link 
              to="/finances/tickets" 
              className="block text-left p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="h-6 w-6 text-cyan-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Boletos Vendidos</div>
                  <div className="text-sm text-gray-500">Registrar boletos vendidos</div>
                </div>
              </div>
            </Link>
            
            <button className="text-left p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2-2V3a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 002 2v8a2 2 0 01-2 2h-6a2 2 0 00-2 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Reportes Diarios</div>
                  <div className="text-sm text-gray-500">Próximamente...</div>
                </div>
              </div>
            </button>
            
            {userProfile?.role.name === 'admin' && (
              <Link 
                to="/admin" 
                className="block text-left p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center">
                  <svg className="h-6 w-6 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Panel de Administración</div>
                    <div className="text-sm text-gray-500">Gestionar usuarios y permisos</div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
