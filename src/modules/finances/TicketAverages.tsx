import React, { useMemo, useState } from 'react'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import { Button } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useCachedDailyAverages, useCachedMonthlyAverageStats } from '../../hooks/useCachedTicketAverages'
import { getCurrentYearMonthInMexico } from '../../utils/timezone'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const defaultYearMonth = getCurrentYearMonthInMexico()

const currencyFmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)
const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n || 0)

/**
 * TicketAverages Module
 * SRS #6: Promedio por boleto
 * 
 * Calculates and displays average spending per ticket by combining:
 * - SRS #1 (Sales data)
 * - SRS #5 (Tickets sold data)
 */
const TicketAverages: React.FC = () => {
  const canRead = useHasPermission(PERMISSIONS.PROMEDIO_BOLETO_READ)
  
  const [yearMonth, setYearMonth] = useState<string>(defaultYearMonth)
  const { data: dailyAverages, loading, error, refresh } = useCachedDailyAverages(yearMonth)
  const { stats, loading: statsLoading, refresh: refreshStats } = useCachedMonthlyAverageStats(yearMonth)

  const parsedYM = useMemo(() => {
    const [y, m] = yearMonth.split('-')
    return { year: parseInt(y, 10), month: parseInt(m, 10) }
  }, [yearMonth])

  // Format month name for display
  const monthName = useMemo(() => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${monthNames[parsedYM.month - 1]} ${parsedYM.year}`
  }, [parsedYM])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!dailyAverages || dailyAverages.length === 0) return []
    
    // Group by date for chart (combine machines)
    const dateMap = new Map<string, { date: string; avgPerTicket: number; totalSales: number; totalTickets: number }>()
    
    dailyAverages.forEach(day => {
      const existing = dateMap.get(day.date) || { 
        date: day.date, 
        avgPerTicket: 0, 
        totalSales: 0, 
        totalTickets: 0 
      }
      existing.totalSales += day.totalSale
      existing.totalTickets += day.ticketsSold
      existing.avgPerTicket = existing.totalTickets > 0 ? existing.totalSales / existing.totalTickets : 0
      dateMap.set(day.date, existing)
    })
    
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [dailyAverages])

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-red-600">No tienes permiso para ver Promedio por Boleto.</div>
        </Card>
      </div>
    )
  }

  const getMexicoYearMonth = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const getPrevYearMonth = (ym: string) => {
    const [y, m] = ym.split('-').map((v) => parseInt(v, 10))
    const d = new Date(y, m - 1, 1)
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const getNextYearMonth = (ym: string) => {
    const [y, m] = ym.split('-').map((v) => parseInt(v, 10))
    const d = new Date(y, m - 1, 1)
    d.setMonth(d.getMonth() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const isBeforeCurrentMonth = () => yearMonth < getMexicoYearMonth()
  const handleThisMonth = () => {
    setYearMonth(getMexicoYearMonth())
  }
  const handlePrevMonth = () => setYearMonth(getPrevYearMonth(yearMonth))
  const handleNextMonth = () => setYearMonth(getNextYearMonth(yearMonth))

  const exportCSV = () => {
    if (!dailyAverages || dailyAverages.length === 0) {
      return alert('No hay datos para exportar')
    }
    
    const headers = ['Fecha', 'Máquina', 'Boletos Vendidos', 'Ventas Totales', 'Promedio por Boleto']
    const rows = dailyAverages.map(d => [
      d.date,
      d.machineId,
      d.ticketsSold,
      d.totalSale,
      d.averagePerTicket.toFixed(2)
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = `promedio_boleto_${yearMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    refresh()
    refreshStats()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Promedio por Boleto</h2>
          <p className="text-sm text-gray-600 mt-1">
            Análisis del promedio de venta por boleto (SRS #6)
          </p>
        </div>
      </div>

      {/* Month Selector & Actions */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Mes Seleccionado</h3>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Mes:</label>
              <input
                type="month"
                value={yearMonth}
                required
                onChange={(e) => {
                  const v = e.target.value
                  if (/^\d{4}-\d{2}$/.test(v)) {
                    setYearMonth(v)
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
                ← Anterior
              </Button>
              {isBeforeCurrentMonth() && (
                <Button variant="secondary" size="sm" onClick={handleNextMonth}>
                  Siguiente →
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={handleThisMonth}>
                Este Mes
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleRefresh}>
                🔄 Actualizar
              </Button>
              <Button variant="secondary" size="sm" onClick={exportCSV}>
                📥 Exportar CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {(loading || statsLoading) && (
        <Card>
          <div className="p-6 flex justify-center">
            <LoadingSpinner />
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <div className="p-6 text-red-600">Error: {error}</div>
        </Card>
      )}

      {/* Summary Cards */}
      {!loading && !statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Promedio General</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {currencyFmt(stats.overallAverage)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {numberFmt(stats.totalTickets)} boletos • {currencyFmt(stats.totalSales)} ventas
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Máquina 76</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {currencyFmt(stats.machine76Average)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Promedio por boleto</div>
            </div>
          </Card>
          
          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Máquina 79</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {currencyFmt(stats.machine79Average)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Promedio por boleto</div>
            </div>
          </Card>
          
          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Mejor Día</div>
              {stats.bestDay ? (
                <>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {currencyFmt(stats.bestDay.averagePerTicket)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.bestDay.date} • Máq. {stats.bestDay.machineId}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400 mt-1">Sin datos</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Trend Chart */}
      {!loading && !statsLoading && chartData.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Tendencia del Promedio por Boleto - {monthName}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const parts = value.split('-')
                    return `${parts[2]}/${parts[1]}`
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value: any) => currencyFmt(value)}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgPerTicket" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Promedio por Boleto"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Detailed Table */}
      {!loading && !statsLoading && dailyAverages && dailyAverages.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Detalle Diario por Máquina - {monthName}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Máquina</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Boletos</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ventas</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Promedio</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyAverages.map((day, idx) => (
                    <tr key={`${day.date}-${day.machineId}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{day.date}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          day.machineId === '76' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {day.machineId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{numberFmt(day.ticketsSold)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{currencyFmt(day.totalSale)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                        {currencyFmt(day.averagePerTicket)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !statsLoading && dailyAverages && dailyAverages.length === 0 && (
        <Card>
          <div className="p-6 text-center text-gray-600">
            <p className="mb-2">No hay datos para {monthName}</p>
            <p className="text-sm text-gray-500">
              Los promedios se calculan automáticamente a partir de las ventas y boletos vendidos.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Asegúrate de tener datos de ventas y boletos vendidos para este mes.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default TicketAverages
