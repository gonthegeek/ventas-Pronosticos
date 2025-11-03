import React, { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import { Button } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useCachedMonthlyTickets, useCachedMonthlyTicketStats } from '../../hooks/useCachedTickets'
import TicketsService from '../../services/TicketsService'
import { TicketEntry } from '../../services/TicketsService'
import { useAppSelector } from '../../state/hooks'

const nowMexico = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
const defaultYearMonth = `${nowMexico.getFullYear()}-${String(nowMexico.getMonth() + 1).padStart(2, '0')}`

const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n || 0)

const Tickets: React.FC = () => {
  const currentUser = useAppSelector((state) => state.auth.user)
  const canRead = useHasPermission(PERMISSIONS.BOLETOS_READ)
  const canWrite = useHasPermission(PERMISSIONS.BOLETOS_CREATE)

  const [yearMonth, setYearMonth] = useState<string>(defaultYearMonth)
  const { data, loading, error, refresh, create, update, remove } = useCachedMonthlyTickets(yearMonth)
  const { stats, loading: statsLoading, refresh: refreshStats } = useCachedMonthlyTicketStats(yearMonth)

  const [isModalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TicketEntry | null>(null)
  const [form, setForm] = useState<{ 
    date: string
    machineId: '76' | '79'
    ticketsDay: string
    notes: string 
  }>({ 
    date: nowMexico.toISOString().split('T')[0],
    machineId: '76', 
    ticketsDay: '', 
    notes: '' 
  })

  const parsedYM = useMemo(() => {
    const [y, m] = yearMonth.split('-')
    return { year: parseInt(y, 10), month: parseInt(m, 10) }
  }, [yearMonth])

  // Calculate totals from stats
  const totals = useMemo(() => {
    if (!stats) return { totalTickets: 0, machine76: 0, machine79: 0, dailyAverage: 0 }
    return {
      totalTickets: stats.totalTickets,
      machine76: stats.machine76,
      machine79: stats.machine79,
      dailyAverage: stats.dailyAverage
    }
  }, [stats])

  // Weekly breakdown for display
  const weeklyData = useMemo(() => {
    if (!stats?.weeklyBreakdown) return []
    return Array.from(stats.weeklyBreakdown.entries())
      .map(([week, total]) => ({ week, total }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }, [stats])

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-red-600">No tienes permiso para ver Boletos vendidos.</div>
        </Card>
      </div>
    )
  }

  const [saving, setSaving] = useState(false)
  
  const onSubmit = async () => {
    try {
      setSaving(true)
      const tickets = parseInt(form.ticketsDay)
      
      if (!form.date || isNaN(tickets) || tickets < 0) {
        alert('Por favor ingresa una fecha válida y un número de boletos')
        return
      }

      const payload = {
        date: form.date,
        machineId: form.machineId,
        ticketsDay: tickets,
        operatorId: currentUser?.uid || 'unknown',
        notes: form.notes || '',
        timestamp: new Date()
      }
      
      if (editing && editing.id) {
        await update(editing.id, editing, payload)
      } else {
        await create(payload)
      }
      
      // Refresh stats after successful operation
      await refreshStats()
      
      setModalOpen(false)
      setEditing(null)
      setForm({ 
        date: nowMexico.toISOString().split('T')[0],
        machineId: '76', 
        ticketsDay: '', 
        notes: '' 
      })
    } catch (e: any) {
      alert(e?.message || 'Error al guardar los boletos')
    } finally {
      setSaving(false)
    }
  }

  const exportCSV = () => {
    if (!data.length) return alert('No hay datos para exportar')
    const headers = ['Fecha', 'Semana', 'Máquina', 'Boletos Día', 'Total Semanal', 'Notas', 'Operador', 'Creado']
    const rows = data.map(e => [
      e.date,
      e.week,
      e.machineId,
      e.ticketsDay,
      e.ticketsTotal,
      e.notes || '',
      e.operatorId,
      e.createdAt.toISOString()
    ])
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = `boletos_${yearMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
  const handleThisMonth = () => setYearMonth(getMexicoYearMonth())
  const handlePrevMonth = () => setYearMonth(getPrevYearMonth(yearMonth))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Boletos Vendidos</h2>
          <p className="text-sm text-gray-600 mt-1">
            Registro diario de boletos vendidos por máquina (SRS #5)
          </p>
        </div>
        <Link to="/finances/tickets/comparison">
          <Button variant="secondary" size="sm">
            📊 Ver Comparaciones
          </Button>
        </Link>
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
                  } else if (v === '') {
                    setYearMonth(getMexicoYearMonth())
                  }
                }}
                onBlur={(e) => {
                  if (!/^\d{4}-\d{2}$/.test(e.target.value)) {
                    setYearMonth(getMexicoYearMonth())
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                max={getMexicoYearMonth()}
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleThisMonth} disabled={loading}>
                  Este mes
                </Button>
                <Button variant="ghost" size="sm" onClick={handlePrevMonth} disabled={loading}>
                  Mes anterior
                </Button>
                {isBeforeCurrentMonth() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setYearMonth(getNextYearMonth(yearMonth))}
                    disabled={loading}
                  >
                    Mes siguiente
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  await refresh()
                  await refreshStats()
                }} 
                disabled={loading}
              >
                🔄 Refrescar
              </Button>
              <Button variant="ghost" size="sm" onClick={exportCSV} disabled={!data.length}>
                📊 Exportar CSV
              </Button>
              {canWrite && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null)
                    // Default to first day of selected month, or today if viewing current month
                    const [year, month] = yearMonth.split('-').map(Number)
                    const currentYM = getMexicoYearMonth()
                    const isCurrentMonth = yearMonth === currentYM
                    
                    let defaultDate: string
                    if (isCurrentMonth) {
                      // Current month: use today's date
                      defaultDate = nowMexico.toISOString().split('T')[0]
                    } else {
                      // Past/future month: use first day of that month
                      defaultDate = `${yearMonth}-01`
                    }
                    
                    setForm({
                      date: defaultDate,
                      machineId: '76',
                      ticketsDay: '',
                      notes: ''
                    })
                    setModalOpen(true)
                  }}
                >
                  ➕ Agregar
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Boletos</div>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? '...' : numberFmt(totals.totalTickets)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Mes completo</div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-1">Máquina 76</div>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : numberFmt(totals.machine76)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {totals.totalTickets > 0
                ? `${((totals.machine76 / totals.totalTickets) * 100).toFixed(1)}% del total`
                : '0%'}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-1">Máquina 79</div>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : numberFmt(totals.machine79)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {totals.totalTickets > 0
                ? `${((totals.machine79 / totals.totalTickets) * 100).toFixed(1)}% del total`
                : '0%'}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-1">Promedio Diario</div>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? '...' : numberFmt(Math.round(totals.dailyAverage))}
            </div>
            <div className="text-xs text-gray-500 mt-1">Boletos/día</div>
          </div>
        </Card>
      </div>

      {/* Weekly Summary */}
      {weeklyData.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Resumen Semanal</h3>
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Nota:</span> Los totales semanales solo incluyen días dentro de este mes. 
              Las semanas que abarcan dos meses mostrarán solo los días del mes seleccionado.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Semana
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Boletos (días en este mes)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeklyData.map(({ week, total }) => (
                    <tr key={week} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {numberFmt(total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Entries Table */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Entradas Detalladas ({data.length})
          </h3>
          
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md">
              Error: {error}
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay boletos registrados para este mes
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Semana
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Máquina
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boletos Día
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Semanal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notas
                    </th>
                    {canWrite && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.date}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {entry.week}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              entry.machineId === '76'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {entry.machineId}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {numberFmt(entry.ticketsDay)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {numberFmt(entry.ticketsTotal)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {entry.notes || '-'}
                        </td>
                        {canWrite && (
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditing(entry)
                                  setForm({
                                    date: entry.date,
                                    machineId: entry.machineId,
                                    ticketsDay: String(entry.ticketsDay),
                                    notes: entry.notes || ''
                                  })
                                  setModalOpen(true)
                                }}
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      '¿Estás seguro de eliminar esta entrada?'
                                    )
                                  ) {
                                    try {
                                      if (entry.id) {
                                        await remove(entry.id, entry)
                                        await refreshStats()
                                      }
                                    } catch (e: any) {
                                      alert(e?.message || 'Error al eliminar')
                                    }
                                  }
                                }}
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modal for Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Editar Boletos' : 'Agregar Boletos'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={nowMexico.toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máquina
            </label>
            <select
              value={form.machineId}
              onChange={(e) =>
                setForm({ ...form, machineId: e.target.value as '76' | '79' })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="76">Máquina 76</option>
              <option value="79">Máquina 79</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Boletos Vendidos
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.ticketsDay}
              onChange={(e) => setForm({ ...form, ticketsDay: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Número de boletos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false)
                setEditing(null)
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Tickets
