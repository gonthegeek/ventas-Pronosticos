/**
 * Legacy API Compatibility Layer
 * Maintains backward compatibility while using the new Generic Data API
 * This file provides the same interface as the original api.js
 */

// Import from the new core API
export { 
    subscribeToSalesData,
    addSale,
    batchUpdateSales,
    deleteSaleAndUpdate,
    fetchAllSalesPaginated,
    uploadHistoricalData
} from './core/api.js';

// Also export the dataAPI for advanced usage
export { dataAPI } from './core/api.js';
