import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { AppDispatch } from '../../state/store'
import { SalesService } from '../../services/SalesService'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'

interface QuickSalesEntryProps {
  onSaleAdded?: () => void
}

const QuickSalesEntry: React.FC<QuickSalesEntryProps> = ({ onSaleAdded }) => {
  const dispatch = useDispatch<AppDispatch>()
  const { userProfile } = useSelector((state: RootState) => state.auth)
  
  // Use new permissions system
  const canWriteSales = useHasPermission(PERMISSIONS.VENTAS_WRITE)
  
  // Local loading state
  const [isFormLoading, setIsFormLoading] = useState(false)
  
  // Helper function to get current Mexico time hour
  const getCurrentMexicoHour = () => {
    const mexicoTime = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
    return new Date(mexicoTime).getHours()
  }

  // Helper function to format date for Mexico timezone
  const formatDateForMexico = (date: Date) => {
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  }

  // Helper function to get current date in Mexico timezone
  const getCurrentMexicoDate = () => {
    const now = new Date()
    return now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  }

  // Check if a specific hour is in the future
  const isHourInFuture = (hour: number) => {
    if (formData.date !== getCurrentMexicoDate()) {
      return false // If not today, no hours are in future
    }
    return hour > getCurrentMexicoHour()
  }

  const [formData, setFormData] = useState({
    machineId: '76',
    totalSales: '',
    hour: getCurrentMexicoHour(),
    date: formatDateForMexico(new Date()) // Add date selection
  })
  const [preview, setPreview] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate preview when form data changes
  useEffect(() => {
    const calculatePreview = async () => {
      if (formData.machineId && formData.totalSales && formData.date) {
        try {
          const totalSales = parseFloat(formData.totalSales)
          if (isNaN(totalSales) || totalSales <= 0) {
            setPreview(null)
            return
          }

          // Get all raw sales entries for the day to calculate properly
          const allSales = await SalesService.getSalesForDate(formData.date)
          
          // Find the most recent total for this machine before current hour
          const machineSales = allSales
            .filter(sale => sale.machineId === formData.machineId && sale.hour < formData.hour)
            .sort((a, b) => b.hour - a.hour) // Sort by hour descending
          
          let previousTotal = 0
          if (machineSales.length > 0) {
            // Get the totalSales from the most recent entry
            const lastSale = machineSales[0] as any
            previousTotal = lastSale.totalSales || lastSale.amount || 0
          }
          
          const hourlySales = totalSales - previousTotal
          setPreview(hourlySales >= 0 ? hourlySales : 0)
        } catch (error) {
          setPreview(null)
        }
      } else {
        setPreview(null)
      }
    }

    calculatePreview()
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWriteSales) return

    setError('')
    setSuccess('')
    setIsSubmitting(true)
    setIsFormLoading(true)

    try {
      // Check for future date/time validation first
      const currentDate = getCurrentMexicoDate()
      const currentHour = getCurrentMexicoHour()
      
      // Prevent future date entries
      if (formData.date > currentDate) {
        throw new Error('No se puede registrar ventas para fechas futuras')
      }
      
      // Prevent future hour entries for today
      if (formData.date === currentDate && formData.hour > currentHour) {
        throw new Error('No se puede registrar ventas para horas futuras')
      }

      const totalSales = parseFloat(formData.totalSales)
      if (isNaN(totalSales) || totalSales < 0) {
        throw new Error('Please enter a valid total amount')
      }

      const today = formData.date
      // Get all raw sales entries to calculate properly
      const allSales = await SalesService.getSalesForDate(today)
      
      // Find the most recent total for this machine before current hour
      const machineSales = allSales
        .filter(sale => sale.machineId === formData.machineId && sale.hour < formData.hour)
        .sort((a, b) => b.hour - a.hour) // Sort by hour descending
      
      let previousTotal = 0
      if (machineSales.length > 0) {
        // Get the totalSales from the most recent entry
        const lastSale = machineSales[0] as any
        previousTotal = lastSale.totalSales || lastSale.amount || 0
      }
      
      const hourlySales = totalSales - previousTotal

      if (hourlySales < 0) {
        throw new Error('El total acumulado no puede ser menor al de la hora anterior')
      }

      // Check if entry already exists for this hour and machine
      const existingHourSales = allSales.filter(sale => 
        sale.machineId === formData.machineId && sale.hour === formData.hour
      )
      if (existingHourSales.length > 0) {
        throw new Error('Ya existe una entrada para esta máquina y hora')
      }

      // Create sale entry
      const saleData = {
        machineId: formData.machineId,
        amount: hourlySales,
        timestamp: new Date(),
        hour: formData.hour,
        operatorId: userProfile?.uid || 'unknown',
        notes: `Total acumulado: $${totalSales.toFixed(2)}`,
        totalSales: totalSales // Add this for the service
      }

      await SalesService.addSale(saleData as any)
      
      setSuccess('Venta registrada exitosamente')
      setFormData({
        machineId: '76',
        totalSales: '',
        hour: getCurrentMexicoHour(),
        date: formatDateForMexico(new Date())
      })
      setPreview(null)
      
      if (onSaleAdded) {
        onSaleAdded()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Error al registrar la venta')
    } finally {
      setIsSubmitting(false)
      setIsFormLoading(false)
    }
  }

  if (!canWriteSales) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600 text-center">
          <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          No tiene permisos para agregar ventas
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Registro Rápido de Ventas</h3>
          <p className="text-sm text-gray-500 mt-1">
            Registra las ventas por período horario. Ej: registrar a las 14:00 = ventas de 13:00 a 14:00
            <br />
            <span className="text-orange-600 font-medium">Solo se permiten registros del presente y pasado, no de fechas/horas futuras.</span>
          </p>
        </div>
        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={formData.date}
              max={getCurrentMexicoDate()}
              onChange={(e) => {
                const newDate = e.target.value
                setFormData({ ...formData, date: newDate })
                
                // Auto-adjust hour if switching to current date and current hour is in future
                if (newDate === getCurrentMexicoDate() && isHourInFuture(formData.hour)) {
                  setFormData(prev => ({ ...prev, date: newDate, hour: getCurrentMexicoHour() }))
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máquina
            </label>
            <select
              value={formData.machineId}
              onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="76">Máquina 76</option>
              <option value="79">Máquina 79</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período de Ventas
            </label>
            <select
              value={formData.hour}
              onChange={(e) => {
                const newHour = parseInt(e.target.value)
                if (!isHourInFuture(newHour)) {
                  setFormData({ ...formData, hour: newHour })
                } else {
                  alert('No se puede seleccionar una hora futura')
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {Array.from({ length: 24 }, (_, i) => {
                const startHour = i === 0 ? 23 : i - 1;
                const endHour = i;
                const isDisabled = isHourInFuture(i);
                const label = isDisabled ? ' (Futuro)' : '';
                return (
                  <option key={i} value={i} disabled={isDisabled}>
                    {startHour.toString().padStart(2, '0')}:00 - {endHour.toString().padStart(2, '0')}:00{label}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Acumulado
            </label>
            <input
              type="number"
              value={formData.totalSales}
              onChange={(e) => setFormData({ ...formData, totalSales: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Preview */}
        {preview !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-sm">
              <span className="text-blue-700 font-medium">
                Venta período {(formData.hour === 0 ? 23 : formData.hour-1).toString().padStart(2, '0')}:00 - {formData.hour.toString().padStart(2, '0')}:00: 
              </span>
              <span className="text-blue-900 font-bold"> ${preview.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isFormLoading || isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              'Registrar Venta'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default QuickSalesEntry
