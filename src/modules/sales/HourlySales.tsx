import React, { useState, useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../state/hooks'
import { SaleEntry } from '../../state/slices/salesSlice'
import { SalesService } from '../../services/SalesService'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'

// Import our new composed components
import { SalesFilters, SalesTable, SalesForm, SalesStats, ExportTools } from '../../components/sales'
import { Card, LoadingSpinner } from '../../components/ui'

const HourlySales: React.FC = () => {
  const dispatch = useAppDispatch()
  const { userProfile } = useAppSelector((state) => state.auth)
  
  // Permissions
  const canEditSales = useHasPermission(PERMISSIONS.VENTAS_WRITE)
  const canReadSales = useHasPermission(PERMISSIONS.VENTAS_READ)
  
  // State management
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current date in Mexico timezone
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  })
  
  const [selectedMachine, setSelectedMachine] = useState<'76' | '79' | 'all'>('all')
  const [sales, setSales] = useState<SaleEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingSale, setEditingSale] = useState<SaleEntry | null>(null)
  
  // Helper functions
  const getCurrentMexicoDate = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  }
  
  const getCurrentMexicoHour = () => {
    return parseInt(new Date().toLocaleString('en-US', { 
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      hour12: false 
    }))
  }
  
  // Data loading
  const loadSalesData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get all sales for the selected date
      const allSales = await SalesService.getSalesForDate(selectedDate)
      
      // Filter by selected machine (if not 'all')
      const filteredSales = selectedMachine === 'all' 
        ? allSales 
        : allSales.filter(sale => sale.machineId === selectedMachine)
      
      setSales(filteredSales)
    } catch (error) {
      setError('Error loading sales data')
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate, selectedMachine])
  
  // Effects
  useEffect(() => {
    if (canReadSales) {
      loadSalesData()
    }
  }, [canReadSales, loadSalesData])
  
  // Event handlers
  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate)
  }, [])
  
  const handleMachineChange = useCallback((machine: '76' | '79' | 'all') => {
    setSelectedMachine(machine)
  }, [])
  
  const handleAddSale = useCallback(() => {
    setEditingSale(null)
    setShowForm(true)
  }, [])
  
  const handleEditSale = useCallback((sale: SaleEntry) => {
    setEditingSale(sale)
    setShowForm(true)
  }, [])
  
  const handleDeleteSale = useCallback(async (sale: SaleEntry) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
      return
    }
    
    try {
      setIsLoading(true)
      await SalesService.deleteSale(sale.id, sale)
      await loadSalesData() // Refresh data
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(`Error al eliminar la venta: ${error.message || 'Por favor intenta de nuevo.'}`)
    } finally {
      setIsLoading(false)
    }
  }, [loadSalesData])
  
  const handleSalesSubmit = useCallback(async (saleData: Partial<SaleEntry>) => {
    try {
      setIsLoading(true)
      
      if (editingSale) {
        // Update existing sale - the service will automatically calculate the amount
        await SalesService.updateSale(editingSale.id, editingSale, saleData)
      } else {
        // Create new sale
        const now = new Date()
        // Prefer machineId from form data (user selection), fallback to selectedMachine filter
        const machineToUse = saleData.machineId || (selectedMachine === 'all' ? '76' : selectedMachine)
        const fullSaleData: any = {
          machineId: machineToUse,
          amount: saleData.amount!,
          totalSales: saleData.totalSales,
          timestamp: now,
          // Include the intended date (from the form) if provided so addSale validates/stores in correct day
          date: (saleData as any).date || selectedDate,
          hour: saleData.hour!,
          operatorId: userProfile?.uid || 'unknown',
          notes: saleData.notes
        }
        
        await SalesService.addSale(fullSaleData)
      }
      
      await loadSalesData() // Refresh data
      setShowForm(false)
      setEditingSale(null)
    } catch (error: any) {
      console.error('Save error:', error)
      alert(`Error al guardar la venta: ${error.message || 'Por favor intenta de nuevo.'}`)
    } finally {
      setIsLoading(false)
    }
  }, [editingSale, selectedMachine, userProfile?.uid, loadSalesData, selectedDate])
  
  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditingSale(null)
  }, [])
  
  // Permission check
  if (!canReadSales) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tienes permisos para ver esta sección.</p>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error: {error}</p>
        <button 
          onClick={loadSalesData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reintentar
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ventas por Hora</h1>
        {canEditSales && (
          <button
            onClick={handleAddSale}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Nueva Venta
          </button>
        )}
      </div>
      
      {/* Filters */}
      <SalesFilters
        selectedDate={selectedDate}
        selectedMachine={selectedMachine}
        onDateChange={handleDateChange}
        onMachineChange={handleMachineChange}
      />
      
      {/* Statistics */}
      <SalesStats
        sales={sales}
        selectedDate={selectedDate}
        selectedMachine={selectedMachine}
      />
      
      {/* Sales Table */}
      <Card 
        title="Detalle de Ventas" 
        subtitle={selectedMachine === 'all' ? `Todas las máquinas - ${selectedDate}` : `Máquina ${selectedMachine} - ${selectedDate}`}
        actions={<ExportTools sales={sales} selectedDate={selectedDate} selectedMachine={selectedMachine} />}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <SalesTable
            sales={sales}
            selectedMachine={selectedMachine}
            onEdit={canEditSales ? handleEditSale : undefined}
            onDelete={canEditSales ? handleDeleteSale : undefined}
            canEdit={canEditSales}
            isLoading={isLoading}
          />
        )}
      </Card>
      
      {/* Sales Form Modal */}
      <SalesForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSalesSubmit}
        sale={editingSale}
        selectedDate={selectedDate}
        selectedMachine={selectedMachine}
        isSubmitting={isLoading}
      />
    </div>
  )
}

export default HourlySales
