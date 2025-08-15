import { Timestamp as FirestoreTimestamp } from './firebase-firestore-wrapper.js';
// Fallback simple Timestamp for test environment if wrapper hasn't loaded
const Timestamp = FirestoreTimestamp || class SimpleTimestamp {
    constructor(date) { this._d = date; }
    static fromDate(date){ return new SimpleTimestamp(date); }
    toDate(){ return this._d; }
    toMillis(){ return this._d.getTime(); }
};

export function parseCSVAndCalculateSales(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    
    let parsedData = lines.map((line, index) => {
        const [dateStr, timeStr, machine, total] = line.split(',');
        if (!dateStr || !timeStr || !machine || !total) throw new Error(`Línea ${index + 1}: formato incorrecto.`);
        
        const dateParts = dateStr.trim().split('-');
        const timeParts = timeStr.trim().split(':');
        if (dateParts.length !== 3 || timeParts.length !== 2) throw new Error(`Línea ${index + 1}: formato de fecha/hora incorrecto.`);

        const [year, month, day] = dateParts.map(p => parseInt(p, 10));
        const [hour, minute] = timeParts.map(p => parseInt(p, 10));
        const timestamp = new Date(year, month - 1, day, hour, minute);
        if (isNaN(timestamp.getTime())) throw new Error(`Línea ${index + 1}: fecha u hora inválida.`);

        return {
            timestamp: Timestamp.fromDate(timestamp),
            machineId: machine.trim(),
            accumulatedTotal: parseFloat(total.trim()),
            saleAmount: 0 
        };
    });

    parsedData.sort((a, b) => {
        if (a.machineId < b.machineId) return -1;
        if (a.machineId > b.machineId) return 1;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
    });

    const lastTotals = {};
    const lastDates = {};
    parsedData.forEach(record => {
        const { machineId, timestamp, accumulatedTotal } = record;
        const recordDate = timestamp.toDate();
        const recordDayStr = `${recordDate.getFullYear()}-${recordDate.getMonth()}-${recordDate.getDate()}`;

        if (lastDates[machineId] !== recordDayStr) {
            lastTotals[machineId] = 0;
        }
        const prevTotal = lastTotals[machineId] || 0;
        if (accumulatedTotal < prevTotal) {
            throw new Error(`Inconsistencia en Máquina ${machineId} el ${recordDate.toLocaleDateString()}: total ${accumulatedTotal} es menor que el anterior ${prevTotal}.`);
        }
        record.saleAmount = accumulatedTotal - prevTotal;
        lastTotals[machineId] = accumulatedTotal;
        lastDates[machineId] = recordDayStr;
    });

    return parsedData;
}

export function recalculateSalesForDay(allSales, machineId, date) {
    // **CORRECCIÓN**: Ahora esta función siempre espera que el array `allSales`
    // contenga objetos donde `timestamp` es una fecha de JavaScript, no de Firebase.
    const salesOnDay = allSales
        .filter(s => {
            const d = s.timestamp; // Ya es una fecha JS, no se necesita .toDate()
            return s.machineId === machineId &&
                d.getFullYear() === date.getFullYear() &&
                d.getMonth() === date.getMonth() &&
                d.getDate() === date.getDate();
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Usamos .getTime() para comparar

    let lastTotal = 0;
    const updates = [];

    salesOnDay.forEach(sale => {
        const newSaleAmount = sale.accumulatedTotal - lastTotal;
        
        updates.push({
            id: sale.id,
            data: { 
                saleAmount: newSaleAmount,
                accumulatedTotal: sale.accumulatedTotal,
                timestamp: sale.timestamp, // Se mantiene como fecha JS para el siguiente paso
             }
        });
        
        lastTotal = sale.accumulatedTotal;
    });

    return updates;
}

// --- EXPORT / BACKUP HELPERS ---

// Convert sales array (Firestore docs) to plain JS objects with primitive values
export function normalizeSalesForExport(sales) {
    return sales.map(s => {
        const dateObj = s.timestamp?.toDate ? s.timestamp.toDate() : (s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp));
        return {
            id: s.id || '',
            machineId: s.machineId,
            saleAmount: s.saleAmount,
            accumulatedTotal: s.accumulatedTotal,
            timestamp: dateObj.toISOString(),
            date: dateObj.toISOString().split('T')[0],
            time: dateObj.toTimeString().slice(0,5)
        };
    });
}

export function buildCSVFromSales(sales) {
    const rows = ['date,time,machineId,accumulatedTotal,saleAmount,id'];
    sales.forEach(r => {
        rows.push(`${r.date},${r.time},${r.machineId},${r.accumulatedTotal},${r.saleAmount},${r.id}`);
    });
    return rows.join('\n');
}

// Build CSV matching the import format (NO header): date, time, machineId, accumulatedTotal
export function buildImportCompatibleCSV(sales) {
    return sales.map(r => `${r.date},${r.time},${r.machineId},${r.accumulatedTotal}`).join('\n');
}

export function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

export function generateAndDownloadBackups(rawSales) {
    const normalized = normalizeSalesForExport(rawSales);
    const csv = buildImportCompatibleCSV(normalized);
    const timestamp = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
    downloadTextFile(`ventas-export-${timestamp}.csv`, csv);
}