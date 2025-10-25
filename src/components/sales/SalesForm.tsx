import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SaleEntry } from '../../state/slices/salesSlice'
import { SalesService } from '../../services/SalesService'

interface SalesFormProps {
  isOpen: boolean
  onClose: () => void
  sale?: SaleEntry | null
  selectedDate: string
  selectedMachine: '76' | '79' | 'all'
  onSubmit: (saleData: Partial<SaleEntry>) => Promise<void>
  isSubmitting?: boolean
}

interface FormData {
  hour: string
  machineId: string
  totalSales: string
  notes: string
}

export const SalesForm: React.FC<SalesFormProps> = ({
  isOpen,
  onClose,
  sale,
  selectedDate,
  selectedMachine,
  onSubmit,
  isSubmitting = false
}) => {
  const [formData, setFormData] = React.useState<FormData>({
    hour: sale?.hour?.toString() || '',
    machineId: sale?.machineId || (selectedMachine !== 'all' ? selectedMachine : '76'),
    totalSales: sale?.totalSales?.toString() || sale?.amount?.toString() || '',
    notes: sale?.notes || ''
  })

  const [errors, setErrors] = React.useState<Partial<FormData>>({})
  const [businessErrors, setBusinessErrors] = React.useState<string[]>([])
  const [isValidating, setIsValidating] = React.useState(false)

  // Reset form when sale prop changes
  React.useEffect(() => {
    if (sale) {
      setFormData({
        hour: sale.hour?.toString() || '',
        machineId: sale.machineId || (selectedMachine !== 'all' ? selectedMachine : '76'),
        totalSales: sale.totalSales?.toString() || sale.amount?.toString() || '',
        notes: sale.notes || ''
      })
    } else {
      setFormData({
        hour: '',
        machineId: selectedMachine !== 'all' ? selectedMachine : '76',
        totalSales: '',
        notes: ''
      })
    }
    setErrors({})
  }, [sale, selectedMachine])

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.hour) {
      newErrors.hour = 'La hora es requerida'
    } else {
      const hour = parseInt(formData.hour)
      if (isNaN(hour) || hour < 0 || hour > 23) {
        newErrors.hour = 'La hora debe estar entre 0 y 23'
      }
    }

    if (!formData.totalSales) {
      newErrors.totalSales = 'El total de ventas es requerido'
    } else {
      const totalSales = parseFloat(formData.totalSales)
      if (isNaN(totalSales) || totalSales < 0) {
        newErrors.totalSales = 'El total debe ser un número positivo'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Business logic validation (async)
  const validateBusinessRules = async (): Promise<boolean> => {
    setIsValidating(true)
    setBusinessErrors([])
    
    try {
      const hour = parseInt(formData.hour)
      const totalSales = parseFloat(formData.totalSales)
      const machineId = formData.machineId as '76' | '79'
      
      // Skip business validation if editing existing sale (same hour)
      if (sale && sale.hour === hour && sale.machineId === machineId) {
        setIsValidating(false)
        return true
      }
      
      const validation = await SalesService.validateSaleEntry({
        machineId,
        date: selectedDate,
        hour,
        totalSales
      })
      
      if (!validation.isValid) {
        setBusinessErrors(validation.errors)
        setIsValidating(false)
        return false
      }
      
      setIsValidating(false)
      return true
    } catch (error) {
      setBusinessErrors(['Error al validar los datos. Intenta nuevamente.'])
      setIsValidating(false)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // First, validate basic form inputs
    if (!validateForm()) {
      return
    }

    // Then, validate business rules
    const businessValidationPassed = await validateBusinessRules()
    if (!businessValidationPassed) {
      return
    }

    const hour = parseInt(formData.hour)
    const totalSales = parseFloat(formData.totalSales)
    const machineId = formData.machineId as '76' | '79'

    // Compute delta amount from cumulative totalSales using the shared service
    const { delta } = await SalesService.computeHourlyDelta({
      date: selectedDate,
      hour,
      machineId,
      totalSales
    })

    const saleData: Partial<SaleEntry> = {
      hour,
      machineId,
      amount: delta,
      totalSales,
      notes: formData.notes || '' // Always pass notes, even if empty
    }

    try {
      await onSubmit(saleData)
      onClose()
    } catch (error) {
      setBusinessErrors(['Error al guardar la venta. Intenta nuevamente.'])
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    // Clear business errors when form changes
    if (businessErrors.length > 0) {
      setBusinessErrors([])
    }
  }

  const generateHourOptions = () => {
    return Array.from({ length: 24 }, (_, i) => (
      <option key={i} value={i}>
        {i.toString().padStart(2, '0')}:00
      </option>
    ))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sale ? 'Editar Venta' : 'Nueva Venta'}
      size="md"
    >
      <Card 
        subtitle={selectedMachine === 'all' ? `Fecha: ${selectedDate}` : `Máquina ${selectedMachine} - ${selectedDate}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Machine Selection (only show when selectedMachine is 'all') */}
          {selectedMachine === 'all' && (
            <div>
              <label htmlFor="machineId" className="block text-sm font-medium text-gray-700 mb-1">
                Máquina <span className="text-red-500">*</span>
              </label>
              <select
                id="machineId"
                value={formData.machineId}
                onChange={(e) => handleInputChange('machineId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="76">Máquina 76</option>
                <option value="79">Máquina 79</option>
              </select>
            </div>
          )}

          {/* Hour Selection */}
          <div>
            <label htmlFor="hour" className="block text-sm font-medium text-gray-700 mb-1">
              Hora <span className="text-red-500">*</span>
            </label>
            <select
              id="hour"
              value={formData.hour}
              onChange={(e) => handleInputChange('hour', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.hour ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Seleccionar hora</option>
              {generateHourOptions()}
            </select>
            {errors.hour && <p className="text-red-500 text-sm mt-1">{errors.hour}</p>}
          </div>

          {/* Total Sales */}
          <div>
            <label htmlFor="totalSales" className="block text-sm font-medium text-gray-700 mb-1">
              Total de Ventas <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="totalSales"
              step="0.01"
              min="0"
              value={formData.totalSales}
              onChange={(e) => handleInputChange('totalSales', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.totalSales ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.totalSales && <p className="text-red-500 text-sm mt-1">{errors.totalSales}</p>}
            {sale && (
              <p className="text-blue-600 text-xs mt-1">
                ℹ️ Ingresa el total acumulado hasta esta hora. El sistema calculará automáticamente la venta de la hora.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Observaciones adicionales..."
              disabled={isSubmitting}
            />
          </div>

          {/* Business Validation Errors */}
          {businessErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error de validación
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      {businessErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting || isValidating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || isValidating}
              disabled={isSubmitting || isValidating}
            >
              {isValidating ? 'Validando...' : (sale ? 'Actualizar' : 'Guardar')}
            </Button>
          </div>
        </form>
      </Card>
    </Modal>
  )
}
