import { collection, addDoc, query, onSnapshot, orderBy, doc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { applyFiltersAndUpdateUI, getUserId } from './state.js';
import { db, salesCollection } from './auth.js';

// Escucha en tiempo real los cambios en la colección de ventas
export function listenForSales(collectionRef) {
    const q = query(collectionRef, orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
        const salesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        applyFiltersAndUpdateUI(salesData);
    }, console.error);
}

// Añade un nuevo registro de venta
export async function addSale(saleData) {
    return await addDoc(salesCollection, { ...saleData, userId: getUserId() });
}

// Actualiza un registro existente y, si es necesario, el siguiente
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

// Sube un lote de registros desde un archivo CSV
export async function uploadHistoricalData(records) {
    const batch = writeBatch(db);
    records.forEach(record => {
        const newDocRef = doc(collection(db, salesCollection.path));
        batch.set(newDocRef, { ...record, userId: getUserId() });
    });
    return await batch.commit();
}
