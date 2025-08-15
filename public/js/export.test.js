import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    constructor(date) { this.date = date; }
    static fromDate(d) { return new MockTimestamp(d); }
    toDate() { return this.date; }
    toMillis() { return this.date.getTime(); }
  }
  return { Timestamp: MockTimestamp };
});

import { normalizeSalesForExport, buildImportCompatibleCSV } from './utils.js';

describe('Export / Backup helpers', () => {
  it('normalizeSalesForExport converts Firestore docs to plain objects', () => {
    const now = new Date('2025-08-15T10:30:00Z');
    const sales = [
      { id: 'a1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, timestamp: { toDate: () => now } }
    ];
    const normalized = normalizeSalesForExport(sales);
    const expectedTime = now.toTimeString().slice(0,5);
    expect(normalized[0]).toMatchObject({ id: 'a1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, date: '2025-08-15', time: expectedTime });
    expect(normalized[0].timestamp).toContain('2025-08-15T10:30:00');
  });

  it('buildImportCompatibleCSV produces lines without header and only 4 columns', () => {
    const data = [{ id: 'a1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, date: '2025-08-15', time: '10:30' }];
    const csv = buildImportCompatibleCSV(data);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('2025-08-15,10:30,76,150');
  });
});
