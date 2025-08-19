import { collection, addDoc, query, onSnapshot, orderBy, doc, writeBatch, Timestamp, where, deleteDoc, getDocs, limit, startAfter } from './firebase-firestore-wrapper.js';
import { applyFiltersAndUpdateUI, getUserId } from './state.js';
import { db, salesCollection } from './auth.js';
import { toggleGlobalLoader } from './ui.js';

let unsubscribe; 

export function subscribeToSalesData(startDate, endDate) {
    if (unsubscribe) unsubscribe();
    
    toggleGlobalLoader(true);

    const q = query(
        salesCollection,
        where("timestamp", ">=", startDate),
        where("timestamp", "<", endDate), 
        orderBy("timestamp", "desc")
    );

    unsubscribe = onSnapshot(q, snapshot => {
        const salesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        applyFiltersAndUpdateUI(salesData);
        toggleGlobalLoader(false);
    }, error => {
        console.error("Error escuchando los datos de ventas:", error);
        toggleGlobalLoader(false);
    });
}

export async function addSale(saleData) {
    return await addDoc(salesCollection, { ...saleData, timestamp: Timestamp.now(), userId: getUserId() });
}

export async function batchUpdateSales(updates) {
    const batch = writeBatch(db);
    updates.forEach(update => {
        const docRef = doc(db, salesCollection.path, update.id);
        batch.update(docRef, update.data);
    });
    return await batch.commit();
}

export async function deleteSaleAndUpdate(deleteId, nextSaleUpdate) {
    const batch = writeBatch(db);
    const deleteRef = doc(db, salesCollection.path, deleteId);
    batch.delete(deleteRef);

    if (nextSaleUpdate) {
        const nextSaleRef = doc(db, salesCollection.path, nextSaleUpdate.id);
        batch.update(nextSaleRef, { saleAmount: nextSaleUpdate.saleAmount });
    }
    return await batch.commit();
}

// Paginate through ALL sales (bypasses current UI filter) for backup/export.
// Returns array of raw documents {id, ...data}
export async function fetchAllSalesPaginated(batchSize = 500) {
    if (!salesCollection) throw new Error('Colección no inicializada');
    let results = [];
    let lastDoc = null;
    // Firestore requires an orderBy for startAfter
    while (true) {
        let qRef = query(salesCollection, orderBy('timestamp', 'asc'), limit(batchSize));
        if (lastDoc) {
            qRef = query(salesCollection, orderBy('timestamp', 'asc'), startAfter(lastDoc), limit(batchSize));
        }
        const snap = await getDocs(qRef);
        if (snap.empty) break;
        snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
        lastDoc = snap.docs[snap.docs.length - 1];
        if (snap.size < batchSize) break; // no more docs
    }
    return results;
}

// Upload historical data from CSV import in batches
export async function uploadHistoricalData(salesData) {
    if (!salesCollection) throw new Error('Colección no inicializada');
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
        throw new Error('No hay datos válidos para subir');
    }
    
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    
    // Split data into batches
    for (let i = 0; i < salesData.length; i += batchSize) {
        const batch = salesData.slice(i, i + batchSize);
        batches.push(batch);
    }
    
    let totalUploaded = 0;
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = writeBatch(db);
        const currentBatch = batches[batchIndex];
        
        currentBatch.forEach(saleData => {
            // Validate each record before uploading
            if (!saleData.machineId || typeof saleData.accumulatedTotal !== 'number' || !saleData.timestamp) {
                throw new Error(`Registro inválido encontrado: ${JSON.stringify(saleData)}`);
            }
            
            // Create a new document reference for each sale
            const docRef = doc(salesCollection);
            batch.set(docRef, {
                ...saleData,
                userId: getUserId() || 'anonymous' // Add user ID for security, fallback for safety
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
    
    console.log(`Successfully uploaded ${totalUploaded} historical records`);
    return totalUploaded;
}
