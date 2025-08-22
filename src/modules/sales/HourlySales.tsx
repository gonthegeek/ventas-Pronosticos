import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../state/hooks'
import { setHourlySales, setLoading, setError, HourlySalesData, SaleEntry } from '../../state/slices/salesSlice'
import { SalesService } from '../../services/SalesService'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'

const HourlySales: React.FC = () => {
  const dispatch = useAppDispatch()
  
  // Since there might be typing issues, let's use local state instead
  const [hourlySales, setHourlySalesLocal] = useState<HourlySalesData[]>([])
  const [isLoading, setIsLoadingLocal] = useState(false)
  const [error, setErrorLocal] = useState<string | null>(null)
  
  const { userProfile } = useAppSelector((state) => state.auth)
  
  // Use new permissions system
  const canEditSales = useHasPermission(PERMISSIONS.VENTAS_WRITE)
  const canReadSales = useHasPermission(PERMISSIONS.VENTAS_READ)
  
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current date in Mexico timezone
    const mexicoDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    return mexicoDate
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSale, setNewSale] = useState(() => {
    // Get current hour in Mexico timezone
    const mexicoTime = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
    const mexicoHour = new Date(mexicoTime).getHours()
    
    return {
      machineId: '76',
      totalSales: 0, // Total accumulated sales on the machine
      hour: mexicoHour
    }
  })
  const [previewAmount, setPreviewAmount] = useState(0)

  // Helper function to get current date in Mexico timezone
  const getCurrentMexicoDate = () => {
    const now = new Date()
    return now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  }

  // Helper function to get current hour in Mexico timezone
  const getCurrentMexicoHour = () => {
    const now = new Date()
    return parseInt(now.toLocaleString('en-US', { 
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      hour12: false 
    }))
  }

  // Check if a specific hour is in the future
  const isHourInFuture = (hour: number) => {
    if (selectedDate !== getCurrentMexicoDate()) {
      return false // If not today, no hours are in future
    }
    return hour > getCurrentMexicoHour()
  }

  const updatePreviewAmount = async (machineId: string, hour: number, totalSales: number) => {
    if (totalSales > 0) {
      try {
        const calculatedAmount = await calculateHourlySales(machineId, hour, totalSales)
        setPreviewAmount(calculatedAmount)
      } catch (error) {
        console.error('Error calculating preview amount:', error)
        setPreviewAmount(0)
      }
    } else {
      setPreviewAmount(0)
    }
  }

  useEffect(() => {
    updatePreviewAmount(newSale.machineId, newSale.hour, newSale.totalSales)
  }, [newSale.machineId, newSale.hour, newSale.totalSales])

  useEffect(() => {
    loadSalesData()
  }, [selectedDate])

  const loadSalesData = async () => {
    try {
      setIsLoadingLocal(true)
      setErrorLocal(null)
      
      const data = await SalesService.getHourlySalesForDate(selectedDate)
      setHourlySalesLocal(data)
    } catch (error) {
      setErrorLocal('Error loading sales data')
      console.error('Error loading sales data:', error)
    } finally {
      setIsLoadingLocal(false)
    }
  }

  const handleAddSale = async () => {
    try {
      // Validate that the selected date and hour are not in the future
      const now = new Date()
      const mexicoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
      
      // Create the target date/time in Mexico timezone
      const targetDate = new Date(`${selectedDate}T${String(newSale.hour).padStart(2, '0')}:00:00`)
      const mexicoTargetDate = new Date(targetDate.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
      
      if (mexicoTargetDate > mexicoNow) {
        alert('No se pueden agregar ventas para fechas u horas futuras. Solo se permiten registros del presente o pasado.')
        return
      }
      
      // Check if a record already exists for this machine and hour
      const existingSales = await SalesService.getSalesForDate(selectedDate)
      const existingRecord = existingSales.find(sale => 
        sale.machineId === newSale.machineId && sale.hour === newSale.hour
      )
      
      if (existingRecord) {
        const confirmOverwrite = confirm(
          `Ya existe un registro para la máquina ${newSale.machineId} en la hora ${newSale.hour}:00. ` +
          `Total actual: $${(existingRecord.totalSales || existingRecord.amount).toLocaleString()}. ` +
          `¿Desea reemplazarlo con el nuevo total de $${newSale.totalSales.toLocaleString()}?`
        )
        
        if (!confirmOverwrite) {
          return
        }
        
        // Delete the existing record first
        await SalesService.deleteSale(existingRecord.id, existingRecord)
      }

      // Find previous sales for this machine to determine validation rules
      const machineSales = existingSales
        .filter(sale => sale.machineId === newSale.machineId && sale.hour < newSale.hour)
        .sort((a, b) => b.hour - a.hour)
      
      if (machineSales.length === 0) {
        // Start of day - total can be 0 or any positive number
        if (newSale.totalSales < 0) {
          alert('El total de ventas no puede ser negativo')
          return
        }
      } else {
        // Has previous sales - total must be >= previous total
        const previousTotal = machineSales[0].totalSales || machineSales[0].amount || 0
        
        if (newSale.totalSales < 0) {
          alert('El total de ventas no puede ser negativo')
          return
        }
        
        if (newSale.totalSales < previousTotal) {
          alert(`El total de ventas ($${newSale.totalSales.toLocaleString()}) no puede ser menor al total de la hora anterior ($${previousTotal.toLocaleString()})`)
          return
        }
      }

      // Calculate the hourly sales amount by finding the difference from previous hour
      const hourlyAmount = await calculateHourlySales(newSale.machineId, newSale.hour, newSale.totalSales)

      // Create timestamp in Mexico timezone to avoid UTC conversion issues
      const mexicoDateString = selectedDate.includes('T') ? selectedDate : `${selectedDate}T${String(newSale.hour).padStart(2, '0')}:00:00-06:00`
      const timestamp = new Date(mexicoDateString)

      const saleData = {
        machineId: newSale.machineId,
        amount: hourlyAmount, // This is the calculated hourly difference
        totalSales: newSale.totalSales, // Store the cumulative total
        timestamp,
        hour: newSale.hour,
        operatorId: userProfile?.uid || 'unknown'
      }

      await SalesService.addSale(saleData)
      await loadSalesData() // Reload data
      
      // Reset form
      const mexicoTime = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
      const mexicoHour = new Date(mexicoTime).getHours()
      
      setNewSale({
        machineId: '76',
        totalSales: 0,
        hour: mexicoHour
      })
      setShowAddForm(false)
    } catch (error) {
      dispatch(setError('Error adding sale'))
      console.error('Error adding sale:', error)
    }
  }

  const calculateHourlySales = async (machineId: string, currentHour: number, totalSales: number): Promise<number> => {
    try {
      // Get all sales for the day to find the previous total
      const allSales = await SalesService.getSalesForDate(selectedDate)
      
      // Find the most recent total for this machine before current hour
      const machineSales = allSales
        .filter(sale => {
          const isCorrectMachine = sale.machineId === machineId
          const isBeforeCurrentHour = sale.hour < currentHour
          return isCorrectMachine && isBeforeCurrentHour
        })
        .sort((a, b) => b.hour - a.hour) // Sort by hour descending
      
      let previousTotal = 0
      if (machineSales.length > 0) {
        // Use totalSales field as it contains the cumulative total
        const lastSale = machineSales[0] as any
        
        // Always use totalSales field (this should be properly set after migration)
        previousTotal = lastSale.totalSales || 0
      }
      
      const calculatedAmount = totalSales - previousTotal
      
      return Math.max(0, calculatedAmount) // Ensure non-negative
    } catch (error) {
      console.error('Error calculating hourly sales:', error)
      return 0
    }
  }

  const calculateTotals = () => {
    return hourlySales.reduce(
      (totals: { machine76: number; machine79: number; total: number }, hourData: HourlySalesData) => ({
        machine76: totals.machine76 + hourData.machine76,
        machine79: totals.machine79 + hourData.machine79,
        total: totals.total + hourData.total
      }),
      { machine76: 0, machine79: 0, total: 0 }
    )
  }

  const totals = calculateTotals()
  
  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Check if user has read access
  if (!canReadSales) {
    return (
      <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center text-gray-600">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          No tiene permisos para ver esta información
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ventas por Hora</h1>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona cualquier fecha para ver o agregar ventas históricas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Fecha:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const newDate = e.target.value
                setSelectedDate(newDate)
                
                // If switching to today and current hour is in the future, adjust to current hour
                if (newDate === getCurrentMexicoDate() && isHourInFuture(newSale.hour)) {
                  setNewSale({ ...newSale, hour: getCurrentMexicoHour() })
                }
              }}
              max={getCurrentMexicoDate()}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {canEditSales && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 whitespace-nowrap"
            >
              {showAddForm ? 'Cancelar' : 'Agregar Venta'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Explanation Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Cómo funciona el registro de ventas
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Cada período representa las ventas que ocurrieron durante esa hora</p>
              <p>• Ejemplo: "13:00 - 14:00" = ventas que ocurrieron de 1:00 PM a 2:00 PM</p>
              <p>• Puedes editar las entradas directamente haciendo clic en "Editar"</p>
              <p>• Para eliminar datos incorrectos, usa el botón "Eliminar"</p>
              <p>• <strong>Solo se permiten registros del presente o pasado</strong> - no se pueden agregar ventas futuras</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Sale Form */}
      {showAddForm && canEditSales && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-medium mb-4">Agregar Nueva Venta</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
              <select
                value={newSale.machineId}
                onChange={(e) => setNewSale({ ...newSale, machineId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="76">Máquina 76</option>
                <option value="79">Máquina 79</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período de Ventas</label>
              <select
                value={newSale.hour}
                onChange={(e) => {
                  const newHour = parseInt(e.target.value)
                  if (!isHourInFuture(newHour)) {
                    setNewSale({ ...newSale, hour: newHour })
                  } else {
                    alert('No se puede seleccionar una hora futura')
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const startHour = i === 0 ? 23 : i - 1;
                  const endHour = i;
                  const isDisabled = isHourInFuture(i);
                  return (
                    <option key={i} value={i} disabled={isDisabled}>
                      {startHour.toString().padStart(2, '0')}:00 - {endHour.toString().padStart(2, '0')}:00
                      {isDisabled ? ' (Futuro)' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecciona el período de ventas que quieres registrar
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Acumulado</label>
              <input
                type="number"
                value={newSale.totalSales}
                onChange={(e) => setNewSale({ ...newSale, totalSales: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total acumulado en la máquina (el sistema calculará la venta de esta hora)
              </p>
            </div>
          </div>
          {previewAmount > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                <strong>Venta calculada para el período {(newSale.hour === 0 ? 23 : newSale.hour-1).toString().padStart(2, '0')}:00 - {newSale.hour.toString().padStart(2, '0')}:00:</strong> ${previewAmount.toLocaleString()}
              </p>
              <p className="text-xs text-green-600">
                (Diferencia entre el total actual y el total de la hora anterior)
              </p>
            </div>
          )}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddSale}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Período de Ventas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Máquina 76
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Máquina 79
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última Act.
              </th>
              {canEditSales && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hourlySales.length > 0 ? (
              hourlySales.map((hourData: HourlySalesData) => (
                <HourRow
                  key={hourData.hour}
                  hourData={hourData}
                  canEdit={canEditSales}
                  selectedDate={selectedDate}
                  onDataChange={loadSalesData}
                />
              ))
            ) : (
              <tr>
                <td colSpan={canEditSales ? 6 : 5} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1M7 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No hay registros de ventas</h3>
                    <p className="text-sm text-gray-500 mb-4">No se encontraron ventas para la fecha seleccionada</p>
                    {canEditSales && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Agregar Primera Venta
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {hourlySales.length > 0 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  TOTAL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                  ${totals.machine76.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                  ${totals.machine79.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  ${totals.total.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                {canEditSales && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

interface HourRowProps {
  hourData: HourlySalesData
  canEdit: boolean
  selectedDate: string
  onDataChange: () => Promise<void>
}

const HourRow: React.FC<HourRowProps> = ({ hourData, canEdit, selectedDate, onDataChange }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteOption, setDeleteOption] = useState<'all' | '76' | '79'>('all')
  const [availableMachines, setAvailableMachines] = useState<{ machine76: boolean, machine79: boolean }>({
    machine76: false,
    machine79: false
  })
  const [editValues, setEditValues] = useState({
    machine76: hourData.machine76,
    machine79: hourData.machine79
  })

  const handleEdit = async () => {
    // Check which machines actually have database records
    try {
      const allSales = await SalesService.getSalesForDate(selectedDate)
      const hourSales = allSales.filter(sale => sale.hour === hourData.hour)
      
      const hasMachine76 = hourSales.some(sale => sale.machineId === '76')
      const hasMachine79 = hourSales.some(sale => sale.machineId === '79')
      
      setAvailableMachines({
        machine76: hasMachine76,
        machine79: hasMachine79
      })
      
      setEditValues({
        machine76: hourData.machine76,
        machine79: hourData.machine79
      })
      setIsEditing(true)
    } catch (error) {
      console.error('Error checking machine availability:', error)
      alert('Error al verificar los datos disponibles')
    }
  }

  const handleSave = async () => {
    try {
      // Calculate new totals based on edited amounts
      const newMachine76Total = editValues.machine76
      const newMachine79Total = editValues.machine79
      
      // Get all sales for this date to understand current state
      const allSales = await SalesService.getSalesForDate(selectedDate)
      const hourSales = allSales.filter(sale => sale.hour === hourData.hour)
      
      // Track which machines were updated to handle subsequent hour recalculations
      const updatedMachines: string[] = []
      
      // Update each machine's sales if they changed and have database records
      for (const sale of hourSales) {
        let newTotalSales = 0
        let newAmount = 0
        
        if (sale.machineId === '76' && availableMachines.machine76 && newMachine76Total !== hourData.machine76) {
          // Calculate new total sales for machine 76
          newAmount = newMachine76Total
          newTotalSales = await calculateNewTotalSales(sale.machineId, sale.hour, newAmount)
          updatedMachines.push('76')
        } else if (sale.machineId === '79' && availableMachines.machine79 && newMachine79Total !== hourData.machine79) {
          // Calculate new total sales for machine 79
          newAmount = newMachine79Total
          newTotalSales = await calculateNewTotalSales(sale.machineId, sale.hour, newAmount)
          updatedMachines.push('79')
        } else {
          continue // No change needed for this sale
        }
        
        // Update the sale with new amount and totalSales
        await SalesService.updateSale(sale.id, sale, {
          amount: newAmount,
          totalSales: newTotalSales
        })
      }
      
      // If we updated any machines, we need to recalculate subsequent hours for those machines
      if (updatedMachines.length > 0) {
        await recalculateSubsequentHours(updatedMachines, hourData.hour)
      }
      
      // Reload data to reflect changes
      await onDataChange()
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating sales:', error)
      alert('Error al actualizar la venta. Por favor intenta de nuevo.')
    }
  }
  
  const recalculateSubsequentHours = async (machines: string[], currentHour: number) => {
    try {
      const allSales = await SalesService.getSalesForDate(selectedDate)
      
      for (const machineId of machines) {
        // Get all sales for this machine after the current hour
        const subsequentSales = allSales
          .filter(sale => sale.machineId === machineId && sale.hour > currentHour)
          .sort((a, b) => a.hour - b.hour)
        
        // Recalculate totalSales for each subsequent hour
        for (const sale of subsequentSales) {
          const newTotalSales = await calculateNewTotalSales(sale.machineId, sale.hour, sale.amount || 0)
          
          await SalesService.updateSale(sale.id, sale, {
            totalSales: newTotalSales
          })
        }
      }
    } catch (error) {
      console.error('Error recalculating subsequent hours:', error)
    }
  }
  
  const calculateNewTotalSales = async (machineId: string, currentHour: number, newHourlyAmount: number): Promise<number> => {
    try {
      // Get all sales for the day to find the previous total
      const allSales = await SalesService.getSalesForDate(selectedDate)
      
      // Find the most recent total for this machine before current hour
      const machineSales = allSales
        .filter(sale => {
          const isCorrectMachine = sale.machineId === machineId
          const isBeforeCurrentHour = sale.hour < currentHour
          return isCorrectMachine && isBeforeCurrentHour
        })
        .sort((a, b) => b.hour - a.hour) // Sort by hour descending
      
      let previousTotal = 0
      if (machineSales.length > 0) {
        const lastSale = machineSales[0] as any
        previousTotal = lastSale.totalSales || 0
      }
      
      // New total = previous total + new hourly amount
      return previousTotal + newHourlyAmount
    } catch (error) {
      console.error('Error calculating new total sales:', error)
      return newHourlyAmount // Fallback to just the hourly amount
    }
  }

  const handleDelete = async () => {
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      // Find all sales entries for this hour
      const allSales = await SalesService.getSalesForDate(selectedDate)
      const hourSales = allSales.filter(sale => sale.hour === hourData.hour)
      
      let salesToDelete = hourSales
      
      // Filter based on delete option
      if (deleteOption === '76') {
        salesToDelete = hourSales.filter(sale => sale.machineId === '76')
      } else if (deleteOption === '79') {
        salesToDelete = hourSales.filter(sale => sale.machineId === '79')
      }
      // If 'all', delete all entries (salesToDelete already contains all)
      
      if (salesToDelete.length === 0) {
        alert(`No se encontraron entradas para ${deleteOption === 'all' ? 'eliminar' : 'la máquina ' + deleteOption}`)
        setShowDeleteModal(false)
        return
      }
      
      for (const sale of salesToDelete) {
        await SalesService.deleteSale(sale.id, sale)
      }
      
      setShowDeleteModal(false)
      await onDataChange() // Refresh the data
    } catch (error) {
      console.error('Error deleting sales:', error)
      alert('Error al eliminar las entradas')
      setShowDeleteModal(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteOption('all')
  }

  const handleCancel = () => {
    setEditValues({
      machine76: hourData.machine76,
      machine79: hourData.machine79
    })
    setIsEditing(false)
  }

  const formatHour = (hour: number) => {
    const startHour = hour === 0 ? 23 : hour - 1;
    const endHour = hour;
    return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`
  }

  const formatLastUpdated = (lastUpdated: string) => {
    const date = new Date(lastUpdated)
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    })
  }

  if (isEditing) {
    return (
      <>
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                  Confirmar Eliminación
                </h3>
                <div className="mt-4 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    ¿Qué deseas eliminar de la hora {formatHour(hourData.hour)}?
                  </p>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deleteOption"
                        value="all"
                        checked={deleteOption === 'all'}
                        onChange={(e) => setDeleteOption(e.target.value as 'all' | '76' | '79')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Todas las entradas (ambas máquinas)</span>
                    </label>
                    
                    {hourData.machine76 > 0 && (
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="deleteOption"
                          value="76"
                          checked={deleteOption === '76'}
                          onChange={(e) => setDeleteOption(e.target.value as 'all' | '76' | '79')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Solo Máquina 76 (${hourData.machine76.toLocaleString()})</span>
                      </label>
                    )}
                    
                    {hourData.machine79 > 0 && (
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="deleteOption"
                          value="79"
                          checked={deleteOption === '79'}
                          onChange={(e) => setDeleteOption(e.target.value as 'all' | '76' | '79')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Solo Máquina 79 (${hourData.machine79.toLocaleString()})</span>
                      </label>
                    )}
                  </div>
                  
                  <p className="text-xs text-red-500 mt-4">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
                
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={cancelDelete}
                      className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <tr className="bg-blue-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {formatHour(hourData.hour)}
            {(!availableMachines.machine76 || !availableMachines.machine79) && (
              <div className="text-xs text-amber-600 mt-1">
                {!availableMachines.machine76 && !availableMachines.machine79 
                  ? 'Sin registros en base de datos'
                  : `Solo ${availableMachines.machine76 ? 'Máquina 76' : 'Máquina 79'} tiene datos`
                }
              </div>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            {availableMachines.machine76 ? (
              <input
                type="number"
                value={editValues.machine76}
                onChange={(e) => setEditValues({ ...editValues, machine76: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            ) : (
              <div className="w-full px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-500 text-center">
                $0 (Sin datos)
              </div>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            {availableMachines.machine79 ? (
              <input
                type="number"
                value={editValues.machine79}
                onChange={(e) => setEditValues({ ...editValues, machine79: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            ) : (
              <div className="w-full px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-500 text-center">
                $0 (Sin datos)
              </div>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
            ${((availableMachines.machine76 ? editValues.machine76 : 0) + (availableMachines.machine79 ? editValues.machine79 : 0)).toLocaleString()}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
            {hourData.total > 0 ? formatLastUpdated(hourData.lastUpdated) : '-'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
            {(availableMachines.machine76 || availableMachines.machine79) ? (
              <>
                <button
                  onClick={handleSave}
                  className="text-green-600 hover:text-green-900 font-medium"
                >
                  Guardar
                </button>
                <button
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-400 text-xs">Sin datos para editar</span>
                <button
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Cerrar
                </button>
              </>
            )}
          </td>
        </tr>
      </>
    )
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Confirmar Eliminación
              </h3>
              <div className="mt-4 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  ¿Qué deseas eliminar de la hora {formatHour(hourData.hour)}?
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="all"
                      checked={deleteOption === 'all'}
                      onChange={(e) => setDeleteOption(e.target.value as 'all' | '76' | '79')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Todas las entradas (ambas máquinas)</span>
                  </label>
                  
                  {hourData.machine76 > 0 && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deleteOption"
                        value="76"
                        checked={deleteOption === '76'}
                        onChange={(e) => setDeleteOption(e.target.value as 'all' | '76' | '79')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Solo Máquina 76 (${hourData.machine76.toLocaleString()})</span>
                    </label>
                  )}
                  
                  {hourData.machine79 > 0 && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deleteOption"
                        value="79"
                        checked={deleteOption === '79'}
                        onChange={(e) => setDeleteOption(e.target.value as 'all' | '76' | '79')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Solo Máquina 79 (${hourData.machine79.toLocaleString()})</span>
                    </label>
                  )}
                </div>
                
                <p className="text-xs text-red-500 mt-4">
                  Esta acción no se puede deshacer.
                </p>
              </div>
              
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatHour(hourData.hour)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
          ${hourData.machine76.toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
          ${hourData.machine79.toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
          ${hourData.total.toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
          {hourData.lastUpdated ? formatLastUpdated(hourData.lastUpdated) : '-'}
        </td>
        {canEdit && (
          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
            {hourData.lastUpdated && (
              <>
                <button
                  onClick={handleEdit}
                  className="text-yellow-600 hover:text-yellow-900 font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-900 font-medium"
                >
                  Eliminar
                </button>
              </>
            )}
          </td>
        )}
      </tr>
    </>
  )
}

export default HourlySales
