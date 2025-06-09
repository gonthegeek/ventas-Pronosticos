import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Parsea el texto de un archivo CSV y calcula las ventas por período
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
