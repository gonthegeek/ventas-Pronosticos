import React from 'react'
import { Card } from '../ui/Card'
import { SaleEntry } from '../../state/slices/salesSlice'

interface SalesStatsProps {
  sales: SaleEntry[]
  selectedMachine: '76' | '79' | 'all'
  selectedDate: string
}

interface StatsData {
  totalSales: number
  totalAmount: number
  averagePerHour: number
  hoursWithSales: number
  lastUpdate: string | null
}

export const SalesStats: React.FC<SalesStatsProps> = ({
  sales,
  selectedMachine,
  selectedDate
}) => {
  const calculateStats = (): StatsData => {
    if (!sales.length) {
      return {
        totalSales: 0,
        totalAmount: 0,
        averagePerHour: 0,
        hoursWithSales: 0,
        lastUpdate: null
      }
    }

    const totalAmount = sales.reduce((sum, sale) => sum + sale.amount, 0)
    // Count unique hours only (not total entries) to avoid duplicate hour counting
    const uniqueHours = new Set(sales.map(sale => sale.hour))
    const hoursWithSales = uniqueHours.size
    const averagePerHour = hoursWithSales > 0 ? totalAmount / hoursWithSales : 0
    
    // For "all" machines, we need to calculate total differently
    let totalSales = 0
    
    if (selectedMachine === 'all') {
      // Get the latest totalSales for each machine separately
      const machine76Sales = sales.filter(sale => sale.machineId === '76')
      const machine79Sales = sales.filter(sale => sale.machineId === '79')
      
      const latest76 = machine76Sales
        .filter(sale => sale.totalSales !== undefined)
        .sort((a, b) => b.hour - a.hour)[0]
      
      const latest79 = machine79Sales
        .filter(sale => sale.totalSales !== undefined)
        .sort((a, b) => b.hour - a.hour)[0]
      
      const total76 = latest76?.totalSales || machine76Sales.reduce((sum, sale) => sum + sale.amount, 0)
      const total79 = latest79?.totalSales || machine79Sales.reduce((sum, sale) => sum + sale.amount, 0)
      
      totalSales = total76 + total79
    } else {
      // Single machine - get the latest totalSales
      const latestSale = sales
        .filter(sale => sale.totalSales !== undefined)
        .sort((a, b) => b.hour - a.hour)[0]
      
      totalSales = latestSale?.totalSales || totalAmount
    }
    
    // Get last update timestamp
    const lastUpdate = sales.length > 0 
      ? new Date(Math.max(...sales.map(sale => new Date(sale.timestamp).getTime()))).toLocaleTimeString()
      : null

    return {
      totalSales,
      totalAmount,
      averagePerHour,
      hoursWithSales,
      lastUpdate
    }
  }

  const stats = calculateStats()

  const StatCard: React.FC<{ 
    title: string
    value: string | number
    subtitle?: string
    color?: 'blue' | 'green' | 'purple' | 'orange'
  }> = ({ title, value, subtitle, color = 'blue' }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      orange: 'text-orange-600 bg-orange-50'
    }

    return (
      <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
        <div className="text-sm font-medium text-gray-600">{title}</div>
        <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        )}
      </div>
    )
  }

  return (
    <Card 
      title="Estadísticas de Ventas"
      subtitle={selectedMachine === 'all' ? `Todas las máquinas - ${selectedDate}` : `Máquina ${selectedMachine} - ${selectedDate}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total en Máquina"
          value={`$${stats.totalSales.toLocaleString()}`}
          subtitle="Acumulado"
          color="green"
        />
        
        <StatCard
          title="Ventas del Día"
          value={`$${stats.totalAmount.toLocaleString()}`}
          subtitle={`${stats.hoursWithSales} horas registradas`}
          color="blue"
        />
        
        <StatCard
          title="Promedio por Hora"
          value={`$${stats.averagePerHour.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle="Basado en horas con ventas"
          color="purple"
        />
        
        <StatCard
          title="Horas Activas"
          value={`${stats.hoursWithSales}/24`}
          subtitle={stats.lastUpdate ? `Última: ${stats.lastUpdate}` : 'Sin datos'}
          color="orange"
        />
      </div>

      {/* Quick insights */}
      {sales.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Resumen del Día</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              • <strong>Mejor hora:</strong> {
                sales.reduce((best, sale) => 
                  sale.amount > best.amount ? sale : best
                ).hour
              }:00 (${
                sales.reduce((best, sale) => 
                  sale.amount > best.amount ? sale : best
                ).amount.toLocaleString()
              })
            </div>
            <div>
              • <strong>Primera venta:</strong> {Math.min(...sales.map(s => s.hour))}:00
            </div>
            <div>
              • <strong>Última venta:</strong> {Math.max(...sales.map(s => s.hour))}:00
            </div>
            {stats.totalSales > stats.totalAmount && (
              <div>
                • <strong>Ventas anteriores:</strong> ${(stats.totalSales - stats.totalAmount).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {sales.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg mb-2">📊</div>
          <div>No hay ventas registradas para este día</div>
          <div className="text-sm">Agrega la primera venta para ver las estadísticas</div>
        </div>
      )}
    </Card>
  )
}
