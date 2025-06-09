import { addSale, updateSaleBatch, uploadHistoricalData } from './api.js';
import { setFilter, addComparisonDate, handlePillClick, getAllSales } from './state.js';
import { openEditModal, closeEditModal, showToast, toggleButtonSpinner } from './ui.js';
import { parseCSVAndCalculateSales } from './utils.js';

export function setupEventListeners() {
    document.getElementById('sale-form').addEventListener('submit', handleAddSale);
    document.getElementById('upload-csv-btn').addEventListener('click', handleCSVUpload);
    document.getElementById('edit-form').addEventListener('submit', handleUpdateSale);
    document.getElementById('filter-today').addEventListener('click', () => setFilter({ type: 'today' }));
    document.getElementById('filter-week').addEventListener('click', () => setFilter({ type: 'week' }));
    document.getElementById('filter-month').addEventListener('click', () => setFilter({ type: 'month' }));
    document.getElementById('machine-filter').addEventListener('change', e => setFilter({ machine: e.target.value }));
    document.getElementById('add-comparison-date').addEventListener('click', addComparisonDate);
    document.getElementById('comparison-pills').addEventListener('click', handlePillClick);
    document.getElementById('compare-days-btn').addEventListener('click', () => setFilter({ type: 'comparison' }));
    document.getElementById('sales-table-body').addEventListener('click', handleTableClick);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') closeEditModal();
    });
}

async function handleAddSale(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('add-sale-btn');
    toggleButtonSpinner(submitBtn, true);
    try {
        const machineId = document.getElementById('machine-id').value;
        const newAccumulatedTotal = parseFloat(document.getElementById('sale-amount').value);
        if (!machineId || isNaN(newAccumulatedTotal) || newAccumulatedTotal < 0) {
            throw new Error("Datos de venta inválidos.");
        }
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
            throw new Error("El nuevo total no puede ser menor que el último registrado para hoy.");
        }
        const saleForPeriod = newAccumulatedTotal - lastAccumulatedTotal;
        await addSale({ machineId, saleAmount: saleForPeriod, accumulatedTotal: newAccumulatedTotal });
        showToast("Venta registrada con éxito.", "success");
        event.target.reset();
    } catch (e) {
        showToast(e.message, "error");
        console.error(e);
    } finally {
        toggleButtonSpinner(submitBtn, false);
    }
}

function handleTableClick(event) {
    const editButton = event.target.closest('.edit-btn');
    if (editButton) openEditModal(editButton.dataset.id);
}

async function handleUpdateSale(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('save-edit-btn');
    toggleButtonSpinner(submitBtn, true);
    try {
        const saleId = document.getElementById('edit-sale-id').value;
        const newAccumulatedTotal = parseFloat(document.getElementById('edit-accumulated-total').value);
        const allSales = getAllSales();
        const saleToEdit = allSales.find(s => s.id === saleId);
        if (!saleToEdit) throw new Error("No se encontró el registro.");
        const saleDate = saleToEdit.timestamp.toDate();
        const salesOnThatDay = allSales.filter(s => {
                const d = s.timestamp.toDate();
                return s.machineId === saleToEdit.machineId && d.getFullYear() === saleDate.getFullYear() && d.getMonth() === saleDate.getMonth() && d.getDate() === saleDate.getDate();
            }).sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
        const saleIndexInDay = salesOnThatDay.findIndex(s => s.id === saleId);
        const previousSale = saleIndexInDay > 0 ? salesOnThatDay[saleIndexInDay - 1] : null;
        const nextSale = saleIndexInDay < salesOnThatDay.length - 1 ? salesOnThatDay[saleIndexInDay + 1] : null;
        const previousAccumulated = previousSale ? previousSale.accumulatedTotal : 0;
        if (newAccumulatedTotal < previousAccumulated || (nextSale && newAccumulatedTotal > nextSale.accumulatedTotal)) {
            throw new Error("El total acumulado es inconsistente con los registros adyacentes del mismo día.");
        }
        const newSaleAmount = newAccumulatedTotal - previousAccumulated;
        await updateSaleBatch(saleId, newAccumulatedTotal, newSaleAmount, nextSale);
        showToast("Registro actualizado con éxito.", "success");
        closeEditModal();
    } catch (error) {
        showToast(error.message, "error");
        console.error(error);
    } finally {
        toggleButtonSpinner(submitBtn, false);
    }
}

async function handleCSVUpload() {
    const uploadBtn = document.getElementById('upload-csv-btn');
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];
    if (!file) return showToast("Por favor, selecciona un archivo CSV.", "error");

    toggleButtonSpinner(uploadBtn, true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            showToast(`Procesando ${file.name}...`, 'info');
            const records = parseCSVAndCalculateSales(event.target.result);
            await uploadHistoricalData(records);
            showToast(`¡${records.length} registros históricos subidos con éxito!`, 'success');
            fileInput.value = '';
        } catch (e) {
            showToast(`Error procesando el archivo: ${e.message}`, 'error');
            console.error(e);
        } finally {
            toggleButtonSpinner(uploadBtn, false);
        }
    };
    reader.onerror = () => {
        showToast("No se pudo leer el archivo.", "error");
        toggleButtonSpinner(uploadBtn, false);
    }
    reader.readAsText(file);
}

