/**
 * Generic API Core Module
 * Refactored from legacy api.js to support multiple functionality types
 * Based on SRS.json requirements - supports all 9 functionalities
 */

import { 
    collection, 
    addDoc, 
    query, 
    onSnapshot, 
    orderBy, 
    doc, 
    writeBatch, 
    Timestamp, 
    where, 
    deleteDoc, 
    getDocs, 
    limit, 
    startAfter 
} from '../firebase-firestore-wrapper.js';
import { db } from '../auth.js';
import { getUserId } from '../state.js';

/**
 * Generic Data API - supports all SRS functionalities
 * 
 * Collection paths based on refactor-plan.json data model:
 * - hourly_sales: artifacts/{appId}/public/data/hourly_sales
 * - monthly_commissions: artifacts/{appId}/public/data/monthly_commissions
 * - roll_changes: artifacts/{appId}/public/data/roll_changes
 * - daily_weekly_sales: artifacts/{appId}/public/data/daily_weekly_sales
 * - tickets_sold: artifacts/{appId}/public/data/tickets_sold
 * - ticket_averages: artifacts/{appId}/public/data/ticket_averages
 * - scratch_prizes: artifacts/{appId}/public/data/scratch_prizes
 * - paid_prizes: artifacts/{appId}/public/data/paid_prizes
 * - first_places: artifacts/{appId}/public/data/first_places
 * - users: artifacts/{appId}/public/data/users
 */

class GenericDataAPI {
    constructor() {
        this.collections = new Map();
        this.unsubscribers = new Map();
    }

    /**
     * Get collection reference for a functionality type
     * @param {string} functionalityType - Type from SRS (hourly_sales, monthly_commissions, etc.)
     * @returns {Object} Firestore collection reference
     */
    getCollection(functionalityType) {
        if (!this.collections.has(functionalityType)) {
            const collectionPath = `artifacts/app/public/data/${functionalityType}`;
            const collectionRef = collection(db, collectionPath);
            this.collections.set(functionalityType, collectionRef);
        }
        return this.collections.get(functionalityType);
    }

    /**
     * Subscribe to real-time data updates
     * @param {string} functionalityType - Type from SRS
     * @param {Object} filters - Query filters
     * @param {Function} onDataUpdate - Callback when data changes
     * @param {Function} onError - Error callback
     * @returns {Function} Unsubscribe function
     */
    subscribeToData(functionalityType, filters = {}, onDataUpdate, onError) {
        // Unsubscribe from previous subscription if exists
        this.unsubscribeFromData(functionalityType);

        const collectionRef = this.getCollection(functionalityType);
        let q = query(collectionRef);

        // Apply filters based on functionality type and SRS requirements
        if (filters.startDate && filters.endDate) {
            q = query(q, 
                where("timestamp", ">=", filters.startDate),
                where("timestamp", "<", filters.endDate)
            );
        }

        // Add ordering - timestamp for most functionalities
        q = query(q, orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, 
            snapshot => {
                const data = snapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                }));
                onDataUpdate(data);
            },
            error => {
                console.error(`Error in ${functionalityType} subscription:`, error);
                if (onError) onError(error);
            }
        );

        this.unsubscribers.set(functionalityType, unsubscribe);
        return unsubscribe;
    }

    /**
     * Unsubscribe from real-time data updates
     * @param {string} functionalityType - Type from SRS
     */
    unsubscribeFromData(functionalityType) {
        const unsubscribe = this.unsubscribers.get(functionalityType);
        if (unsubscribe) {
            unsubscribe();
            this.unsubscribers.delete(functionalityType);
        }
    }

    /**
     * Add new record to any functionality
     * @param {string} functionalityType - Type from SRS
     * @param {Object} data - Record data according to SRS fields
     * @returns {Promise} Document reference
     */
    async addRecord(functionalityType, data) {
        const collectionRef = this.getCollection(functionalityType);
        const recordData = {
            ...data,
            timestamp: Timestamp.now(),
            userId: getUserId()
        };
        return await addDoc(collectionRef, recordData);
    }

    /**
     * Batch update multiple records
     * @param {string} functionalityType - Type from SRS
     * @param {Array} updates - Array of {id, data} objects
     * @returns {Promise} Batch commit result
     */
    async batchUpdateRecords(functionalityType, updates) {
        const batch = writeBatch(db);
        const collectionRef = this.getCollection(functionalityType);

        updates.forEach(update => {
            const docRef = doc(collectionRef, update.id);
            batch.update(docRef, update.data);
        });

        return await batch.commit();
    }

    /**
     * Delete record and optionally update related records
     * @param {string} functionalityType - Type from SRS
     * @param {string} recordId - ID of record to delete
     * @param {Object} relatedUpdate - Optional related record update
     * @returns {Promise} Batch commit result
     */
    async deleteRecordAndUpdate(functionalityType, recordId, relatedUpdate = null) {
        const batch = writeBatch(db);
        const collectionRef = this.getCollection(functionalityType);
        
        const deleteRef = doc(collectionRef, recordId);
        batch.delete(deleteRef);

        if (relatedUpdate) {
            const relatedRef = doc(collectionRef, relatedUpdate.id);
            batch.update(relatedRef, relatedUpdate.data);
        }

        return await batch.commit();
    }

    /**
     * Fetch all records with pagination (for export/backup)
     * @param {string} functionalityType - Type from SRS
     * @param {number} batchSize - Records per batch
     * @returns {Promise<Array>} All records
     */
    async fetchAllRecordsPaginated(functionalityType, batchSize = 500) {
        const collectionRef = this.getCollection(functionalityType);
        let results = [];
        let lastDoc = null;

        while (true) {
            let qRef = query(collectionRef, orderBy('timestamp', 'asc'), limit(batchSize));
            if (lastDoc) {
                qRef = query(collectionRef, orderBy('timestamp', 'asc'), startAfter(lastDoc), limit(batchSize));
            }

            const snap = await getDocs(qRef);
            if (snap.empty) break;

            snap.docs.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            lastDoc = snap.docs[snap.docs.length - 1];
            
            if (snap.size < batchSize) break;
        }

        return results;
    }

    /**
     * Upload historical data in batches (for CSV import)
     * @param {string} functionalityType - Type from SRS
     * @param {Array} records - Records to upload
     * @returns {Promise<number>} Number of uploaded records
     */
    async uploadHistoricalData(functionalityType, records) {
        if (!records || !Array.isArray(records) || records.length === 0) {
            throw new Error('No hay datos válidos para subir');
        }

        const collectionRef = this.getCollection(functionalityType);
        const batchSize = 500; // Firestore batch limit
        const batches = [];

        // Split data into batches
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            batches.push(batch);
        }

        let totalUploaded = 0;

        // Process each batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = writeBatch(db);
            const currentBatch = batches[batchIndex];

            currentBatch.forEach(recordData => {
                // Validate each record before uploading
                if (!recordData.timestamp) {
                    throw new Error(`Registro inválido encontrado: ${JSON.stringify(recordData)}`);
                }

                const docRef = doc(collectionRef);
                batch.set(docRef, {
                    ...recordData,
                    userId: getUserId() || 'historical'
                });
            });

            try {
                await batch.commit();
                totalUploaded += currentBatch.length;
                console.log(`Batch ${batchIndex + 1}/${batches.length} uploaded successfully (${currentBatch.length} records)`);
            } catch (error) {
                console.error(`Error uploading batch ${batchIndex + 1}:`, error);
                throw new Error(`Error subiendo lote ${batchIndex + 1}: ${error.message}`);
            }
        }

        console.log(`Successfully uploaded ${totalUploaded} historical records to ${functionalityType}`);
        return totalUploaded;
    }

    /**
     * Cleanup all subscriptions
     */
    cleanup() {
        this.unsubscribers.forEach((unsubscribe, functionalityType) => {
            unsubscribe();
        });
        this.unsubscribers.clear();
    }
}

// Export singleton instance
export const dataAPI = new GenericDataAPI();

// Backward compatibility - Legacy API for hourly sales
// These functions maintain compatibility with existing code
const HOURLY_SALES_TYPE = 'hourly_sales';

export function subscribeToSalesData(startDate, endDate, onDataUpdate, onError) {
    return dataAPI.subscribeToData(
        HOURLY_SALES_TYPE,
        { startDate, endDate },
        onDataUpdate,
        onError
    );
}

export async function addSale(saleData) {
    return await dataAPI.addRecord(HOURLY_SALES_TYPE, saleData);
}

export async function batchUpdateSales(updates) {
    return await dataAPI.batchUpdateRecords(HOURLY_SALES_TYPE, updates);
}

export async function deleteSaleAndUpdate(deleteId, nextSaleUpdate) {
    return await dataAPI.deleteRecordAndUpdate(
        HOURLY_SALES_TYPE, 
        deleteId, 
        nextSaleUpdate ? { id: nextSaleUpdate.id, data: { saleAmount: nextSaleUpdate.saleAmount } } : null
    );
}

export async function fetchAllSalesPaginated(batchSize = 500) {
    return await dataAPI.fetchAllRecordsPaginated(HOURLY_SALES_TYPE, batchSize);
}

export async function uploadHistoricalData(salesData) {
    return await dataAPI.uploadHistoricalData(HOURLY_SALES_TYPE, salesData);
}
