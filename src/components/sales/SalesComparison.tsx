import React, { useState, useEffect } from 'react';
import { SalesService } from '../../services/SalesService';
import { HourlySalesData } from '../../state/slices/salesSlice';
import { formatCurrency } from '../../utils/timezone';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ComparisonData {
  date: string;
  displayName: string;
  totalSales: number;
  machine76: number;
  machine79: number;
  peakHour: number;
  peakAmount: number;
  hourlyData: HourlySalesData[];
}

interface SalesComparisonProps {
  className?: string;
}

type ComparisonMode = 'custom' | 'weekly' | 'monthly';

const SalesComparison: React.FC<SalesComparisonProps> = ({ className = '' }) => {
  const [mode, setMode] = useState<ComparisonMode>('custom');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom date inputs
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Quick selections
  const [selectedMachines, setSelectedMachines] = useState<string[]>(['76', '79']);
  
  // Custom weekday selector
  const [customWeekday, setCustomWeekday] = useState<number>(3); // Default to Wednesday
  const [customWeekdayCount, setCustomWeekdayCount] = useState<number>(4);

  useEffect(() => {
    // Set default dates to last 7 days for weekly mode
    if (mode === 'weekly') {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 6);
      
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(lastWeek);
        date.setDate(lastWeek.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      setSelectedDates(dates);
    }
  }, [mode]);

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

  const handleCustomDateRange = () => {
    if (!startDate || !endDate) {
      setError('Por favor selecciona ambas fechas de inicio y fin');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    
    const dates = generateDateRange(startDate, endDate);
    if (dates.length > 365) {
      setError('Por favor selecciona un rango de 365 días o menos (máximo 1 año)');
      return;
    }
    
    setSelectedDates(dates);
    setError(null);
  };

  const getLastNWeekdays = (dayOfWeek: number, count: number): string[] => {
    const dates: string[] = [];
    const today = new Date();
    let currentDate = new Date(today);
    
    // Find the most recent occurrence of the specified day
    while (currentDate.getDay() !== dayOfWeek) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Collect the last N occurrences
    for (let i = 0; i < count; i++) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() - 7);
    }
    
    return dates.reverse();
  };

  const handleQuickSelection = (type: string) => {
    switch (type) {
      case 'last7Days':
        const last7 = generateDateRange(
          new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );
        setSelectedDates(last7);
        break;
      case 'last14Days':
        const last14 = generateDateRange(
          new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );
        setSelectedDates(last14);
        break;
      case 'thisMonth':
        const todayThisMonth = new Date();
        const firstDay = new Date(todayThisMonth.getFullYear(), todayThisMonth.getMonth(), 1);
        const thisMonth = generateDateRange(
          firstDay.toISOString().split('T')[0],
          todayThisMonth.toISOString().split('T')[0]
        );
        setSelectedDates(thisMonth);
        break;
      case 'lastMonth':
        const nowLastMonth = new Date();
        const lastMonth = new Date(nowLastMonth.getFullYear(), nowLastMonth.getMonth() - 1, 1);
        const lastMonthEnd = new Date(nowLastMonth.getFullYear(), nowLastMonth.getMonth(), 0);
        const lastMonthDates = generateDateRange(
          lastMonth.toISOString().split('T')[0],
          lastMonthEnd.toISOString().split('T')[0]
        );
        setSelectedDates(lastMonthDates);
        break;
      case 'last12Months':
        const last12MonthsDates = [];
        const currentDate = new Date();
        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          // Take first day of each month for comparison
          last12MonthsDates.push(monthDate.toISOString().split('T')[0]);
        }
        setSelectedDates(last12MonthsDates);
        break;
      case 'yearToDate':
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const yearToDateRange = generateDateRange(
          yearStart.toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );
        setSelectedDates(yearToDateRange);
        break;
      case 'customWeekday':
        setSelectedDates(getLastNWeekdays(customWeekday, customWeekdayCount));
        break;
    }
    setError(null);
  };

  const getWeekdayName = (dayNum: number): string => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayNum];
  };

  const loadComparisonData = async () => {
    if (selectedDates.length === 0) {
      setError('Por favor selecciona fechas para comparar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const comparisons: ComparisonData[] = [];

      for (const date of selectedDates) {
        const hourlySales = await SalesService.getHourlySalesForDate(date);
        
        // Calculate totals based on selected machines
        let totalSales = 0;
        let machine76Total = 0;
        let machine79Total = 0;
        let peakHour = 0;
        let peakAmount = 0;

        hourlySales.forEach(hourData => {
          let hourTotal = 0;
          
          if (selectedMachines.includes('76')) {
            hourTotal += hourData.machine76;
            machine76Total += hourData.machine76;
          }
          
          if (selectedMachines.includes('79')) {
            hourTotal += hourData.machine79;
            machine79Total += hourData.machine79;
          }
          
          totalSales += hourTotal;
          
          if (hourTotal > peakAmount) {
            peakAmount = hourTotal;
            peakHour = hourData.hour;
          }
        });

        // Create display name
        const dateObj = new Date(date + 'T12:00:00');
        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
        const displayName = `${dayName} ${date}`;

        comparisons.push({
          date,
          displayName,
          totalSales,
          machine76: machine76Total,
          machine79: machine79Total,
          peakHour,
          peakAmount,
          hourlyData: hourlySales
        });
      }

      setComparisonData(comparisons);
    } catch (error) {
      console.error('Error loading comparison data:', error);
      setError('Error al cargar los datos de comparación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getComparisonStats = () => {
    if (comparisonData.length === 0) return null;

    const totals = comparisonData.map(d => d.totalSales);
    const best = Math.max(...totals);
    const worst = Math.min(...totals);
    const average = totals.reduce((a, b) => a + b, 0) / totals.length;
    
    const bestDay = comparisonData.find(d => d.totalSales === best);
    const worstDay = comparisonData.find(d => d.totalSales === worst);

    return { best, worst, average, bestDay, worstDay };
  };

  const stats = getComparisonStats();

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Comparación de Ventas</h2>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setMode('custom')}
            className={`px-4 py-2 rounded-md font-medium ${
              mode === 'custom'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Rango Personalizado
          </button>
          <button
            onClick={() => setMode('weekly')}
            className={`px-4 py-2 rounded-md font-medium ${
              mode === 'weekly'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Selecciones Rápidas
          </button>
        </div>

        {/* Machine Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Máquinas a Incluir:
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMachines.includes('76')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMachines([...selectedMachines, '76']);
                  } else {
                    setSelectedMachines(selectedMachines.filter(m => m !== '76'));
                  }
                }}
                className="mr-2"
              />
              Máquina 76
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMachines.includes('79')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMachines([...selectedMachines, '79']);
                  } else {
                    setSelectedMachines(selectedMachines.filter(m => m !== '79'));
                  }
                }}
                className="mr-2"
              />
              Máquina 79
            </label>
          </div>
        </div>

        {/* Date Selection */}
        {mode === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Fin:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCustomDateRange}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Establecer Rango
              </button>
            </div>
          </div>
        )}

        {mode === 'weekly' && (
          <div className="space-y-4">
            {/* Quick Selection Options */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Selección Rápida</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => handleQuickSelection('last7Days')}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Últimos 7 días
                </button>
                <button
                  onClick={() => handleQuickSelection('last14Days')}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Últimas 2 semanas
                </button>
                <button
                  onClick={() => handleQuickSelection('thisMonth')}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  Este mes
                </button>
                <button
                  onClick={() => handleQuickSelection('lastMonth')}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  Mes pasado
                </button>
                <button
                  onClick={() => handleQuickSelection('last12Months')}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  Últimos 12 meses
                </button>
                <button
                  onClick={() => handleQuickSelection('yearToDate')}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  Año hasta hoy
                </button>
              </div>
            </div>

            {/* Custom Weekday Selector */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Comparación Personalizada por Día</h4>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Día de la Semana:</label>
                  <select
                    value={customWeekday}
                    onChange={(e) => setCustomWeekday(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={0}>Domingo</option>
                    <option value={1}>Lunes</option>
                    <option value={2}>Martes</option>
                    <option value={3}>Miércoles</option>
                    <option value={4}>Jueves</option>
                    <option value={5}>Viernes</option>
                    <option value={6}>Sábado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Cantidad:</label>
                  <select
                    value={customWeekdayCount}
                    onChange={(e) => setCustomWeekdayCount(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={3}>Últimos 3</option>
                    <option value={4}>Últimos 4</option>
                    <option value={5}>Últimos 5</option>
                    <option value={6}>Últimos 6</option>
                    <option value={8}>Últimos 8</option>
                    <option value={10}>Últimos 10</option>
                    <option value={12}>Últimos 12</option>
                    <option value={16}>Últimos 16</option>
                    <option value={20}>Últimos 20</option>
                    <option value={26}>Últimos 26</option>
                    <option value={52}>Últimos 52</option>
                  </select>
                </div>
                <button
                  onClick={() => handleQuickSelection('customWeekday')}
                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-md text-sm font-medium"
                >
                  Comparar {customWeekdayCount} {getWeekdayName(customWeekday)}s
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Dates Display */}
      {selectedDates.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Fechas seleccionadas ({selectedDates.length}):
            {selectedDates.length > 100 && (
              <span className="ml-2 text-orange-600 font-medium">
                ⚠️ Dataset grande - la carga puede tomar varios segundos
              </span>
            )}
          </p>
          <div className="text-sm text-blue-600">
            {selectedDates.length <= 10 
              ? selectedDates.join(', ')
              : selectedDates.length <= 50
              ? `${selectedDates.slice(0, 5).join(', ')} ... ${selectedDates.slice(-5).join(', ')}`
              : `${selectedDates[0]} hasta ${selectedDates[selectedDates.length - 1]} (${selectedDates.length} fechas)`
            }
          </div>
        </div>
      )}

      {/* Load Data Button */}
      <div className="mb-6">
        <button
          onClick={loadComparisonData}
          disabled={selectedDates.length === 0 || selectedMachines.length === 0 || loading}
          className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Cargando...' : 'Comparar Datos de Ventas'}
        </button>
        {selectedDates.length > 50 && (
          <p className="text-sm text-gray-500 mt-2">
            💡 Tip: Para datasets grandes (más de 50 fechas), considera usar comparaciones por días específicos de la semana para un análisis más eficiente.
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Comparison Results */}
      {!loading && comparisonData.length > 0 && (
        <div>
          {/* Summary Stats */}
          {stats && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800">Mejor Día</h3>
                <p className="text-green-600">{stats.bestDay?.displayName}</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(stats.best)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800">Promedio</h3>
                <p className="text-2xl font-bold text-blue-800">{formatCurrency(stats.average)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800">Peor Día</h3>
                <p className="text-red-600">{stats.worstDay?.displayName}</p>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(stats.worst)}</p>
              </div>
            </div>
          )}

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ventas Totales
                  </th>
                  {selectedMachines.includes('76') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Máquina 76
                    </th>
                  )}
                  {selectedMachines.includes('79') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Máquina 79
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hora Pico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Pico
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparisonData.map((data, index) => (
                  <tr key={data.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {data.displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {formatCurrency(data.totalSales)}
                    </td>
                    {selectedMachines.includes('76') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(data.machine76)}
                      </td>
                    )}
                    {selectedMachines.includes('79') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(data.machine79)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.peakAmount > 0 ? formatHour(data.peakHour) : 'Sin ventas'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(data.peakAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesComparison;
