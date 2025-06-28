import { collection, addDoc, query, onSnapshot, orderBy, doc, writeBatch, Timestamp, where, deleteDoc } from "firebase/firestore";
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
