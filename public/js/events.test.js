import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// --- Mocks de Módulos ---
vi.mock('./api.js', () => ({
  addSale: vi.fn(),
  updateSaleBatch: vi.fn(),
  deleteSaleAndUpdate: vi.fn(),
}));

vi.mock('./state.js', () => ({
  getAllSales: vi.fn(),
  triggerRefetch: vi.fn(),
}));

vi.mock('./ui.js', () => ({
  showToast: vi.fn(),
  toggleButtonSpinner: vi.fn(),
  closeEditModal: vi.fn(),
}));

// Mock corregido para incluir toMillis()
vi.mock('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js', () => {
    class MockTimestamp {
        constructor(date) { this.date = date; }
        static fromDate(date) { return new MockTimestamp(date); }
        toDate() { return this.date; }
        toMillis() { return this.date.getTime(); }
    }
    return { Timestamp: MockTimestamp };
});

// Importamos las funciones y mocks a probar DESPUÉS de la configuración
import { handleAddSale, handleDeleteSale } from './events.js';
import * as api from './api.js';
import * as state from './state.js';
import * as ui from './ui.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// --- Configuración del DOM simulado ---
const dom = new JSDOM(`
  <!DOCTYPE html>
  <body>
    <form id="sale-form">
      <select id="machine-id"><option value="76">76</option></select>
      <input id="sale-amount" type="number" />
      <button id="add-sale-btn"><span class="btn-text"></span></button>
    </form>
  </body>
`);
global.document = dom.window.document;

describe('Event Handlers (CRUD Logic)', () => {

  beforeEach(() => {
    // Reseteamos los mocks y el estado del DOM antes de cada prueba
    vi.clearAllMocks();
    document.getElementById('machine-id').value = '76';
    document.getElementById('sale-amount').value = '100';
    vi.useFakeTimers();
  });

  afterEach(() => {
      vi.useRealTimers();
  });

  describe('handleAddSale', () => {
    it('debería añadir una nueva venta si los datos son válidos', async () => {
      const mockEvent = { preventDefault: vi.fn(), target: { reset: vi.fn() } };
      state.getAllSales.mockReturnValue([]); // No hay ventas previas
      
      await handleAddSale(mockEvent);

      expect(api.addSale).toHaveBeenCalledOnce();
      expect(api.addSale).toHaveBeenCalledWith({
          machineId: '76',
          saleAmount: 100,
          accumulatedTotal: 100
      });
      expect(ui.showToast).toHaveBeenCalledWith("Venta registrada con éxito.", "success");
      expect(mockEvent.target.reset).toHaveBeenCalledOnce();
    });

    it('debería mostrar un error si el total es menor que el previo en el mismo día', async () => {
        const testDate = new Date();
        vi.setSystemTime(testDate);
        const mockEvent = { preventDefault: vi.fn(), target: { reset: vi.fn() } };
        // Usamos nuestro MockTimestamp para crear datos de prueba consistentes
        const previousSales = [{
            machineId: '76',
            accumulatedTotal: 150,
            timestamp: Timestamp.fromDate(testDate)
        }];
        state.getAllSales.mockReturnValue(previousSales);
        document.getElementById('sale-amount').value = '120';

        await handleAddSale(mockEvent);

        expect(api.addSale).not.toHaveBeenCalled();
        expect(ui.showToast).toHaveBeenCalledWith("El nuevo total no puede ser menor que el último registrado para hoy.", "error");
    });
  });

  describe('handleDeleteSale', () => {
    it('debería eliminar un registro y recalcular la venta siguiente', async () => {
        const testDate = new Date();
        // Usamos nuestro MockTimestamp para crear datos de prueba consistentes
        const sales = [
            { id: '3', machineId: '76', accumulatedTotal: 300, saleAmount: 100, timestamp: Timestamp.fromDate(new Date(testDate.getTime() + 2000)) },
            { id: '2', machineId: '76', accumulatedTotal: 200, saleAmount: 100, timestamp: Timestamp.fromDate(new Date(testDate.getTime() + 1000)) },
            { id: '1', machineId: '76', accumulatedTotal: 100, saleAmount: 100, timestamp: Timestamp.fromDate(testDate) }
        ];
        // Simulamos que los datos vienen ordenados descendente, como lo hace onSnapshot
        const descendingSales = [...sales].sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        state.getAllSales.mockReturnValue(descendingSales);
        
        await handleDeleteSale('2'); // Borramos el registro del medio

        expect(api.deleteSaleAndUpdate).toHaveBeenCalledOnce();
        
        // Verifica que se llame a la API con el ID a borrar y el objeto de actualización para el siguiente registro
        expect(api.deleteSaleAndUpdate).toHaveBeenCalledWith('2', {
            id: '3',
            saleAmount: 200 // 300 (total de la venta 3) - 100 (total de la venta 1)
        });
        expect(ui.showToast).toHaveBeenCalledWith("Registro eliminado con éxito.", "success");
        expect(state.triggerRefetch).toHaveBeenCalledOnce();
    });
  });
});
