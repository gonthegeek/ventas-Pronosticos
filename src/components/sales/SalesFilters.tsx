import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface SalesFiltersProps {
  selectedDate: string
  onDateChange: (date: string) => void
  selectedMachine: '76' | '79' | 'all'
  onMachineChange: (machine: '76' | '79' | 'all') => void
  isLoading?: boolean
}

export const SalesFilters: React.FC<SalesFiltersProps> = ({
  selectedDate,
  onDateChange,
  selectedMachine,
  onMachineChange,
  isLoading = false
}) => {
  const [showDateRangeModal, setShowDateRangeModal] = useState(false)
  
  const getCurrentMexicoDate = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  }

  const handleTodayClick = () => {
    onDateChange(getCurrentMexicoDate())
  }

  const handleYesterdayClick = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayString = yesterday.toLocaleDateString('en-CA', { 
      timeZone: 'America/Mexico_City' 
    })
    onDateChange(yesterdayString)
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Date Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Fecha:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTodayClick}
              disabled={isLoading}
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleYesterdayClick}
              disabled={isLoading}
            >
              Ayer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDateRangeModal(true)}
              disabled={isLoading}
            >
              Rango
            </Button>
          </div>
        </div>

        {/* Machine Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Máquina:
          </label>
          <select
            value={selectedMachine}
            onChange={(e) => onMachineChange(e.target.value as '76' | '79' | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="all">Todas</option>
            <option value="76">Máquina 76</option>
            <option value="79">Máquina 79</option>
          </select>
        </div>
      </div>

      {/* Date Range Modal */}
      <Modal
        isOpen={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        title="Seleccionar Rango de Fechas"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Próximamente: Selección de rango de fechas para análisis comparativo
          </p>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowDateRangeModal(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SalesFilters
