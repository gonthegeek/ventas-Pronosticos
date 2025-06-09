import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mockea los módulos de los que `state.js` depende.
vi.mock('./ui.js', () => ({
  updateTable: vi.fn(),
  updateChart: vi.fn(),
  renderComparisonPills: vi.fn(),
  updateActiveButton: vi.fn(),
}));
vi.mock('./api.js', () => ({
  subscribeToSalesData: vi.fn(),
}));
vi.mock('./auth.js', () => ({
  auth: { currentUser: { uid: 'test-user-id' } }
}));

// Importa el módulo a probar DESPUÉS de los mocks.
import * as state from './state.js';
import * as api from './api.js';

describe('State Management & Data Fetching Logic', () => {

  // Antes de cada prueba, resetea los mocks.
  beforeEach(() => {
    // Usamos temporizadores falsos para controlar el tiempo
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  
  // Después de cada prueba, restauramos los temporizadores reales.
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setFilter', () => {
    it('debería llamar a subscribeToSalesData con el rango de fechas correcto para "today"', () => {
      // Fijamos una fecha para la prueba para que sea determinista
      const testDate = new Date(2025, 5, 8); // 8 de Junio de 2025
      vi.setSystemTime(testDate);
      
      const startDate = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      state.setFilter({ type: 'today' });
      
      expect(api.subscribeToSalesData).toHaveBeenCalledOnce();
      expect(api.subscribeToSalesData).toHaveBeenCalledWith(startDate, endDate);
    });

    it('debería llamar a subscribeToSalesData con el rango de fechas correcto para "week"', () => {
        const testDate = new Date(2025, 5, 8); // Domingo 8 de Junio de 2025
        vi.setSystemTime(testDate);
        
        // El primer día de la semana (Lunes) sería el 2 de Junio
        const startDate = new Date(2025, 5, 2); 
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);

        state.setFilter({ type: 'week' });
      
        expect(api.subscribeToSalesData).toHaveBeenCalledOnce();
        expect(api.subscribeToSalesData).toHaveBeenCalledWith(startDate, endDate);
    });

     it('debería llamar a subscribeToSalesData con el rango de fechas correcto para "month"', () => {
        const testDate = new Date(2025, 5, 8); // 8 de Junio de 2025
        vi.setSystemTime(testDate);
        
        const startDate = new Date(2025, 5, 1); // 1 de Junio
        const endDate = new Date(2025, 6, 1); // 1 de Julio

        state.setFilter({ type: 'month' });
      
        expect(api.subscribeToSalesData).toHaveBeenCalledOnce();
        expect(api.subscribeToSalesData).toHaveBeenCalledWith(startDate, endDate);
    });

  });

});