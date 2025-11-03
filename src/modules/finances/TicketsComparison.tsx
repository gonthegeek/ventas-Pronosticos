import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TicketsService from '../../services/TicketsService';
import { TicketEntry } from '../../services/TicketsService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import TicketsComparisonChart from '../../components/sales/TicketsComparisonChart';
import Card from '../../components/ui/Card';
import { useHasPermission } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';

interface ComparisonData {
  date: string;
  displayName: string;
  totalTickets: number;
  machine76: number;
  machine79: number;
  entries: TicketEntry[];
}

type ComparisonMode = 'day' | 'week' | 'month' | 'weekday';

const TicketsComparison: React.FC = () => {
  const canRead = useHasPermission(PERMISSIONS.BOLETOS_READ);
  const [mode, setMode] = useState<ComparisonMode>('day');
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range inputs
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Weekday comparison mode settings
  const [selectedWeekday, setSelectedWeekday] = useState<number>(1); // 0=Sunday, 1=Monday, etc.
  const [weekCount, setWeekCount] = useState<number>(8); // How many weeks to compare
  
  // Machine filter
  const [selectedMachines, setSelectedMachines] = useState<string[]>(['76', '79']);
  
  // Chart mode
  const [chartMode, setChartMode] = useState<'line' | 'bar'>(() => {
    const saved = localStorage.getItem('ticketsComparison_chartMode');
    return (saved === 'line' || saved === 'bar') ? saved : 'line';
  });
  
  // Visibility toggles
  const [showChart, setShowChart] = useState(() => {
    const saved = localStorage.getItem('ticketsComparison_showChart');
    return saved !== null ? saved === 'true' : true;
  });
  const [showTable, setShowTable] = useState(() => {
    const saved = localStorage.getItem('ticketsComparison_showTable');
    return saved !== null ? saved === 'true' : true;
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('ticketsComparison_chartMode', chartMode);
  }, [chartMode]);

  useEffect(() => {
    localStorage.setItem('ticketsComparison_showChart', String(showChart));
  }, [showChart]);

  useEffect(() => {
    localStorage.setItem('ticketsComparison_showTable', String(showTable));
  }, [showTable]);

  // Clear data when switching modes
  useEffect(() => {
    setComparisonData([]);
    setError(null);
  }, [mode]);

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-red-600">No tienes permiso para ver comparaciones de boletos.</div>
        </Card>
      </div>
    );
  }

  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const handleCompare = async () => {
    if (!startDate || !endDate) {
      setError('Por favor selecciona ambas fechas de inicio y fin');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const dates = generateDateRange(startDate, endDate);
      
      if (mode === 'day' && dates.length > 365) {
        setError('Por favor selecciona un rango de 365 días o menos para comparación diaria');
        setLoading(false);
        return;
      }
      
      // Fetch all tickets for the date range
      const allTickets: TicketEntry[] = [];
      const datesByMonth = new Map<string, string[]>();
      
      // Group dates by month
      dates.forEach(date => {
        const [year, month] = date.split('-');
        const key = `${year}-${month}`;
        if (!datesByMonth.has(key)) {
          datesByMonth.set(key, []);
        }
        datesByMonth.get(key)!.push(date);
      });
      
      // Fetch tickets for each month
      for (const [yearMonth, monthDates] of datesByMonth.entries()) {
        const [year, month] = yearMonth.split('-').map(Number);
        const tickets = await TicketsService.list(year, month);
        allTickets.push(...tickets.filter(t => monthDates.includes(t.date)));
      }
      
      // Process data based on mode
      let processedData: ComparisonData[] = [];
      
      if (mode === 'day') {
        processedData = dates.map(date => {
          const dayTickets = allTickets.filter(t => t.date === date);
          const machine76 = dayTickets
            .filter(t => t.machineId === '76')
            .reduce((sum, t) => sum + t.ticketsDay, 0);
          const machine79 = dayTickets
            .filter(t => t.machineId === '79')
            .reduce((sum, t) => sum + t.ticketsDay, 0);
          
          return {
            date,
            displayName: new Date(date).toLocaleDateString('es-ES', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            }),
            totalTickets: machine76 + machine79,
            machine76,
            machine79,
            entries: dayTickets,
          };
        });
      } else if (mode === 'week') {
        // Group by ISO week
        const weekMap = new Map<string, TicketEntry[]>();
        allTickets.forEach(ticket => {
          if (!weekMap.has(ticket.week)) {
            weekMap.set(ticket.week, []);
          }
          weekMap.get(ticket.week)!.push(ticket);
        });
        
        processedData = Array.from(weekMap.entries())
          .map(([week, weekTickets]) => {
            const machine76 = weekTickets
              .filter(t => t.machineId === '76')
              .reduce((sum, t) => sum + t.ticketsDay, 0);
            const machine79 = weekTickets
              .filter(t => t.machineId === '79')
              .reduce((sum, t) => sum + t.ticketsDay, 0);
            
            // Get first date in this week for sorting
            const firstDate = weekTickets.sort((a, b) => a.date.localeCompare(b.date))[0].date;
            
            return {
              date: firstDate,
              displayName: `Semana ${week}`,
              totalTickets: machine76 + machine79,
              machine76,
              machine79,
              entries: weekTickets,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      } else if (mode === 'month') {
        // Group by year-month
        const monthMap = new Map<string, TicketEntry[]>();
        allTickets.forEach(ticket => {
          const yearMonth = ticket.date.substring(0, 7); // YYYY-MM
          if (!monthMap.has(yearMonth)) {
            monthMap.set(yearMonth, []);
          }
          monthMap.get(yearMonth)!.push(ticket);
        });
        
        processedData = Array.from(monthMap.entries())
          .map(([yearMonth, monthTickets]) => {
            const machine76 = monthTickets
              .filter(t => t.machineId === '76')
              .reduce((sum, t) => sum + t.ticketsDay, 0);
            const machine79 = monthTickets
              .filter(t => t.machineId === '79')
              .reduce((sum, t) => sum + t.ticketsDay, 0);
            
            const [year, month] = yearMonth.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            
            return {
              date: yearMonth + '-01',
              displayName: date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long' 
              }),
              totalTickets: machine76 + machine79,
              machine76,
              machine79,
              entries: monthTickets,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      } else if (mode === 'weekday') {
        // Filter tickets by selected weekday only
        const weekdayTickets = allTickets.filter(ticket => {
          const date = new Date(ticket.date);
          return date.getDay() === selectedWeekday;
        });
        
        // Group by date (each occurrence of the weekday)
        const dateMap = new Map<string, TicketEntry[]>();
        weekdayTickets.forEach(ticket => {
          if (!dateMap.has(ticket.date)) {
            dateMap.set(ticket.date, []);
          }
          dateMap.get(ticket.date)!.push(ticket);
        });
        
        processedData = Array.from(dateMap.entries())
          .map(([date, dateTickets]) => {
            const machine76 = dateTickets
              .filter(t => t.machineId === '76')
              .reduce((sum, t) => sum + t.ticketsDay, 0);
            const machine79 = dateTickets
              .filter(t => t.machineId === '79')
              .reduce((sum, t) => sum + t.ticketsDay, 0);
            
            const dateObj = new Date(date);
            const weekdayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
            
            return {
              date,
              displayName: `${weekdayName} ${dateObj.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short' 
              })}`,
              totalTickets: machine76 + machine79,
              machine76,
              machine79,
              entries: dateTickets,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      }
      
      setComparisonData(processedData);
    } catch (err) {
      console.error('Error comparing tickets:', err);
      setError('Error al cargar los datos de comparación');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelection = (type: string) => {
    const today = new Date();
    let start: Date, end: Date;
    
    switch (type) {
      case 'last7Days':
        end = today;
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;
      case 'last30Days':
        end = today;
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last3Months':
        start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last6Months':
        start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last8Weeks':
        // For weekday mode - get last 8 weeks (56 days)
        end = today;
        start = new Date(today);
        start.setDate(start.getDate() - 55);
        break;
      case 'last12Weeks':
        // For weekday mode - get last 12 weeks (84 days)
        end = today;
        start = new Date(today);
        start.setDate(start.getDate() - 83);
        break;
      default:
        return;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const toggleMachine = (machine: string) => {
    if (selectedMachines.includes(machine)) {
      setSelectedMachines(selectedMachines.filter(m => m !== machine));
    } else {
      setSelectedMachines([...selectedMachines, machine]);
    }
  };

  const exportCSV = () => {
    if (!comparisonData.length) return;
    
    const headers = ['Período', 'Fecha', 'Total Boletos', 'Máquina 76', 'Máquina 79'];
    const rows = comparisonData.map(d => [
      d.displayName,
      d.date,
      d.totalTickets,
      d.machine76,
      d.machine79,
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `comparacion_boletos_${mode}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link 
          to="/finances/tickets" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-3"
        >
          ← Volver a Boletos Vendidos
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Comparación de Boletos Vendidos</h2>
        <p className="text-sm text-gray-600 mt-1">
          Compara el rendimiento de boletos vendidos por día, semana, mes o por día de la semana
        </p>
      </div>

      {/* Controls */}
      <Card>
        <div className="p-4 space-y-4">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modo de Comparación
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMode('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Por Día
              </button>
              <button
                onClick={() => setMode('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Por Semana
              </button>
              <button
                onClick={() => setMode('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Por Mes
              </button>
              <button
                onClick={() => setMode('weekday')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'weekday'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Por Día de la Semana
              </button>
            </div>
          </div>

          {/* Weekday Selector - Only shown in weekday mode */}
          {mode === 'weekday' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Día de la Semana a Comparar
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 1, label: 'Lunes' },
                  { value: 2, label: 'Martes' },
                  { value: 3, label: 'Miércoles' },
                  { value: 4, label: 'Jueves' },
                  { value: 5, label: 'Viernes' },
                  { value: 6, label: 'Sábado' },
                  { value: 0, label: 'Domingo' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedWeekday(value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedWeekday === value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Se mostrarán todos los {['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'][selectedWeekday]} en el rango de fechas seleccionado
              </p>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selección Rápida
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickSelection('last7Days')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Últimos 7 días
              </button>
              <button
                onClick={() => handleQuickSelection('last30Days')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Últimos 30 días
              </button>
              <button
                onClick={() => handleQuickSelection('thisMonth')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Este mes
              </button>
              <button
                onClick={() => handleQuickSelection('lastMonth')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Mes anterior
              </button>
              {mode === 'weekday' && (
                <>
                  <button
                    onClick={() => handleQuickSelection('last8Weeks')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Últimas 8 semanas
                  </button>
                  <button
                    onClick={() => handleQuickSelection('last12Weeks')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Últimas 12 semanas
                  </button>
                </>
              )}
              {mode !== 'day' && mode !== 'weekday' && (
                <>
                  <button
                    onClick={() => handleQuickSelection('last3Months')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Últimos 3 meses
                  </button>
                  <button
                    onClick={() => handleQuickSelection('last6Months')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Últimos 6 meses
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Machine Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Máquina
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => toggleMachine('76')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedMachines.includes('76')
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Máquina 76
              </button>
              <button
                onClick={() => toggleMachine('79')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedMachines.includes('79')
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Máquina 79
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCompare}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Cargando...' : 'Comparar'}
            </button>
            
            {comparisonData.length > 0 && (
              <>
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  Exportar CSV
                </button>
                
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setShowChart(!showChart)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showChart
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showChart ? 'Ocultar' : 'Mostrar'} Gráfica
                  </button>
                  <button
                    onClick={() => setShowTable(!showTable)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showTable
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showTable ? 'Ocultar' : 'Mostrar'} Tabla
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <div className="p-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </Card>
      )}

      {/* Chart */}
      {!loading && comparisonData.length > 0 && showChart && (
        <Card>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Gráfica de Comparación</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartMode('line')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    chartMode === 'line'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Líneas
                </button>
                <button
                  onClick={() => setChartMode('bar')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    chartMode === 'bar'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Barras
                </button>
              </div>
            </div>
            <TicketsComparisonChart
              data={comparisonData}
              selectedMachines={selectedMachines}
              mode={chartMode}
            />
          </div>
        </Card>
      )}

      {/* Table */}
      {!loading && comparisonData.length > 0 && showTable && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Tabla de Comparación ({comparisonData.length} {
                mode === 'day' ? 'días' : 
                mode === 'week' ? 'semanas' : 
                mode === 'month' ? 'meses' :
                'ocurrencias'
              })
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Boletos
                    </th>
                    {selectedMachines.includes('76') && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Máquina 76
                      </th>
                    )}
                    {selectedMachines.includes('79') && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Máquina 79
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {comparisonData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.displayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-purple-600">
                        {item.totalTickets.toLocaleString('es-MX')}
                      </td>
                      {selectedMachines.includes('76') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                          {item.machine76.toLocaleString('es-MX')}
                        </td>
                      )}
                      {selectedMachines.includes('79') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                          {item.machine79.toLocaleString('es-MX')}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900" colSpan={2}>
                      Total General
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-purple-700">
                      {comparisonData.reduce((sum, d) => sum + d.totalTickets, 0).toLocaleString('es-MX')}
                    </td>
                    {selectedMachines.includes('76') && (
                      <td className="px-6 py-4 text-sm text-right text-blue-700">
                        {comparisonData.reduce((sum, d) => sum + d.machine76, 0).toLocaleString('es-MX')}
                      </td>
                    )}
                    {selectedMachines.includes('79') && (
                      <td className="px-6 py-4 text-sm text-right text-green-700">
                        {comparisonData.reduce((sum, d) => sum + d.machine79, 0).toLocaleString('es-MX')}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* No Data */}
      {!loading && !error && comparisonData.length === 0 && startDate && endDate && (
        <Card>
          <div className="p-8 text-center text-gray-500">
            No hay datos para mostrar en el rango seleccionado
          </div>
        </Card>
      )}
    </div>
  );
};

export default TicketsComparison;
