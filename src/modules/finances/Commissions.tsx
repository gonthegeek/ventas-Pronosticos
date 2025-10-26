import React, { useMemo, useState } from 'react'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import { Button } from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useCachedMonthlyCommissions } from '../../hooks/useCachedCommissions'
import { CommissionEntry } from '../../services/CommissionsService'

const nowMexico = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
const defaultYearMonth = `${nowMexico.getFullYear()}-${String(nowMexico.getMonth() + 1).padStart(2, '0')}`

const numberFmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0)

const Commissions: React.FC = () => {
  const canRead = useHasPermission(PERMISSIONS.COMISIONES_READ)
  const canWrite = useHasPermission(PERMISSIONS.COMISIONES_WRITE) || useHasPermission(PERMISSIONS.COMISIONES_ALL)

  const [yearMonth, setYearMonth] = useState<string>(defaultYearMonth)
  const { data, loading, error, refresh, create, update, remove } = useCachedMonthlyCommissions(yearMonth)

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

  const handleThisMonth = () => setYearMonth(getMexicoYearMonth())
  const handlePrevMonth = () => setYearMonth(getPrevYearMonth(yearMonth))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">SRS #2 · Comisiones Mensuales</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={exportCSV} disabled={!data.length}>📊 Exportar CSV</Button>
          {canWrite && (
            <Button size="sm" onClick={() => { setEditing(null); setForm({ machineId: '76', systemTotal: '', paperTotal: '', notes: '' }); setModalOpen(true) }}>➕ Agregar</Button>
          )}
        </div>
      </div>

      {/* Filters - aligned with SalesFilters styling */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Mes:</label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <div className="flex gap-2 ml-2">
              <Button variant="ghost" size="sm" onClick={handleThisMonth} disabled={loading}>Este mes</Button>
              <Button variant="ghost" size="sm" onClick={handlePrevMonth} disabled={loading}>Mes anterior</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>🔄 Refrescar</Button>
          </div>
        </div>
      </div>

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
                                try { await remove(e.id, e as CommissionEntry) } catch (err: any) { alert(err?.message || 'Error al eliminar') }
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
