import { describe, it, expect, vi } from 'vitest';

// Simula (hace un "mock") del módulo de Firebase antes de que cualquier otro código lo importe.
// Esto evita que Vitest intente descargar el archivo desde una URL https://.
vi.mock('firebase/firestore', () => {
  // Creamos una clase falsa 'Timestamp' que imita a la real de Firebase
  class MockTimestamp {
    constructor(date) {
      this.date = date;
    }
    static fromDate(date) {
      return new MockTimestamp(date);
    }
    toDate() {
      return this.date;
    }
    toMillis() {
        return this.date.getTime();
    }
  }
  return { Timestamp: MockTimestamp };
});

// Ahora que el mock está configurado, importamos nuestra función a probar.
import { parseCSVAndCalculateSales } from './utils.js';

// Agrupa todas las pruebas para la función parseCSVAndCalculateSales
describe('parseCSVAndCalculateSales', () => {

  // Prueba 1: El "caso feliz" con datos correctos y consistentes.
  it('debería procesar correctamente un CSV válido y calcular las ventas del período', () => {
    const csvContent = `
      2025-06-05,14:00,76,100
      2025-06-05,15:00,76,150
      2025-06-05,14:00,79,50
    `;
    const result = parseCSVAndCalculateSales(csvContent);

    // Se esperan 3 registros procesados
    expect(result.length).toBe(3);

    // Verifica el cálculo para la máquina 76
    const sale1_76 = result.find(r => r.accumulatedTotal === 100);
    const sale2_76 = result.find(r => r.accumulatedTotal === 150);
    expect(sale1_76.saleAmount).toBe(100); // Primera venta del día
    expect(sale2_76.saleAmount).toBe(50);  // 150 - 100

    // Verifica el cálculo para la máquina 79
    const sale1_79 = result.find(r => r.machineId === '79');
    expect(sale1_79.saleAmount).toBe(50); // Primera venta del día
  });

  // Prueba 2: Reinicio de acumulado en un nuevo día.
  it('debería reiniciar el cálculo del acumulado para un nuevo día', () => {
    const csvContent = `
      2025-06-05,21:00,76,500
      2025-06-06,09:00,76,80
    `;
    const result = parseCSVAndCalculateSales(csvContent);

    const sale_day1 = result.find(r => r.accumulatedTotal === 500);
    const sale_day2 = result.find(r => r.accumulatedTotal === 80);

    expect(sale_day1.saleAmount).toBe(500);
    expect(sale_day2.saleAmount).toBe(80); // Debe ser 80, no (80 - 500)
  });

  // Prueba 3: Manejo de errores por formato incorrecto.
  it('debería lanzar un error si una línea del CSV tiene un formato incorrecto', () => {
    const csvContent = `
      2025-06-05,14:00,76,100
      esto-es-una-linea-mala
    `;
    // Esperamos que la función falle y lanzamos una excepción (error)
    expect(() => parseCSVAndCalculateSales(csvContent)).toThrowError('Línea 2: formato incorrecto.');
  });

  // Prueba 4: Manejo de errores por datos inconsistentes (total acumulado decreciente).
  it('debería lanzar un error si el total acumulado decrece en el mismo día', () => {
    const csvContent = `
      2025-06-05,14:00,76,100
      2025-06-05,15:00,76,90
    `;
    expect(() => parseCSVAndCalculateSales(csvContent)).toThrowError(/Inconsistencia en Máquina 76/);
  });

   // Prueba 5: Manejo de líneas vacías.
  it('debería ignorar líneas vacías en el archivo', () => {
    const csvContent = `
      2025-06-05,14:00,76,100

      2025-06-05,15:00,76,150
    `;
    const result = parseCSVAndCalculateSales(csvContent);
    expect(result.length).toBe(2);
  });

});
