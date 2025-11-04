import React, { useMemo, useState } from 'react'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import { Button } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useCachedMonthlyRollChanges, useCachedMonthlyRollChangeStats } from '../../hooks/useCachedRollChanges'
import { RollChangeEntry } from '../../services/RollChangesService'
import { useAppSelector } from '../../state/hooks'
import { getCurrentYearMonthInMexico, getTodayInMexico } from '../../utils/timezone'

const defaultYearMonth = getCurrentYearMonthInMexico()

const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n || 0)

const RollChanges: React.FC = () => {
  const currentUser = useAppSelector((state) => state.auth.user)
  const canRead = useHasPermission(PERMISSIONS.ROLLOS_READ)
  const canWrite = useHasPermission(PERMISSIONS.ROLLOS_CREATE)
  const canUpdate = useHasPermission(PERMISSIONS.ROLLOS_UPDATE)
  const canDelete = useHasPermission(PERMISSIONS.ROLLOS_DELETE)

  const [yearMonth, setYearMonth] = useState<string>(defaultYearMonth)
  const { data, loading, error, refresh, create, update, remove } = useCachedMonthlyRollChanges(yearMonth)
  const { stats, loading: statsLoading, refresh: refreshStats } = useCachedMonthlyRollChangeStats(yearMonth)

  const [isModalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RollChangeEntry | null>(null)
  const [form, setForm] = useState<{ 
    date: string
    machineId: '76' | '79'
    notes: string 
  }>({ 
    date: getTodayInMexico(),
    machineId: '76', 
    notes: '' 
  })

  const parsedYM = useMemo(() => {
    const [y, m] = yearMonth.split('-')
    return { year: parseInt(y, 10), month: parseInt(m, 10) }
  }, [yearMonth])

  // Calculate totals from stats
  const totals = useMemo(() => {
    if (!stats) return { totalChanges: 0, machine76: 0, machine79: 0, averageFrequency76: 0, averageFrequency79: 0 }
    return {
      totalChanges: stats.totalChanges,
      machine76: stats.machine76,
      machine79: stats.machine79,
      averageFrequency76: stats.averageFrequency76,
      averageFrequency79: stats.averageFrequency79
    }
  }, [stats])

  // Changes by date for display
  const changesByDateData = useMemo(() => {
    if (!stats?.changesByDate) return []
    return Array.from(stats.changesByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [stats])

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-red-600">No tienes permiso para ver Cambios de Rollo.</div>
        </Card>
      </div>
    )
  }

  const [saving, setSaving] = useState(false)
  
  const onSubmit = async () => {
    try {
      setSaving(true)
      
      if (!form.date) {
        alert('Por favor ingresa una fecha válida')
        return
      }

      const payload = {
        date: form.date,
        machineId: form.machineId,
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
        date: getTodayInMexico(),
        machineId: '76', 
        notes: '' 
      })
    } catch (e: any) {
      alert(e?.message || 'Error al guardar el cambio de rollo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry: RollChangeEntry) => {
    if (!canDelete || !entry.id) return
    const ok = window.confirm('¿Eliminar este cambio de rollo?')
    if (!ok) return
    
    try {
      await remove(entry.id, entry)
      await refreshStats()
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar')
    }
  }

  const exportCSV = () => {
    if (!data.length) return alert('No hay datos para exportar')
    const headers = ['Fecha', 'Máquina', 'Notas', 'Creado']
    const rows = data.map(e => [
      e.date,
      e.machineId,
      e.notes || '',
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
    a.download = `cambios_rollo_${yearMonth}.csv`
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
          <h2 className="text-2xl font-bold text-gray-800">Cambios de Rollo</h2>
          <p className="text-sm text-gray-600 mt-1">
            Registro de cambios de rollo de papel por máquina (SRS #3)
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
                    const currentYM = getMexicoYearMonth()
                    const isCurrentMonth = yearMonth === currentYM
                    
                    let defaultDate: string
                    if (isCurrentMonth) {
                      // Current month: use today's date
                      defaultDate = getTodayInMexico()
                    } else {
                      // Past/future month: use first day of that month
                      defaultDate = `${yearMonth}-01`
                    }
                    
                    setForm({
                      date: defaultDate,
                      machineId: '76',
                      notes: ''
                    })
                    setModalOpen(true)
                  }}
                >
                  ➕ Agregar Cambio
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
            <div className="text-sm text-gray-600 mb-1">Total Cambios</div>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? '...' : numberFmt(totals.totalChanges)}
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
            <div className="text-xs text-gray-500 mt-1">Cambios de rollo</div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-1">Máquina 79</div>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : numberFmt(totals.machine79)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Cambios de rollo</div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-1">Frecuencia Máquina 76</div>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : totals.averageFrequency76 > 0 ? `${numberFmt(totals.averageFrequency76)} días` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Entre cambios</div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-1">Frecuencia Máquina 79</div>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : totals.averageFrequency79 > 0 ? `${numberFmt(totals.averageFrequency79)} días` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Entre cambios</div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Registro de Cambios</h3>
          
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}
          
          {error && (
            <div className="p-4 text-red-600 bg-red-50 rounded">
              Error: {error}
            </div>
          )}
          
          {!loading && !error && data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay cambios de rollo registrados para este mes
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
                      Máquina
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          entry.machineId === '76' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {entry.machineId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.notes || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => {
                                setEditing(entry)
                                setForm({
                                  date: entry.date,
                                  machineId: entry.machineId,
                                  notes: entry.notes || ''
                                })
                                setModalOpen(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Editar
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(entry)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Editar Cambio de Rollo' : 'Agregar Cambio de Rollo'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máquina *
            </label>
            <select
              value={form.machineId}
              onChange={(e) => setForm({ ...form, machineId: e.target.value as '76' | '79' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="76">76</option>
              <option value="79">79</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Notas adicionales (opcional)"
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

export default RollChanges
