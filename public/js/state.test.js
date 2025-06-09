import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mockea los módulos de los que `state.js` depende.
vi.mock('./ui.js', () => ({
  updateTable: vi.fn(),
  updateChart: vi.fn(),
  renderComparisonPills: vi.fn(),
  updateActiveButton: vi.fn(),
}));
vi.mock('./auth.js', () => ({
  auth: { currentUser: { uid: 'test-user-id' } }
}));

// Importa el módulo a probar DESPUÉS de los mocks.
import * as state from './state.js';
import * as ui from './ui.js';

describe('State Management', () => {

  // Antes de cada prueba, reinicia el estado y los mocks.
  beforeEach(() => {
    state.initializeState();
    vi.clearAllMocks();
  });

  describe('setFilter', () => {
    it('debería actualizar el tipo de filtro y reiniciar la fecha para filtros predefinidos', () => {
      state.setFilter({ type: 'week' });
      const currentState = state.getState().currentFilter;
      expect(currentState.type).toBe('week');
      expect(currentState.date.toDateString()).toBe(new Date().toDateString());
    });

    it('debería actualizar la máquina sin cambiar otros filtros', () => {
      state.setFilter({ type: 'month' });
      state.setFilter({ machine: '79' });
      const currentState = state.getState().currentFilter;
      expect(currentState.type).toBe('month');
      expect(currentState.machine).toBe('79');
    });
  });

  describe('applyFiltersAndUpdateUI', () => {
    const mockSales = [
        { machineId: '76', value: 10 },
        { machineId: '79', value: 20 },
        { machineId: '76', value: 30 },
    ];

    it('debería filtrar las ventas por una máquina específica', () => {
      state.setFilter({ machine: '76' });
      state.applyFiltersAndUpdateUI(mockSales);
      expect(ui.updateTable).toHaveBeenCalledWith([
        { machineId: '76', value: 10 },
        { machineId: '76', value: 30 },
      ]);
    });

    it('no debería filtrar cuando la máquina es "all"', () => {
      state.setFilter({ machine: 'all' });
      state.applyFiltersAndUpdateUI(mockSales);
      expect(ui.updateTable).toHaveBeenCalledWith(mockSales);
    });
  });
});
