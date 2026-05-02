import React, { useMemo, useState } from 'react'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import { Button } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useCachedMonthlyScratches, useCachedMonthlyScratchStats, useCachedLotteryTypes } from '../../hooks/useCachedScratches'
import { useCachedActiveLotteryGames } from '../../hooks/useCachedLotteryGames'
import { ScratchEntry } from '../../services/ScratchesService'
import { useAppSelector } from '../../state/hooks'
import { getCurrentYearMonthInMexico, getTodayInMexico } from '../../utils/timezone'

const defaultYearMonth = getCurrentYearMonthInMexico()

const currencyFmt = (n: number) => new Intl.NumberFormat('es-MX', { 
  style: 'currency', 
  currency: 'MXN',
  minimumFractionDigits: 0
}).format(n || 0)

const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n || 0)

const Scratches: React.FC = () => {
  const currentUser = useAppSelector((state) => state.auth.user)
  const canRead = useHasPermission(PERMISSIONS.SORTEOS_READ)
  const canWrite = useHasPermission(PERMISSIONS.SORTEOS_CREATE)
  const canUpdate = useHasPermission(PERMISSIONS.SORTEOS_UPDATE)
  const canDelete = useHasPermission(PERMISSIONS.SORTEOS_DELETE)

  const [yearMonth, setYearMonth] = useState<string>(defaultYearMonth)
  const { data, loading, error, refresh, create, update, remove } = useCachedMonthlyScratches(yearMonth)
  const { stats, loading: statsLoading, refresh: refreshStats } = useCachedMonthlyScratchStats(yearMonth)
  const { lotteryTypes, loading: typesLoading, refresh: refreshTypes } = useCachedLotteryTypes(yearMonth)
  const { games: lotteryGames, loading: gamesLoading } = useCachedActiveLotteryGames()

  const [isModalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ScratchEntry | null>(null)
  const [form, setForm] = useState<{ 
    date: string
    lottery: string
    sorteoNumber: string
    winningTicket: string
    prizeAmount: string
    notes: string 
  }>({ 
    date: getTodayInMexico(),
    lottery: '',
    sorteoNumber: '',
    winningTicket: '',
    prizeAmount: '',
    notes: '' 
  })

  const parsedYM = useMemo(() => {
    const [y, m] = yearMonth.split('-')
    return { year: parseInt(y, 10), month: parseInt(m, 10) }
  }, [yearMonth])

  // Calculate totals from stats
  const totals = useMemo(() => {
    if (!stats) return { totalPrizes: 0, totalAmount: 0, averagePrize: 0 }
    return {
      totalPrizes: stats.totalPrizes,
      totalAmount: stats.totalAmount,
      averagePrize: stats.averagePrize
    }
  }, [stats])

  // Lottery breakdown for display
  const lotteryData = useMemo(() => {
    if (!stats?.lotteryBreakdown) return []
    return Array.from(stats.lotteryBreakdown.entries())
      .map(([lottery, data]) => ({ lottery, count: data.count, amount: data.amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [stats])

  // Weekly breakdown for display
  const weeklyData = useMemo(() => {
    if (!stats?.weeklyBreakdown) return []
    return Array.from(stats.weeklyBreakdown.entries())
      .map(([week, data]) => ({ week, count: data.count, amount: data.amount }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }, [stats])

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-red-600">No tienes permiso para ver Raspados premiados.</div>
        </Card>
      </div>
    )
  }

  const [saving, setSaving] = useState(false)
  
  const onSubmit = async () => {
    try {
      setSaving(true)
      const amount = parseFloat(form.prizeAmount)
      
      if (!form.date || !form.lottery.trim() || !form.sorteoNumber.trim() || !form.winningTicket.trim() || isNaN(amount) || amount <= 0) {
        alert('Por favor completa todos los campos requeridos con valores válidos')
        return
      }

      const payload = {
        date: form.date,
        lottery: form.lottery.trim(),
        sorteoNumber: form.sorteoNumber.trim(),
        winningTicket: form.winningTicket.trim(),
        prizeAmount: amount,
        operatorId: currentUser?.uid || 'unknown',
        notes: form.notes || '',
        timestamp: new Date()
      }
      
      if (editing && editing.id) {
        await update(editing.id, editing, payload)
      } else {
        await create(payload)
      }
      
      // Refresh stats and types after successful operation
      await refreshStats()
      await refreshTypes()
      
      setModalOpen(false)
      setEditing(null)
      setForm({ 
        date: getTodayInMexico(),
        lottery: '',
        sorteoNumber: '',
        winningTicket: '',
        prizeAmount: '',
        notes: '' 
      })
    } catch (e: any) {
      alert(e?.message || 'Error al guardar el premio')
    } finally {
      setSaving(false)
    }
  }

  const exportCSV = () => {
    if (!data.length) return alert('No hay datos para exportar')
    const headers = ['Fecha', 'Semana', 'Sorteo', '# Sorteo', 'Boleto', 'Premio', 'Notas', 'Operador', 'Creado']
    const rows = data.map(e => [
      e.date,
      e.week,
      e.lottery,
      e.sorteoNumber,
      e.winningTicket,
      e.prizeAmount,
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
    a.download = `raspados_${yearMonth}.csv`
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
  const handleNextMonth = () => setYearMonth(getNextYearMonth(yearMonth))

  const handleEditClick = (entry: ScratchEntry) => {
    setEditing(entry)
    setForm({
      date: entry.date,
      lottery: entry.lottery,
      sorteoNumber: entry.sorteoNumber,
      winningTicket: entry.winningTicket,
      prizeAmount: String(entry.prizeAmount),
      notes: entry.notes || ''
    })
    setModalOpen(true)
  }

  const handleDeleteClick = async (entry: ScratchEntry) => {
    if (!window.confirm(`¿Eliminar premio de ${entry.lottery} (${currencyFmt(entry.prizeAmount)})?`)) return
    
    try {
      await remove(entry.id!, entry)
      await refreshStats()
      await refreshTypes()
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Raspados Premiados</h2>
          <p className="text-sm text-gray-600 mt-1">
            Registro de premios de raspados por sorteo (SRS #7)
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
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handlePrevMonth} variant="secondary" size="sm">
                ← Anterior
              </Button>
              {isBeforeCurrentMonth() && (
                <Button onClick={handleThisMonth} variant="secondary" size="sm">
                  Este Mes
                </Button>
              )}
              <Button onClick={handleNextMonth} variant="secondary" size="sm">
                Siguiente →
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportCSV} variant="secondary" size="sm" disabled={!data.length}>
                📥 Exportar CSV
              </Button>
              {canWrite && (
                <Button 
                  onClick={() => {
                    setEditing(null)
                    setForm({
                      date: getTodayInMexico(),
                      lottery: '',
                      sorteoNumber: '',
                      winningTicket: '',
                      prizeAmount: '',
                      notes: ''
                    })
                    setModalOpen(true)
                  }}
                  size="sm"
                >
                  ➕ Registrar Premio
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {statsLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-600">Total Premios</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{numberFmt(totals.totalPrizes)}</div>
              <div className="mt-1 text-xs text-gray-500">Raspados premiados este mes</div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-600">Monto Total</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{currencyFmt(totals.totalAmount)}</div>
              <div className="mt-1 text-xs text-gray-500">Suma de todos los premios</div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-600">Premio Promedio</div>
              <div className="mt-2 text-3xl font-bold text-purple-600">{currencyFmt(totals.averagePrize)}</div>
              <div className="mt-1 text-xs text-gray-500">Promedio por premio</div>
            </div>
          </Card>
        </div>
      )}

      {/* Lottery Breakdown */}
      {lotteryData.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Desglose por Sorteo</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sorteo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Premios</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Promedio</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lotteryData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.lottery}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {numberFmt(item.count)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {currencyFmt(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {currencyFmt(item.amount / item.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Top 5 Prizes */}
      {stats && stats.topPrizes.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Top 5 Premios del Mes</h3>
            <div className="space-y-2">
              {stats.topPrizes.map((prize, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                    <div>
                      <div className="font-medium text-gray-900">{prize.lottery}</div>
                      <div className="text-sm text-gray-500">Boleto: {prize.winningTicket} • {prize.date}</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-green-600">{currencyFmt(prize.prizeAmount)}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Entries Table */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Premios Registrados</h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-red-600 p-4">{error}</div>
          ) : data.length === 0 ? (
            <div className="text-gray-500 text-center py-12">No hay premios registrados para este mes</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sorteo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"># Sorteo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boleto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Premio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.lottery}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {entry.sorteoNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.winningTicket}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                        {currencyFmt(entry.prizeAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {canUpdate && (
                              <button
                                onClick={() => handleEditClick(entry)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Editar
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteClick(entry)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Eliminar
                              </button>
                            )}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Editar Premio' : 'Registrar Premio'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={form.date}
              required
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sorteo / Juego</label>
            <select
              value={form.lottery}
              required
              onChange={(e) => setForm({ ...form, lottery: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecciona un juego...</option>
              {lotteryGames.map((game) => (
                <option key={game.id} value={game.name}>
                  {game.name}
                </option>
              ))}
            </select>
            {lotteryGames.length === 0 && !gamesLoading && (
              <p className="text-xs text-amber-600 mt-1">
                No hay juegos configurados. El supervisor debe agregar juegos en "Gestión de Juegos".
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Sorteo</label>
            <input
              type="text"
              value={form.sorteoNumber}
              required
              onChange={(e) => setForm({ ...form, sorteoNumber: e.target.value })}
              placeholder="Ej: 3421, 2024-45, etc."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Boleto Ganador</label>
            <input
              type="text"
              value={form.winningTicket}
              required
              onChange={(e) => setForm({ ...form, winningTicket: e.target.value })}
              placeholder="Número o código del boleto"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto del Premio</label>
            <input
              type="number"
              value={form.prizeAmount}
              required
              min="0"
              step="0.01"
              onChange={(e) => setForm({ ...form, prizeAmount: e.target.value })}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={() => {
                setModalOpen(false)
                setEditing(null)
              }}
              variant="secondary"
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

export default Scratches
