import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import { Button } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useCachedMonthlyPaidPrizes } from '../../hooks/useCachedPaidPrizes'
import { PaidPrizeEntry } from '../../services/PaidPrizesService'
import { useAppSelector } from '../../state/hooks'

const nowMexico = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
const defaultYearMonth = `${nowMexico.getFullYear()}-${String(nowMexico.getMonth() + 1).padStart(2, '0')}`

const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0)

/**
 * Helper to get ISO week number (YYYY-Www format)
 */
const getISOWeek = (date: Date): string => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const PaidPrizes: React.FC = () => {
  const canRead = useHasPermission(PERMISSIONS.PREMIADOS_READ)
  const canWrite = useHasPermission(PERMISSIONS.PREMIADOS_WRITE) || useHasPermission(PERMISSIONS.PREMIADOS_ALL)
  const currentUser = useAppSelector((state) => state.auth.user)

  const [yearMonth, setYearMonth] = useState<string>(defaultYearMonth)
  const { data, loading, error, refresh, create, update, remove } = useCachedMonthlyPaidPrizes(yearMonth)

  const [isModalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PaidPrizeEntry | null>(null)
  const [form, setForm] = useState<{
    date: string
    week: string
    machineId: '76' | '79'
    amountPaid: string
    ticketCount: string
    notes: string
  }>({
    date: '',
    week: '',
    machineId: '76',
    amountPaid: '',
    ticketCount: '',
    notes: ''
  })

  const parsedYM = useMemo(() => {
    const [y, m] = yearMonth.split('-')
    return { year: parseInt(y, 10), month: parseInt(m, 10) }
  }, [yearMonth])

  const totals = useMemo(() => {
    const totalAmount = data.reduce((s, e) => s + (e.amountPaid || 0), 0)
    const totalTickets = data.reduce((s, e) => s + (e.ticketCount || 0), 0)
    const avgPerTicket = totalTickets > 0 ? totalAmount / totalTickets : 0
    
    // Machine breakdown
    const machine76 = data.filter(e => e.machineId === '76')
    const machine79 = data.filter(e => e.machineId === '79')
    
    const amount76 = machine76.reduce((s, e) => s + (e.amountPaid || 0), 0)
    const amount79 = machine79.reduce((s, e) => s + (e.amountPaid || 0), 0)
    
    const tickets76 = machine76.reduce((s, e) => s + (e.ticketCount || 0), 0)
    const tickets79 = machine79.reduce((s, e) => s + (e.ticketCount || 0), 0)
    
    return { 
      totalAmount, 
      totalTickets, 
      avgPerTicket,
      amount76,
      amount79,
      tickets76,
      tickets79
    }
  }, [data])

  // Weekly aggregation for summary
  const weeklyData = useMemo(() => {
    const byWeek: { [week: string]: { amount: number; tickets: number; entries: number } } = {}
    data.forEach(entry => {
      if (!byWeek[entry.week]) {
        byWeek[entry.week] = { amount: 0, tickets: 0, entries: 0 }
      }
      byWeek[entry.week].amount += entry.amountPaid
      byWeek[entry.week].tickets += entry.ticketCount
      byWeek[entry.week].entries += 1
    })
    return Object.entries(byWeek)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => b.week.localeCompare(a.week))
  }, [data])

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-red-600">No tienes permiso para ver Boletos Premiados Pagados.</div>
        </Card>
      </div>
    )
  }

  const [saving, setSaving] = useState(false)
  
  const onSubmit = async () => {
    try {
      if (!form.date) {
        alert('Por favor selecciona una fecha')
        return
      }
      
      setSaving(true)
      const amt = parseFloat(form.amountPaid)
      const cnt = parseInt(form.ticketCount)
      
      if (isNaN(amt) || amt < 0) {
        alert('El monto pagado debe ser un número válido')
        return
      }
      
      if (isNaN(cnt) || cnt < 0) {
        alert('La cantidad de boletos debe ser un número válido')
        return
      }

      const payload = {
        date: form.date,
        week: form.week || getISOWeek(new Date(form.date)),
        machineId: form.machineId,
        amountPaid: amt,
        ticketCount: cnt,
        notes: form.notes || '',
        operatorId: currentUser?.uid || 'unknown',
        timestamp: new Date()
      }

      if (editing && editing.id) {
        await update(editing.id, editing, payload)
      } else {
        await create(payload)
      }

      setModalOpen(false)
      setEditing(null)
      setForm({ date: '', week: '', machineId: '76', amountPaid: '', ticketCount: '', notes: '' })
    } catch (e: any) {
      alert(e?.message || 'Error al guardar el registro')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry: PaidPrizeEntry) => {
    if (!entry.id) return
    if (!confirm('¿Estás seguro de eliminar este registro?')) return
    
    try {
      await remove(entry.id, entry)
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar')
    }
  }

  const handleEdit = (entry: PaidPrizeEntry) => {
    setEditing(entry)
    setForm({
      date: entry.date,
      week: entry.week,
      machineId: entry.machineId,
      amountPaid: String(entry.amountPaid),
      ticketCount: String(entry.ticketCount),
      notes: entry.notes || ''
    })
    setModalOpen(true)
  }

  const exportCSV = () => {
    if (!data.length) return alert('No hay datos para exportar')
    const headers = ['Fecha', 'Semana', 'Máquina', 'Monto Pagado', 'Boletos', 'Promedio/Boleto', 'Notas', 'Operador', 'Creado']
    const rows = data.map(e => [
      e.date,
      e.week,
      e.machineId,
      e.amountPaid,
      e.ticketCount,
      e.ticketCount > 0 ? (e.amountPaid / e.ticketCount).toFixed(2) : '0',
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
    a.download = `boletos_premiados_${yearMonth}.csv`
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
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yy}-${mm}`
  }

  const getNextYearMonth = (ym: string) => {
    const [y, m] = ym.split('-').map((v) => parseInt(v, 10))
    const d = new Date(y, m - 1, 1)
    d.setMonth(d.getMonth() + 1)
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yy}-${mm}`
  }

  const isBeforeCurrentMonth = () => {
    const current = getMexicoYearMonth()
    return yearMonth < current
  }

  const handleThisMonth = () => setYearMonth(getMexicoYearMonth())
  const handlePrevMonth = () => setYearMonth(getPrevYearMonth(yearMonth))

  // Auto-calculate week when date changes in form
  const handleDateChange = (dateStr: string) => {
    setForm(prev => ({
      ...prev,
      date: dateStr,
      week: dateStr ? getISOWeek(new Date(dateStr)) : ''
    }))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Boletos Premiados Pagados</h2>
        <p className="text-sm text-gray-600 mt-1">Registro de boletos premiados que fueron pagados</p>
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
              <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
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
                    setForm({ date: '', week: '', machineId: '76', amountPaid: '', ticketCount: '', notes: '' })
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

      {/* Monthly Summary */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <Card>
          <div className="p-6 text-red-600">{error}</div>
        </Card>
      ) : (
        <>
          {/* Totals Card */}
          <Card>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <div className="text-gray-500">Monto Total Pagado</div>
                  <div className="text-lg font-semibold text-blue-600">{numberFmt(totals.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Boletos</div>
                  <div className="text-lg font-semibold">{totals.totalTickets.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Promedio por Boleto</div>
                  <div className="text-lg font-semibold text-green-600">{numberFmt(totals.avgPerTicket)}</div>
                </div>
              </div>
              
              {/* Machine Breakdown */}
              <div className="border-t pt-4 mt-4">
                <div className="text-xs text-gray-500 mb-2">Desglose por Máquina</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="font-semibold text-gray-700 mb-2">Máquina 76</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monto:</span>
                        <span className="font-medium">{numberFmt(totals.amount76)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Boletos:</span>
                        <span className="font-medium">{totals.tickets76.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="font-semibold text-gray-700 mb-2">Máquina 79</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monto:</span>
                        <span className="font-medium">{numberFmt(totals.amount79)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Boletos:</span>
                        <span className="font-medium">{totals.tickets79.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Weekly Summary */}
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Resumen por Semana</h3>
              {weeklyData.length === 0 ? (
                <div className="text-gray-500 text-sm py-4">No hay datos para este mes</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2">Semana</th>
                        <th className="text-right px-3 py-2">Monto Pagado</th>
                        <th className="text-right px-3 py-2">Boletos</th>
                        <th className="text-right px-3 py-2">Promedio</th>
                        <th className="text-center px-3 py-2">Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.map((w) => {
                        const avg = w.tickets > 0 ? w.amount / w.tickets : 0
                        return (
                          <tr key={w.week} className="border-b">
                            <td className="px-3 py-2">{w.week}</td>
                            <td className="px-3 py-2 text-right">{numberFmt(w.amount)}</td>
                            <td className="px-3 py-2 text-right">{w.tickets.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{numberFmt(avg)}</td>
                            <td className="px-3 py-2 text-center">{w.entries}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* Detailed Entries Table */}
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Registros Detallados</h3>
              {data.length === 0 ? (
                <div className="text-gray-500 text-sm py-4">No hay registros para este mes</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2">Fecha</th>
                        <th className="text-left px-3 py-2">Semana</th>
                        <th className="text-center px-3 py-2">Máquina</th>
                        <th className="text-right px-3 py-2">Monto Pagado</th>
                        <th className="text-right px-3 py-2">Boletos</th>
                        <th className="text-right px-3 py-2">Promedio</th>
                        <th className="text-left px-3 py-2">Notas</th>
                        {canWrite && <th className="px-3 py-2">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((e) => {
                          const avg = e.ticketCount > 0 ? e.amountPaid / e.ticketCount : 0
                          return (
                            <tr key={e.id} className="border-b hover:bg-gray-50">
                              <td className="px-3 py-2">{e.date}</td>
                              <td className="px-3 py-2">{e.week}</td>
                              <td className="px-3 py-2 text-center font-semibold">{e.machineId}</td>
                              <td className="px-3 py-2 text-right">{numberFmt(e.amountPaid)}</td>
                              <td className="px-3 py-2 text-right">{e.ticketCount.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-green-600">{numberFmt(avg)}</td>
                              <td className="px-3 py-2 text-gray-600 text-xs">{e.notes || '-'}</td>
                              {canWrite && (
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(e)}
                                    >
                                      ✏️
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(e)}
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
          setForm({ date: '', week: '', machineId: '76', amountPaid: '', ticketCount: '', notes: '' })
        }}
        title={editing ? 'Editar Registro' : 'Nuevo Registro'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semana (ISO)</label>
            <input
              type="text"
              value={form.week}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              placeholder="Se calcula automáticamente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
            <select
              value={form.machineId}
              onChange={(e) => setForm({ ...form, machineId: e.target.value as '76' | '79' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="76">Máquina 76</option>
              <option value="79">Máquina 79</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto Pagado</label>
            <input
              type="number"
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Boletos</label>
            <input
              type="number"
              value={form.ticketCount}
              onChange={(e) => setForm({ ...form, ticketCount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              min="0"
              step="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Información adicional..."
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false)
                setEditing(null)
                setForm({ date: '', week: '', machineId: '76', amountPaid: '', ticketCount: '', notes: '' })
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

export default PaidPrizes
