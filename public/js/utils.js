import { Timestamp as FirestoreTimestamp } from './firebase-firestore-wrapper.js';
// Fallback simple Timestamp for test environment if wrapper hasn't loaded
// Use Firebase Timestamp with fallback for testing
const Timestamp = FirestoreTimestamp || class SimpleTimestamp {
    constructor(seconds, nanoseconds) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds || 0;
    }
    
    static fromDate(date) {
        return new SimpleTimestamp(Math.floor(date.getTime() / 1000), 0);
    }
    
    toDate() {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }
};

// For production, ensure we use the real Firebase Timestamp
const createTimestamp = (date) => {
    if (FirestoreTimestamp) {
        return FirestoreTimestamp.fromDate(date);
    }
    return Timestamp.fromDate(date);
};

// Helper to get timestamp value for comparison (works with both Firebase Timestamp and fallback)
const getTimestampValue = (timestamp) => {
    if (timestamp.toMillis) {
        return timestamp.toMillis();
    }
    return timestamp.toDate().getTime();
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
        
        // Create timestamp that matches the business timezone used in export
        // The exported data represents Mexico City business time, so we need to convert back
        const offsetHours = 6; // Mexico City offset from UTC
        const businessDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
        const timestamp = new Date(businessDate.getTime() + (offsetHours * 60 * 60 * 1000));
        
        if (isNaN(timestamp.getTime())) {
            throw new Error(`Línea ${index + 1}: fecha u hora inválida.`);
        }

        return {
            timestamp: createTimestamp(timestamp),
            machineId: sanitizedMachine,
            accumulatedTotal: totalNum,
            saleAmount: 0 
        };
    });

    parsedData.sort((a, b) => {
        if (a.machineId < b.machineId) return -1;
        if (a.machineId > b.machineId) return 1;
        return getTimestampValue(a.timestamp) - getTimestampValue(b.timestamp);
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
// This function preserves the logical day boundaries as they appear in the business context
export function normalizeSalesForExport(sales) {
    if (!Array.isArray(sales)) {
        console.warn('normalizeSalesForExport: expected array, got:', typeof sales);
        return [];
    }
    
    return sales.map((s, index) => {
        // Validate input data
        if (!s || typeof s !== 'object') {
            console.warn(`normalizeSalesForExport: invalid sale object at index ${index}:`, s);
            return null;
        }
        
        // Validate required fields
        if (typeof s.machineId !== 'string' || typeof s.saleAmount !== 'number' || typeof s.accumulatedTotal !== 'number') {
            console.warn(`normalizeSalesForExport: missing or invalid required fields at index ${index}:`, s);
            return null;
        }
        
        // Ensure we have a valid Date object
        let dateObj;
        if (s.timestamp?.toDate) {
            dateObj = s.timestamp.toDate();
        } else if (s.timestamp instanceof Date) {
            dateObj = s.timestamp;
        } else if (typeof s.timestamp === 'string' || typeof s.timestamp === 'number') {
            dateObj = new Date(s.timestamp);
        } else {
            console.warn(`normalizeSalesForExport: invalid timestamp at index ${index}:`, s.timestamp);
            dateObj = new Date(); // fallback to current time
        }
        
        // Validate the date
        if (isNaN(dateObj.getTime())) {
            console.warn(`normalizeSalesForExport: invalid timestamp found at index ${index}:`, s);
            dateObj = new Date(); // fallback to current time
        }
        
        // CRITICAL: Export using the timezone that preserves business logic
        // Since the data was entered by users thinking in local time (Mexico City = UTC-6),
        // we need to export in a way that preserves the logical day groupings
        
        // For Mexico City timezone (UTC-6), we adjust the date to show the "business day"
        // This ensures that sales entered on the same business day stay grouped together
        const offsetHours = 6; // Mexico City offset from UTC
        const adjustedDate = new Date(dateObj.getTime() - (offsetHours * 60 * 60 * 1000));
        
        const year = adjustedDate.getUTCFullYear();
        const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
        const hours = String(adjustedDate.getUTCHours()).padStart(2, '0');
        const minutes = String(adjustedDate.getUTCMinutes()).padStart(2, '0');
        
        return {
            id: s.id || '',
            machineId: s.machineId,
            saleAmount: s.saleAmount,
            accumulatedTotal: s.accumulatedTotal,
            timestamp: dateObj.toISOString(), // Keep original timestamp
            date: `${year}-${month}-${day}`, // Business day
            time: `${hours}:${minutes}` // Business time
        };
    }).filter(Boolean); // Remove any null entries from validation failures
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
    if (!rawSales || !Array.isArray(rawSales)) {
        console.error('generateAndDownloadBackups: Invalid sales data provided');
        throw new Error('Datos de ventas inválidos para exportar');
    }
    
    if (rawSales.length === 0) {
        console.warn('generateAndDownloadBackups: No sales data to export');
        throw new Error('No hay datos de ventas para exportar');
    }
    
    const normalized = normalizeSalesForExport(rawSales);
    
    if (normalized.length === 0) {
        console.error('generateAndDownloadBackups: All sales data failed normalization');
        throw new Error('Todos los registros de ventas contienen datos inválidos');
    }
    
    if (normalized.length !== rawSales.length) {
        console.warn(`generateAndDownloadBackups: ${rawSales.length - normalized.length} registros fueron excluidos por contener datos inválidos`);
    }
    
    const csv = buildImportCompatibleCSV(normalized);
    const timestamp = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
    downloadTextFile(`ventas-export-${timestamp}.csv`, csv);
    
    return {
        totalRecords: rawSales.length,
        exportedRecords: normalized.length,
        skippedRecords: rawSales.length - normalized.length
    };
}