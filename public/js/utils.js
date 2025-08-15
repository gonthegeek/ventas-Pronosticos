import { Timestamp as FirestoreTimestamp } from './firebase-firestore-wrapper.js';
// Fallback simple Timestamp for test environment if wrapper hasn't loaded
const Timestamp = FirestoreTimestamp || class SimpleTimestamp {
    constructor(date) { this._d = date; }
    static fromDate(date){ return new SimpleTimestamp(date); }
    toDate(){ return this._d; }
    toMillis(){ return this._d.getTime(); }
};

// Security and input validation utilities
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters and HTML
    return input
        .replace(/[<>'"]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/data:/gi, '')
        .trim();
}

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

export function validateMachineId(machineId) {
    // Only allow alphanumeric characters and basic symbols
    const machineRegex = /^[a-zA-Z0-9_-]+$/;
    return machineRegex.test(machineId) && machineId.length <= 10;
}

export function validateSaleAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0 && num <= 999999.99;
}

export function parseCSVAndCalculateSales(csvText) {
    // Sanitize input
    const sanitizedCSV = sanitizeInput(csvText);
    if (!sanitizedCSV || sanitizedCSV.length > 1000000) { // 1MB limit
        throw new Error('Archivo CSV inválido o demasiado grande');
    }
    
    const lines = sanitizedCSV.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length > 10000) { // Limit number of records
        throw new Error('Archivo CSV contiene demasiados registros (máximo 10,000)');
    }
    
    let parsedData = lines.map((line, index) => {
        const [dateStr, timeStr, machine, total] = line.split(',');
        if (!dateStr || !timeStr || !machine || !total) {
            throw new Error(`Línea ${index + 1}: formato incorrecto.`);
        }
        
        const sanitizedMachine = sanitizeInput(machine.trim());
        if (!validateMachineId(sanitizedMachine)) {
            throw new Error(`Línea ${index + 1}: ID de máquina inválido.`);
        }
        
        const sanitizedTotal = sanitizeInput(total.trim());
        const totalNum = parseFloat(sanitizedTotal);
        if (!validateSaleAmount(totalNum)) {
            throw new Error(`Línea ${index + 1}: monto de venta inválido.`);
        }
        
        const dateParts = sanitizeInput(dateStr.trim()).split('-');
        const timeParts = sanitizeInput(timeStr.trim()).split(':');
        if (dateParts.length !== 3 || timeParts.length !== 2) {
            throw new Error(`Línea ${index + 1}: formato de fecha/hora incorrecto.`);
        }

        const [year, month, day] = dateParts.map(p => parseInt(p, 10));
        const [hour, minute] = timeParts.map(p => parseInt(p, 10));
        
        // Validate date ranges
        if (year < 2020 || year > 2030 || month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            throw new Error(`Línea ${index + 1}: fecha u hora fuera de rango válido.`);
        }
        
        const timestamp = new Date(year, month - 1, day, hour, minute);
        if (isNaN(timestamp.getTime())) {
            throw new Error(`Línea ${index + 1}: fecha u hora inválida.`);
        }

        return {
            timestamp: Timestamp.fromDate(timestamp),
            machineId: sanitizedMachine,
            accumulatedTotal: totalNum,
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