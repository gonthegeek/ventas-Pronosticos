import { addSale, updateSaleBatch, uploadHistoricalData } from './api.js';
import { setFilter, addComparisonDate, handlePillClick, getAllSales, getState } from './state.js';
import { openEditModal, displayFeedback } from './ui.js';
import { parseCSVAndCalculateSales } from './utils.js';

// Configura todos los listeners de la aplicación
export function setupEventListeners() {
    document.getElementById('sale-form').addEventListener('submit', handleAddSale);
    document.getElementById('filter-today').addEventListener('click', () => setFilter({ type: 'today' }));
    document.getElementById('filter-week').addEventListener('click', () => setFilter({ type: 'week' }));
    document.getElementById('filter-month').addEventListener('click', () => setFilter({ type: 'month' }));
    document.getElementById('machine-filter').addEventListener('change', e => setFilter({ machine: e.target.value }));
    document.getElementById('add-comparison-date').addEventListener('click', addComparisonDate);
    document.getElementById('comparison-pills').addEventListener('click', handlePillClick);
    document.getElementById('compare-days-btn').addEventListener('click', () => setFilter({ type: 'comparison' }));
    document.getElementById('sales-table-body').addEventListener('click', handleTableClick);
    document.getElementById('edit-form').addEventListener('submit', handleUpdateSale);
    document.getElementById('upload-csv-btn').addEventListener('click', handleCSVUpload);
}

// Manejadores de eventos
async function handleAddSale(event) {
    event.preventDefault();
    const machineId = document.getElementById('machine-id').value;
    const newAccumulatedTotal = parseFloat(document.getElementById('sale-amount').value);
    if (!machineId || isNaN(newAccumulatedTotal) || newAccumulatedTotal < 0) return;

    const allSales = getAllSales();
    const today = new Date();
    const lastSaleToday = allSales.find(sale => {
        const saleDate = sale.timestamp.toDate();
        return sale.machineId === machineId &&
            saleDate.getFullYear() === today.getFullYear() &&
            saleDate.getMonth() === today.getMonth() &&
            saleDate.getDate() === today.getDate();
    });

    const lastAccumulatedTotal = lastSaleToday ? lastSaleToday.accumulatedTotal : 0;

    if (newAccumulatedTotal < lastAccumulatedTotal) {
        return displayFeedback("El nuevo total no puede ser menor que el último registrado para hoy.", "error");
    }
    const saleForPeriod = newAccumulatedTotal - lastAccumulatedTotal;
    
    try {
        await addSale({ machineId, saleAmount: saleForPeriod, accumulatedTotal: newAccumulatedTotal, timestamp: new Date() });
        displayFeedback("Venta registrada con éxito.", "success");
        event.target.reset();
    } catch(e) {
        displayFeedback("Error al registrar la venta.", "error");
        console.error(e);
    }
}

function handleTableClick(event) {
    const editButton = event.target.closest('.edit-btn');
    if (editButton) openEditModal(editButton.dataset.id);
}

async function handleUpdateSale(event) {
    event.preventDefault();
    const saleId = document.getElementById('edit-sale-id').value;
    const newAccumulatedTotal = parseFloat(document.getElementById('edit-accumulated-total').value);

    const allSales = getAllSales();
    const saleToEdit = allSales.find(s => s.id === saleId);
    if (!saleToEdit) return displayFeedback("No se encontró el registro.", "error");

    const saleDate = saleToEdit.timestamp.toDate();
    const salesOnThatDay = allSales
        .filter(s => {
            const d = s.timestamp.toDate();
            return s.machineId === saleToEdit.machineId &&
                d.getFullYear() === saleDate.getFullYear() &&
                d.getMonth() === saleDate.getMonth() &&
                d.getDate() === saleDate.getDate();
        })
        .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

    const saleIndexInDay = salesOnThatDay.findIndex(s => s.id === saleId);
    const previousSale = saleIndexInDay > 0 ? salesOnThatDay[saleIndexInDay - 1] : null;
    const nextSale = saleIndexInDay < salesOnThatDay.length - 1 ? salesOnThatDay[saleIndexInDay + 1] : null;
    const previousAccumulated = previousSale ? previousSale.accumulatedTotal : 0;

    if (newAccumulatedTotal < previousAccumulated || (nextSale && newAccumulatedTotal > nextSale.accumulatedTotal)) {
        return displayFeedback("El total acumulado es inconsistente con los registros adyacentes del mismo día.", "error");
    }

    try {
        const newSaleAmount = newAccumulatedTotal - previousAccumulated;
        await updateSaleBatch(saleId, newAccumulatedTotal, newSaleAmount, nextSale);
        displayFeedback("Registro actualizado con éxito.", "success");
        document.getElementById('cancel-edit').click(); // Cierra el modal
    } catch (error) {
        displayFeedback("Error al guardar los cambios.", "error");
        console.error(error);
    }
}

async function handleCSVUpload() {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];
    if (!file) return displayFeedback("Por favor, selecciona un archivo CSV.", "error");

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            displayFeedback(`Procesando ${file.name}...`, 'success');
            const records = parseCSVAndCalculateSales(event.target.result);
            await uploadHistoricalData(records);
            displayFeedback(`¡${records.length} registros históricos subidos con éxito!`, 'success');
            fileInput.value = '';
        } catch (e) {
            displayFeedback(`Error procesando el archivo: ${e.message}`, 'error');
            console.error(e);
        }
    };
    reader.readAsText(file);
}
