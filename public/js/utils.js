/* uncoment this line for test and comment the next line import { Timestamp } from "firebase/firestore";
 */
import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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