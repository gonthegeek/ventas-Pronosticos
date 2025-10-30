import React, { useState, useEffect } from 'react';
import { SalesService } from '../../services/SalesService';
import { HourlySalesData } from '../../state/slices/salesSlice';
import { formatCurrency } from '../../utils/timezone';
import LoadingSpinner from '../ui/LoadingSpinner';
import SalesComparisonChart from './SalesComparisonChart';

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

type ComparisonMode = 'custom' | 'weekly' | 'monthly' | 'weekdayHour';

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
  
  // Weekday-Hour comparison mode
  const [weekdayHourDay, setWeekdayHourDay] = useState<number>(3); // Wednesday
  const [weekdayHourHour, setWeekdayHourHour] = useState<number>(21); // 21:00
  const [weekdayHourCount, setWeekdayHourCount] = useState<number>(8); // Last 8 weeks
  
  // Chart mode for weekday-hour visualization
  const [chartMode, setChartMode] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    // Clear data when switching modes
    setComparisonData([]);
    setError(null);
    
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
      // Use local date formatting to avoid timezone conversion issues
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
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
    if (mode === 'weekdayHour') {
      // Use dedicated weekday-hour comparison logic
      await loadWeekdayHourComparison();
      return;
    }

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
      setError('Error al cargar los datos de comparación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const loadWeekdayHourComparison = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get weekday hour comparison data from cached service
      const dates: string[] = [];
      const today = new Date();
      let currentDate = new Date(today);
      
      // Find the most recent occurrence of the specified day
      while (currentDate.getDay() !== weekdayHourDay) {
        currentDate.setDate(currentDate.getDate() - 1);
      }
      
      // Collect the last N occurrences
      for (let i = 0; i < weekdayHourCount; i++) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() - 7);
      }
      
      dates.reverse();

      const comparisons: ComparisonData[] = [];

      for (const date of dates) {
        const hourlySales = await SalesService.getHourlySalesForDate(date);
        const hourData = hourlySales.find(h => h.hour === weekdayHourHour) || {
          hour: weekdayHourHour,
          machine76: 0,
          machine79: 0,
          total: 0,
          lastUpdated: new Date().toISOString(),
        };
        
        // Calculate totals for selected hour based on selected machines
        let totalSales = 0;
        let machine76Total = hourData.machine76;
        let machine79Total = hourData.machine79;

        if (selectedMachines.includes('76')) {
          totalSales += hourData.machine76;
        }
        
        if (selectedMachines.includes('79')) {
          totalSales += hourData.machine79;
        }

        const dateObj = new Date(date + 'T12:00:00');
        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
        const displayName = `${dayName} ${date} - ${weekdayHourHour.toString().padStart(2, '0')}:00`;

        comparisons.push({
          date,
          displayName,
          totalSales,
          machine76: machine76Total,
          machine79: machine79Total,
          peakHour: weekdayHourHour,
          peakAmount: totalSales,
          hourlyData: [hourData]
        });
      }

      setComparisonData(comparisons);
    } catch (error) {
      setError('Error al cargar los datos de comparación por día y hora. Por favor intenta de nuevo.');
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
        <div className="flex flex-wrap gap-3 mb-4">
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
          <button
            onClick={() => setMode('weekdayHour')}
            className={`px-4 py-2 rounded-md font-medium ${
              mode === 'weekdayHour'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Mismo Día y Hora
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
                    <option value={2}>Últimos 2</option>
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

        {mode === 'weekdayHour' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                📊 Análisis de Mismo Día y Hora
              </h4>
              <p className="text-sm text-blue-700">
                Compara las ventas del mismo día de la semana a la misma hora a lo largo de varias semanas.
                Ideal para identificar patrones y tendencias específicas.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Día de la Semana:
                </label>
                <select
                  value={weekdayHourDay}
                  onChange={(e) => setWeekdayHourDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora:
                </label>
                <select
                  value={weekdayHourHour}
                  onChange={(e) => setWeekdayHourHour(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Semanas:
                </label>
                <select
                  value={weekdayHourCount}
                  onChange={(e) => setWeekdayHourCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={4}>Últimas 4 semanas</option>
                  <option value={8}>Últimas 8 semanas</option>
                  <option value={12}>Últimas 12 semanas</option>
                  <option value={16}>Últimas 16 semanas</option>
                  <option value={20}>Últimas 20 semanas</option>
                  <option value={26}>Últimas 26 semanas (6 meses)</option>
                  <option value={52}>Últimas 52 semanas (1 año)</option>
                </select>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                💡 <strong>Ejemplo:</strong> Selecciona "Miércoles" a las "21:00" con "8 semanas" para comparar
                las ventas de todos los miércoles a las 21:00 durante los últimos 2 meses.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Dates Display */}
      {mode !== 'weekdayHour' && selectedDates.length > 0 && (
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
          disabled={
            (mode !== 'weekdayHour' && selectedDates.length === 0) || 
            selectedMachines.length === 0 || 
            loading
          }
          className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Cargando...' : mode === 'weekdayHour' ? 'Analizar Patrón de Día y Hora' : 'Comparar Datos de Ventas'}
        </button>
        {mode === 'weekdayHour' && (
          <p className="text-sm text-gray-600 mt-2">
            ✨ Analizando: Todos los <strong>{getWeekdayName(weekdayHourDay)}s</strong> a las <strong>{weekdayHourHour.toString().padStart(2, '0')}:00</strong> de las últimas <strong>{weekdayHourCount}</strong> semanas
          </p>
        )}
        {mode !== 'weekdayHour' && selectedDates.length > 50 && (
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
            <div className="mb-6">
              {mode === 'weekdayHour' && (
                <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    📈 Análisis: {getWeekdayName(weekdayHourDay)}s a las {weekdayHourHour.toString().padStart(2, '0')}:00
                  </h3>
                  <p className="text-sm text-purple-700">
                    Comparando <strong>{comparisonData.length}</strong> ocurrencias del mismo día y hora
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800">
                    {mode === 'weekdayHour' ? 'Mejor Semana' : 'Mejor Día'}
                  </h3>
                  <p className="text-green-600">{stats.bestDay?.displayName}</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(stats.best)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800">Promedio</h3>
                  <p className="text-2xl font-bold text-blue-800">{formatCurrency(stats.average)}</p>
                  {mode === 'weekdayHour' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Por {getWeekdayName(weekdayHourDay)} a las {weekdayHourHour.toString().padStart(2, '0')}:00
                    </p>
                  )}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800">
                    {mode === 'weekdayHour' ? 'Peor Semana' : 'Peor Día'}
                  </h3>
                  <p className="text-red-600">{stats.worstDay?.displayName}</p>
                  <p className="text-2xl font-bold text-red-800">{formatCurrency(stats.worst)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Visualization for All Modes */}
          {comparisonData.length > 0 && comparisonData.length <= 100 && (
            <div className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {mode === 'weekdayHour' 
                      ? 'Tendencia de Ventas por Semana'
                      : 'Comparación Visual de Ventas'
                    }
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartMode('line')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        chartMode === 'line'
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      Línea
                    </button>
                    <button
                      onClick={() => setChartMode('bar')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        chartMode === 'bar'
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      Barras
                    </button>
                  </div>
                </div>
                <SalesComparisonChart
                  data={comparisonData}
                  selectedMachines={selectedMachines}
                  mode={chartMode}
                />
              </div>
            </div>
          )}
          {comparisonData.length > 100 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                📊 El gráfico está oculto debido al gran número de datos ({comparisonData.length} fechas). 
                Para visualización gráfica, selecciona un rango menor (máximo 100 fechas).
              </p>
            </div>
          )}

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {mode === 'weekdayHour' ? 'Fecha y Hora' : 'Fecha'}
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
                  {mode !== 'weekdayHour' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hora Pico
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto Pico
                      </th>
                    </>
                  )}
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
                    {mode !== 'weekdayHour' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.peakAmount > 0 ? formatHour(data.peakHour) : 'Sin ventas'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(data.peakAmount)}
                        </td>
                      </>
                    )}
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
