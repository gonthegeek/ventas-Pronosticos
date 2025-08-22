import React from 'react'
import { Button } from '../ui/Button'
import { SaleEntry } from '../../state/slices/salesSlice'

interface SalesTableProps {
  sales: SaleEntry[]
  selectedMachine: string
  onEdit?: (sale: SaleEntry) => void
  onDelete?: (sale: SaleEntry) => void
  canEdit?: boolean
  isLoading?: boolean
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  selectedMachine,
  onEdit,
  onDelete,
  canEdit = false,
  isLoading = false
}) => {
  // Filter sales by machine
  const filteredSales = selectedMachine === 'all' 
    ? sales 
    : sales.filter(sale => sale.machineId === selectedMachine)

  // Sort by hour
  const sortedSales = filteredSales.sort((a, b) => a.hour - b.hour)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando ventas...</p>
        </div>
      </div>
    )
  }

  if (sortedSales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 text-center">
          <p className="text-gray-500">No hay ventas registradas para la fecha seleccionada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Máquina
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Venta Horaria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Acumulado
              </th>
              {canEdit && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSales.map((sale) => (
                            <tr key={sale.id}>
                <td className="border-b border-gray-200 px-4 py-2 text-sm">
                  {sale.hour}:00
                </td>
                <td className="border-b border-gray-200 px-4 py-2 text-sm">
                  {sale.machineId}
                </td>
                <td className="border-b border-gray-200 px-4 py-2 text-sm">
                  ${sale.amount.toLocaleString()}
                </td>
                <td className="border-b border-gray-200 px-4 py-2 text-sm">
                  ${(sale.totalSales || sale.amount).toLocaleString()}
                </td>
                <td className="border-b border-gray-200 px-4 py-2 text-sm">
                  {sale.notes || '-'}
                </td>
                {canEdit && (
                  <td className="border-b border-gray-200 px-4 py-2 text-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.(sale)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete?.(sale)}
                    >
                      Eliminar
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Summary */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Total de registros: {sortedSales.length}
          </span>
          <span className="font-medium text-gray-900">
            Total del día: ${sortedSales.reduce((sum, sale) => sum + (sale.amount || 0), 0).toLocaleString('es-MX', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default SalesTable
