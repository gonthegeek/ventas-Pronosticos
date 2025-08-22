import React from 'react'
import { Button } from '../ui/Button'
import { SaleEntry } from '../../state/slices/salesSlice'

interface ExportToolsProps {
  sales: SaleEntry[]
  selectedDate: string
  selectedMachine: '76' | '79' | 'all'
  onExport?: (format: 'csv' | 'json') => void
  isExporting?: boolean
}

export const ExportTools: React.FC<ExportToolsProps> = ({
  sales,
  selectedDate,
  selectedMachine,
  onExport,
  isExporting = false
}) => {
  const downloadCSV = () => {
    if (!sales.length) {
      alert('No hay datos para exportar')
      return
    }

    // CSV Headers
    const headers = [
      'Fecha',
      'Hora',
      'Máquina',
      'Monto',
      'Total Acumulado',
      'Operador',
      'Notas',
      'Timestamp'
    ]

    // Convert sales to CSV rows
    const csvData = sales.map(sale => [
      selectedDate,
      `${sale.hour}:00`,
      sale.machineId,
      sale.amount.toString(),
      (sale.totalSales || sale.amount).toString(),
      sale.operatorId || '',
      sale.notes || '',
      new Date(sale.timestamp).toISOString()
    ])

    // Combine headers and data
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `ventas_maquina_${selectedMachine}_${selectedDate}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    onExport?.('csv')
  }

  const downloadJSON = () => {
    if (!sales.length) {
      alert('No hay datos para exportar')
      return
    }

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        selectedDate,
        selectedMachine,
        totalRecords: sales.length,
        totalAmount: sales.reduce((sum, sale) => sum + sale.amount, 0)
      },
      sales: sales.map(sale => ({
        ...sale,
        timestamp: new Date(sale.timestamp).toISOString()
      }))
    }

    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `ventas_maquina_${selectedMachine}_${selectedDate}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    onExport?.('json')
  }

  const printReport = () => {
    if (!sales.length) {
      alert('No hay datos para imprimir')
      return
    }

    const totalAmount = sales.reduce((sum, sale) => sum + sale.amount, 0)
    const latestTotal = sales
      .filter(sale => sale.totalSales !== undefined)
      .sort((a, b) => b.hour - a.hour)[0]?.totalSales || totalAmount

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Ventas - Máquina ${selectedMachine}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #e8f4fd; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Casa Pronósticos</h1>
          <h2>Reporte de Ventas por Hora</h2>
          <p>Máquina ${selectedMachine} | Fecha: ${selectedDate}</p>
        </div>
        
        <div class="summary">
          <h3>Resumen del Día</h3>
          <p><strong>Total del Día:</strong> $${totalAmount.toLocaleString()}</p>
          <p><strong>Total Acumulado:</strong> $${latestTotal.toLocaleString()}</p>
          <p><strong>Horas con Ventas:</strong> ${sales.length}</p>
          <p><strong>Promedio por Hora:</strong> $${(totalAmount / sales.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Monto</th>
              <th>Total Acumulado</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            ${sales.sort((a, b) => a.hour - b.hour).map(sale => `
              <tr>
                <td>${sale.hour}:00</td>
                <td>$${sale.amount.toLocaleString()}</td>
                <td>$${(sale.totalSales || sale.amount).toLocaleString()}</td>
                <td>${sale.notes || '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>TOTAL</strong></td>
              <td><strong>$${totalAmount.toLocaleString()}</strong></td>
              <td><strong>$${latestTotal.toLocaleString()}</strong></td>
              <td>-</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Generado el ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
          <p>Sistema de Gestión de Ventas - Casa Pronósticos</p>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={downloadCSV}
        disabled={isExporting || !sales.length}
        loading={isExporting}
      >
        📊 Exportar CSV
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={downloadJSON}
        disabled={isExporting || !sales.length}
        loading={isExporting}
      >
        📄 Exportar JSON
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={printReport}
        disabled={isExporting || !sales.length}
      >
        🖨️ Imprimir
      </Button>
      
      {sales.length === 0 && (
        <span className="text-sm text-gray-500 py-1">
          No hay datos para exportar
        </span>
      )}
    </div>
  )
}
