import { collection, addDoc, query, onSnapshot, orderBy, doc, writeBatch, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { applyFiltersAndUpdateUI, getUserId } from './state.js';
import { db, salesCollection } from './auth.js';
import { toggleGlobalLoader } from './ui.js';

export function listenForSales(collectionRef) {
    const q = query(collectionRef, orderBy("timestamp", "desc"));
    let isFirstLoad = true;
    onSnapshot(q, snapshot => {
        const salesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        applyFiltersAndUpdateUI(salesData);
        if (isFirstLoad) {
            toggleGlobalLoader(false);
            isFirstLoad = false;
        }
    }, error => {
        console.error("Error escuchando los datos de ventas:", error);
        toggleGlobalLoader(false);
    });
}

export async function addSale(saleData) {
    return await addDoc(salesCollection, { ...saleData, timestamp: Timestamp.now(), userId: getUserId() });
}

export async function updateSaleBatch(saleId, newAccumulatedTotal, newSaleAmount, nextSale) {
    const batch = writeBatch(db);
    const saleRef = doc(db, salesCollection.path, saleId);
    batch.update(saleRef, { accumulatedTotal: newAccumulatedTotal, saleAmount: newSaleAmount });
    if (nextSale) {
        const nextSaleRef = doc(db, salesCollection.path, nextSale.id);
        const nextSaleAmount = nextSale.accumulatedTotal - newAccumulatedTotal;
        batch.update(nextSaleRef, { saleAmount: nextSaleAmount });
    }
    return await batch.commit();
}

export async function uploadHistoricalData(records) {
    const batch = writeBatch(db);
    records.forEach(record => {
        const newDocRef = doc(collection(db, salesCollection.path));
        batch.set(newDocRef, { ...record, userId: getUserId() });
    });
    return await batch.commit();
}
