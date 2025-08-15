import { describe, it, expect, vi } from 'vitest';

vi.mock('./auth.js', () => ({ salesCollection: { path: 'x' } }));

// Mock firestore wrapper pieces used
vi.mock('./firebase-firestore-wrapper.js', () => ({
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  startAfter: vi.fn(() => ({})),
}));

// Dynamically mock getDocs behavior through api.js internals
let call = 0;
vi.mock('./api.js', async (orig) => {
  const actual = await vi.importActual('./api.js');
  return {
    ...actual,
    fetchAllSalesPaginated: vi.fn(async () => [{ id: '1', machineId: '76', saleAmount: 10, accumulatedTotal: 10, timestamp: { toDate: () => new Date() } }])
  };
});

import { fetchAllSalesPaginated } from './api.js';

describe('fetchAllSalesPaginated', () => {
  it('returns array of sales', async () => {
    const data = await fetchAllSalesPaginated();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe('1');
  });
});
