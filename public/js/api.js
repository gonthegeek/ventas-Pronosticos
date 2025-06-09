import { collection, addDoc, query, onSnapshot, orderBy, doc, writeBatch, Timestamp, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { applyFiltersAndUpdateUI, getUserId } from './state.js';
import { db, salesCollection } from './auth.js';
import { toggleGlobalLoader } from './ui.js';

let unsubscribe; // Variable para mantener la función de cancelación de la suscripción actual

// Se suscribe a los datos de un rango de fechas específico
export function subscribeToSalesData(startDate, endDate) {
    // Si hay una suscripción anterior, la cancelamos para evitar fugas de memoria
    if (unsubscribe) {
        unsubscribe();
    }
    
    toggleGlobalLoader(true);

    const q = query(
        salesCollection,
        where("timestamp", ">=", startDate),
        where("timestamp", "<", endDate), // Usar '<' en lugar de '<=' para evitar incluir el inicio del día siguiente
        orderBy("timestamp", "desc")
    );

    unsubscribe = onSnapshot(q, snapshot => {
        const salesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Pasamos los datos ya filtrados por fecha al estado
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
