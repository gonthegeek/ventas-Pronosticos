import React, { useMemo, useState, useEffect } from 'react'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import { Button } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useCachedMonthlyCommissions } from '../../hooks/useCachedCommissions'
import CommissionsService from '../../services/CommissionsService'
import { CommissionEntry } from '../../services/CommissionsService'

const nowMexico = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
const defaultYearMonth = `${nowMexico.getFullYear()}-${String(nowMexico.getMonth() + 1).padStart(2, '0')}`

const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0)

const Commissions: React.FC = () => {
  const canRead = useHasPermission(PERMISSIONS.COMISIONES_READ)
  const canWrite = useHasPermission(PERMISSIONS.COMISIONES_WRITE) || useHasPermission(PERMISSIONS.COMISIONES_ALL)

  const [yearMonth, setYearMonth] = useState<string>(defaultYearMonth)
  const { data, loading, error, refresh, create, update, remove } = useCachedMonthlyCommissions(yearMonth)

  // --- Comparison Table State ---
  const thisYear = nowMexico.getFullYear()
  const [compareYear, setCompareYear] = useState<number>(thisYear)
  const [compareData, setCompareData] = useState<{ [month: string]: CommissionEntry[] }>({})
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [compareRefreshTrigger, setCompareRefreshTrigger] = useState(0)

  const loadComparisonData = async () => {
    setCompareLoading(true)
    setCompareError(null)
    const results: { [month: string]: CommissionEntry[] } = {}
    try {
      for (let m = 1; m <= 12; m++) {
        const entries = await CommissionsService.list(compareYear, m)
        const ym = `${compareYear}-${String(m).padStart(2, '0')}`
        results[ym] = entries
      }
      setCompareData(results)
    } catch (e: any) {
      setCompareError(e?.message || 'Error loading comparison data')
    } finally {
      setCompareLoading(false)
    }
  }

  useEffect(() => {
    loadComparisonData()
  }, [compareYear, compareRefreshTrigger])

  const [isModalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CommissionEntry | null>(null)
  const [form, setForm] = useState<{ machineId: '76'|'79'; systemTotal: string; paperTotal: string; notes: string }>({ machineId: '76', systemTotal: '', paperTotal: '', notes: '' })

  const parsedYM = useMemo(() => {
    const [y, m] = yearMonth.split('-')
    return { year: parseInt(y, 10), month: parseInt(m, 10) }
  }, [yearMonth])

  const totals = useMemo(() => {
    const system = data.reduce((s, e) => s + (e.systemTotal || 0), 0)
    const paper = data.reduce((s, e) => s + (e.paperTotal || 0), 0)
    const diff = system - paper
    return { system, paper, diff }
  }, [data])

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-red-600">No tienes permiso para ver Comisiones.</div>
        </Card>
      </div>
    )
  }

  const [saving, setSaving] = useState(false)
  const onSubmit = async () => {
    try {
      setSaving(true)
      const sys = parseFloat(form.systemTotal)
      const pap = parseFloat(form.paperTotal)
      const payload = {
        year: parsedYM.year,
        month: parsedYM.month,
        machineId: form.machineId,
        systemTotal: isNaN(sys) ? 0 : sys,
        paperTotal: isNaN(pap) ? 0 : pap,
        difference: (isNaN(sys) ? 0 : sys) - (isNaN(pap) ? 0 : pap),
        notes: form.notes || ''
      }
      if (editing && editing.id) {
        await update(editing.id, editing, payload)
      } else {
        await create(payload)
      }
      setModalOpen(false)
      setEditing(null)
      setForm({ machineId: '76', systemTotal: '', paperTotal: '', notes: '' })
      // Refresh comparison table if the changed month is in the current comparison year
      if (parsedYM.year === compareYear) {
        setCompareRefreshTrigger(prev => prev + 1)
      }
    } catch (e: any) {
      alert(e?.message || 'Error al guardar la comisión')
    } finally {
      setSaving(false)
    }
  }

  const exportCSV = () => {
    if (!data.length) return alert('No hay datos para exportar')
    const headers = ['Año','Mes','Máquina','LN','Tira','Diferencia','Notas','Creado']
    const rows = data.map(e => [e.year, e.month, e.machineId, e.systemTotal, e.paperTotal, e.difference, e.notes || '', e.createdAt.toISOString()])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = `comisiones_${yearMonth}.csv`
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Comisiones Mensuales</h2>
        <p className="text-sm text-gray-600 mt-1">Gestión y análisis de comisiones por máquina</p>
      </div>

      {/* Month Selector & Actions - Main Control Panel */}
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
                <Button variant="ghost" size="sm" onClick={handleThisMonth} disabled={loading}>Este mes</Button>
                <Button variant="ghost" size="sm" onClick={handlePrevMonth} disabled={loading}>Mes anterior</Button>
                {isBeforeCurrentMonth() && (
                  <Button variant="ghost" size="sm" onClick={() => setYearMonth(getNextYearMonth(yearMonth))} disabled={loading}>Mes siguiente</Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>🔄 Refrescar</Button>
              <Button variant="ghost" size="sm" onClick={exportCSV} disabled={!data.length}>📊 Exportar CSV</Button>
              {canWrite && (
                <Button size="sm" onClick={() => { setEditing(null); setForm({ machineId: '76', systemTotal: '', paperTotal: '', notes: '' }); setModalOpen(true) }}>➕ Agregar</Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Monthly Data Section */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <Card><div className="p-6 text-red-600">{error}</div></Card>
      ) : (
        <>
          <Card>
            <div className="p-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">LN</div>
                <div className="text-lg font-semibold">{numberFmt(totals.system)}</div>
              </div>
              <div>
                <div className="text-gray-500">Tira</div>
                <div className="text-lg font-semibold">{numberFmt(totals.paper)}</div>
              </div>
              <div>
                <div className="text-gray-500">Diferencia</div>
                <div className={`text-lg font-semibold ${totals.diff === 0 ? 'text-green-600' : totals.diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>{numberFmt(totals.diff)}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Máquina</th>
                    <th className="text-right px-3 py-2">LN</th>
                    <th className="text-right px-3 py-2">Tira</th>
                    <th className="text-right px-3 py-2">Diferencia</th>
                    <th className="text-left px-3 py-2">Notas</th>
                    {canWrite && <th className="px-3 py-2">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.sort((a,b) => a.machineId.localeCompare(b.machineId)).map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="px-3 py-2">{e.machineId}</td>
                      <td className="px-3 py-2 text-right">{numberFmt(e.systemTotal)}</td>
                      <td className="px-3 py-2 text-right">{numberFmt(e.paperTotal)}</td>
                      <td className={`px-3 py-2 text-right ${e.difference===0?'text-green-600': e.difference>0?'text-blue-600':'text-red-600'}`}>{numberFmt(e.difference)}</td>
                      <td className="px-3 py-2">{e.notes || '-'}</td>
                      {canWrite && (
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setForm({ machineId: e.machineId, systemTotal: (e.systemTotal ?? 0).toString(), paperTotal: (e.paperTotal ?? 0).toString(), notes: e.notes || '' }); setEditing(e as CommissionEntry); setModalOpen(true) }}
                            >✏️ Editar</Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!e.id) return
                                if (!window.confirm('¿Eliminar esta comisión?')) return
                                try { 
                                  await remove(e.id, e as CommissionEntry)
                                  // Refresh comparison table if the deleted entry is in the current comparison year
                                  if (e.year === compareYear) {
                                    setCompareRefreshTrigger(prev => prev + 1)
                                  }
                                } catch (err: any) { alert(err?.message || 'Error al eliminar') }
                              }}
                            >🗑️ Borrar</Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!data.length && (
                    <tr>
                      <td colSpan={canWrite ? 6 : 5} className="px-3 py-6 text-center text-gray-500">Sin registros para {yearMonth}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Comparison & Insights Section */}
      <div className="border-t-4 border-gray-200 pt-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">Análisis Comparativo</h3>
          <p className="text-sm text-gray-600 mt-1">Compara comisiones a lo largo del año</p>
        </div>

        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Año:</label>
              <input
                type="number"
                value={compareYear}
                onChange={e => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val <= thisYear) {
                    setCompareYear(val)
                  }
                }}
                onBlur={e => {
                  const val = parseInt(e.target.value, 10)
                  if (isNaN(val) || val > thisYear || val < 1900) {
                    setCompareYear(thisYear)
                  }
                }}
                min="1900"
                max={thisYear}
                placeholder="YYYY"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              />
              <div className="flex gap-2 ml-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCompareYear(thisYear)} 
                  disabled={compareYear === thisYear}
                >
                  Este año
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCompareYear(compareYear - 1)} 
                  disabled={compareLoading}
                >
                  Año anterior
                </Button>
              </div>
            </div>

            {compareLoading ? (
              <LoadingSpinner />
            ) : compareError ? (
              <div className="p-4 text-red-600">{compareError}</div>
            ) : (
              <>
                {/* Insights Cards */}
                {Object.keys(compareData).length > 0 && (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(() => {
                      const months = Object.values(compareData)
                      const totals = months.map(entries => entries.reduce((s, e) => s + (e.systemTotal || 0), 0))
                      const validTotals = totals.filter(t => t > 0)
                      if (validTotals.length === 0) return null
                      
                      const best = Math.max(...validTotals)
                      const worst = Math.min(...validTotals)
                      const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1)
                      const annualTotal = totals.reduce((a, b) => a + b, 0)
                      const bestMonth = Object.keys(compareData)[totals.indexOf(best)]
                      const worstMonth = Object.keys(compareData)[totals.indexOf(worst)]
                      
                      return [
                        <div key="annual" className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-indigo-700 mb-1">💰 Total Anual</div>
                          <div className="text-lg font-bold text-indigo-900">{numberFmt(annualTotal)}</div>
                          <div className="text-xs text-indigo-600 mt-1">{compareYear}</div>
                        </div>,
                        <div key="best" className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-green-700 mb-1">🏆 Mejor Mes</div>
                          <div className="text-lg font-bold text-green-900">{numberFmt(best)}</div>
                          <div className="text-xs text-green-600 mt-1">{new Date(bestMonth + '-01').toLocaleString('es-MX', { month: 'long', year: 'numeric' })}</div>
                        </div>,
                        <div key="worst" className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-red-700 mb-1">📉 Menor Mes</div>
                          <div className="text-lg font-bold text-red-900">{numberFmt(worst)}</div>
                          <div className="text-xs text-red-600 mt-1">{new Date(worstMonth + '-01').toLocaleString('es-MX', { month: 'long', year: 'numeric' })}</div>
                        </div>,
                        <div key="avg" className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-blue-700 mb-1">📊 Promedio Anual</div>
                          <div className="text-lg font-bold text-blue-900">{numberFmt(avg)}</div>
                          <div className="text-xs text-blue-600 mt-1">Basado en {totals.length} meses</div>
                        </div>
                      ]
                    })()}
                  </div>
                )}

                {/* Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Mes</th>
                        <th className="px-4 py-3 text-right font-semibold">LN</th>
                        <th className="px-4 py-3 text-right font-semibold">Tira</th>
                        <th className="px-4 py-3 text-right font-semibold">Diferencia</th>
                        <th className="px-4 py-3 text-center font-semibold">Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                        const ym = `${compareYear}-${String(m).padStart(2, '0')}`
                        const entries = compareData[ym] || []
                        // Create date with explicit month (0-indexed for Date)
                        const date = new Date(compareYear, m - 1, 1)
                        const monthName = date.toLocaleString('es-MX', { month: 'long' })
                        const system = entries.reduce((s, e) => s + (e.systemTotal || 0), 0)
                        const paper = entries.reduce((s, e) => s + (e.paperTotal || 0), 0)
                        const diff = system - paper
                        const hasData = entries.length > 0
                        
                        return (
                          <tr key={ym} className={`border-b ${!hasData ? 'text-gray-400' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-medium">{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</td>
                            <td className="px-4 py-3 text-right">{hasData ? numberFmt(system) : '-'}</td>
                            <td className="px-4 py-3 text-right">{hasData ? numberFmt(paper) : '-'}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${!hasData ? '' : diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {hasData ? numberFmt(diff) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasData ? <span className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs">{entries.length}</span> : '-'}
                            </td>
                          </tr>
                        )
                      })}
                      {/* Annual Total Row */}
                      {(() => {
                        const allEntries = Object.values(compareData).flat()
                        const totalSystem = allEntries.reduce((s, e) => s + (e.systemTotal || 0), 0)
                        const totalPaper = allEntries.reduce((s, e) => s + (e.paperTotal || 0), 0)
                        const totalDiff = totalSystem - totalPaper
                        const totalRecords = allEntries.length
                        
                        return (
                          <tr className="bg-indigo-50 border-t-2 border-indigo-200 font-bold">
                            <td className="px-4 py-3 text-indigo-900">TOTAL ANUAL {compareYear}</td>
                            <td className="px-4 py-3 text-right text-indigo-900">{numberFmt(totalSystem)}</td>
                            <td className="px-4 py-3 text-right text-indigo-900">{numberFmt(totalPaper)}</td>
                            <td className={`px-4 py-3 text-right ${totalDiff === 0 ? 'text-green-600' : totalDiff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {numberFmt(totalDiff)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block bg-indigo-200 rounded-full px-2 py-1 text-xs text-indigo-900">{totalRecords}</span>
                            </td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Comisión' : 'Registrar Comisión'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
              <select
                value={form.machineId}
                onChange={(e) => setForm({ ...form, machineId: e.target.value as '76'|'79' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="76">Máquina 76</option>
                <option value="79">Máquina 79</option>
              </select>
            </div>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total (LN)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.systemTotal}
                onChange={(e)=> setForm({ ...form, systemTotal: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total (Tira)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.paperTotal}
                onChange={(e)=> setForm({ ...form, paperTotal: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.notes}
              onChange={(e)=> setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Observaciones adicionales..."
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={onSubmit} loading={saving} disabled={saving}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Commissions
