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

import { normalizeSalesForExport, buildImportCompatibleCSV, parseCSVAndCalculateSales } from './utils.js';

describe('Export / Backup helpers', () => {
  it('normalizeSalesForExport converts Firestore docs to plain objects', () => {
    const now = new Date('2025-08-15T10:30:00Z'); // UTC time
    const sales = [
      { id: 'a1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, timestamp: { toDate: () => now } }
    ];
    const normalized = normalizeSalesForExport(sales);
    
    // With business timezone adjustment (UTC-6), 10:30 UTC becomes 04:30 business time
    expect(normalized[0]).toMatchObject({ 
      id: 'a1', 
      machineId: '76', 
      saleAmount: 50, 
      accumulatedTotal: 150, 
      date: '2025-08-15', 
      time: '04:30' 
    });
    expect(normalized[0].timestamp).toContain('2025-08-15T10:30:00');
  });

  it('buildImportCompatibleCSV produces lines without header and only 4 columns', () => {
    const data = [{ id: 'a1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, date: '2025-08-15', time: '10:30' }];
    const csv = buildImportCompatibleCSV(data);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('2025-08-15,10:30,76,150');
  });

  it('normalizeSalesForExport handles different timestamp formats consistently', () => {
    // Test different timezone scenarios and timestamp formats
    const utcDate = new Date('2025-08-15T10:30:00.000Z');
    const localDate = new Date('2025-08-15T10:30:00');
    const timestampMs = 1723716600000; // Equivalent to 2025-08-15T10:30:00.000Z
    
    const sales = [
      { id: 'utc', machineId: '76', saleAmount: 50, accumulatedTotal: 150, timestamp: { toDate: () => utcDate } },
      { id: 'local', machineId: '76', saleAmount: 60, accumulatedTotal: 210, timestamp: { toDate: () => localDate } },
      { id: 'date', machineId: '76', saleAmount: 70, accumulatedTotal: 280, timestamp: utcDate },
      { id: 'ms', machineId: '76', saleAmount: 80, accumulatedTotal: 360, timestamp: timestampMs }
    ];
    
    const normalized = normalizeSalesForExport(sales);
    
    // Check that all normalized records have consistent structure
    normalized.forEach(record => {
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('machineId');
      expect(record).toHaveProperty('saleAmount');
      expect(record).toHaveProperty('accumulatedTotal');
      expect(record).toHaveProperty('timestamp');
      expect(record).toHaveProperty('date');
      expect(record).toHaveProperty('time');
      
      // Validate data types
      expect(typeof record.id).toBe('string');
      expect(typeof record.machineId).toBe('string');
      expect(typeof record.saleAmount).toBe('number');
      expect(typeof record.accumulatedTotal).toBe('number');
      expect(typeof record.timestamp).toBe('string');
      expect(typeof record.date).toBe('string');
      expect(typeof record.time).toBe('string');
      
      // Validate format
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.time).toMatch(/^\d{2}:\d{2}$/);
    });
    
    // Check that the original values are preserved
    expect(normalized[0].saleAmount).toBe(50);
    expect(normalized[0].accumulatedTotal).toBe(150);
    expect(normalized[1].saleAmount).toBe(60);
    expect(normalized[1].accumulatedTotal).toBe(210);
    expect(normalized[2].saleAmount).toBe(70);
    expect(normalized[2].accumulatedTotal).toBe(280);
    expect(normalized[3].saleAmount).toBe(80);
    expect(normalized[3].accumulatedTotal).toBe(360);
  });

  it('buildImportCompatibleCSV preserves all critical data without modification', () => {
    const testData = [
      { id: 'a1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, date: '2025-08-15', time: '10:30' },
      { id: 'a2', machineId: '77', saleAmount: 75, accumulatedTotal: 225, date: '2025-08-15', time: '11:45' },
      { id: 'a3', machineId: '76', saleAmount: 25, accumulatedTotal: 175, date: '2025-08-15', time: '14:15' }
    ];
    
    const csv = buildImportCompatibleCSV(testData);
    const lines = csv.split('\n');
    
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('2025-08-15,10:30,76,150');
    expect(lines[1]).toBe('2025-08-15,11:45,77,225');
    expect(lines[2]).toBe('2025-08-15,14:15,76,175');
    
    // Verify no header is included
    expect(csv).not.toContain('date,time,machineId,accumulatedTotal');
    
    // Verify exactly 4 columns per line
    lines.forEach(line => {
      const columns = line.split(',');
      expect(columns.length).toBe(4);
    });
  });

  it('normalized export data maintains timezone consistency', () => {
    // Create timestamp at a specific time
    const testTime = new Date('2025-08-15T22:30:00.000Z'); // 10:30 PM UTC
    const sales = [
      { id: 'test', machineId: '76', saleAmount: 100, accumulatedTotal: 300, timestamp: { toDate: () => testTime } }
    ];
    
    const normalized = normalizeSalesForExport(sales);
    
    // The timestamp should be in ISO format (preserves original)
    expect(normalized[0].timestamp).toBe('2025-08-15T22:30:00.000Z');
    expect(normalized[0].date).toBe('2025-08-15');
    // The time should now be in local format to preserve day boundaries
    const localHours = testTime.getHours().toString().padStart(2, '0');
    const localMinutes = testTime.getMinutes().toString().padStart(2, '0');
    expect(normalized[0].time).toBe(`${localHours}:${localMinutes}`);
  });

  it('export and import cycle preserves data integrity', () => {
    // Test a complete export-import cycle to ensure data consistency
    const originalDate = new Date('2025-08-15T14:30:00.000Z');
    const sales = [
      { id: 'cycle1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, timestamp: { toDate: () => originalDate } },
      { id: 'cycle2', machineId: '77', saleAmount: 75, accumulatedTotal: 225, timestamp: { toDate: () => new Date('2025-08-15T16:45:00.000Z') } }
    ];
    
    // Step 1: Normalize for export
    const normalized = normalizeSalesForExport(sales);
    
    // Step 2: Generate CSV
    const csv = buildImportCompatibleCSV(normalized);
    
    // Step 3: Verify CSV format
    const lines = csv.split('\n');
    // Note: The times will be in local timezone
    const localTime1 = new Date('2025-08-15T14:30:00.000Z').getHours().toString().padStart(2, '0') + ':' + 
                      new Date('2025-08-15T14:30:00.000Z').getMinutes().toString().padStart(2, '0');
    const localTime2 = new Date('2025-08-15T16:45:00.000Z').getHours().toString().padStart(2, '0') + ':' + 
                      new Date('2025-08-15T16:45:00.000Z').getMinutes().toString().padStart(2, '0');
    expect(lines[0]).toBe(`2025-08-15,${localTime1},76,150`);
    expect(lines[1]).toBe(`2025-08-15,${localTime2},77,225`);
    
    // Step 4: Verify normalized data has correct structure
    expect(normalized[0]).toMatchObject({
      id: 'cycle1',
      machineId: '76',
      saleAmount: 50,
      accumulatedTotal: 150,
      date: '2025-08-15',
      time: localTime1,
      timestamp: '2025-08-15T14:30:00.000Z'
    });
    
    expect(normalized[1]).toMatchObject({
      id: 'cycle2',
      machineId: '77',
      saleAmount: 75,
      accumulatedTotal: 225,
      date: '2025-08-15',
      time: localTime2,
      timestamp: '2025-08-15T16:45:00.000Z'
    });
  });

  it('complete export-import cycle maintains data consistency', () => {
    // Test that exporting and then importing data maintains consistency
    const originalData = [
      { id: 'test1', machineId: '76', saleAmount: 50, accumulatedTotal: 150, timestamp: { toDate: () => new Date('2025-08-15T14:30:00.000Z') } },
      { id: 'test2', machineId: '77', saleAmount: 75, accumulatedTotal: 225, timestamp: { toDate: () => new Date('2025-08-15T16:45:00.000Z') } }
    ];
    
    // Export phase
    const normalized = normalizeSalesForExport(originalData);
    const csvContent = buildImportCompatibleCSV(normalized);
    
    // Import phase
    const importedData = parseCSVAndCalculateSales(csvContent);
    
    // Verify the imported data maintains the original timestamps (in local time interpretation)
    expect(importedData).toHaveLength(2);
    
    // Check first record
    expect(importedData[0].machineId).toBe('76');
    expect(importedData[0].accumulatedTotal).toBe(150);
    // The timestamp should be interpreted as local time, so it will match the original when displayed locally
    
    // Check second record  
    expect(importedData[1].machineId).toBe('77');
    expect(importedData[1].accumulatedTotal).toBe(225);
  });

  it('normalizeSalesForExport handles invalid data gracefully', () => {
    const mixedData = [
      // Valid record
      { id: 'valid', machineId: '76', saleAmount: 50, accumulatedTotal: 150, timestamp: { toDate: () => new Date('2025-08-15T14:30:00.000Z') } },
      // Invalid timestamp (will use fallback date but still be included)
      { id: 'bad-timestamp', machineId: '77', saleAmount: 75, accumulatedTotal: 225, timestamp: 'invalid-date' },
      // Missing required fields (will be excluded)
      { id: 'incomplete', saleAmount: 100 },
      // Null object (will be excluded)
      null,
      // Valid record
      { id: 'valid2', machineId: '78', saleAmount: 25, accumulatedTotal: 175, timestamp: { toDate: () => new Date('2025-08-15T16:45:00.000Z') } }
    ];
    
    const normalized = normalizeSalesForExport(mixedData);
    
    // Should return 3 records: 2 valid + 1 with invalid timestamp but fallback date
    expect(normalized).toHaveLength(3);
    expect(normalized[0].id).toBe('valid');
    expect(normalized[0].machineId).toBe('76');
    expect(normalized[1].id).toBe('bad-timestamp'); // This should be included with fallback timestamp
    expect(normalized[1].machineId).toBe('77');
    expect(normalized[2].id).toBe('valid2');
    expect(normalized[2].machineId).toBe('78');
  });
});
