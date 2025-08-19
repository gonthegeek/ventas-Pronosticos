/**
 * Hourly Sales Events Module
 * Migrated from events.js - handles all events specific to hourly sales functionality
 * Implements SRS Functionality #1: Ventas por hora
 */

import { addSale, batchUpdateSales, deleteSaleAndUpdate, fetchAllSalesPaginated, uploadHistoricalData } from '../../core/api.js';
import { setFilter, addComparisonDate, handlePillClick, getAllSales, triggerRefetch } from '../../state.js';
import { openEditModal, closeEditModal, showToast, toggleButtonSpinner, openConfirmModal } from '../../ui.js';
import { 
    parseCSVAndCalculateSales, 
    recalculateSalesForDay, 
    generateAndDownloadBackups, 
    sanitizeInput,
    validateMachineId,
    validateSaleAmount
} from '../../utils.js';
import { Timestamp } from '../../firebase-firestore-wrapper.js';

/**
 * Hourly Sales Event Handlers
 * Based on SRS.json Functionality #1: Ventas por hora
 * Fields: ["fecha (YYYY-MM-DD)", "hora (HH:mm)", "máquina", "venta"]
 */

export async function handleAddSale(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('add-sale-btn');
    toggleButtonSpinner(submitBtn, true);
    
    try {
        const machineIdInput = document.getElementById('machine-id').value;
        const saleAmountInput = document.getElementById('sale-amount').value;
        
        // Sanitize and validate inputs according to SRS requirements
        const machineId = sanitizeInput(machineIdInput);
        const newAccumulatedTotal = parseFloat(sanitizeInput(saleAmountInput));
        
        if (!machineId || !validateMachineId(machineId)) {
            throw new Error("ID de máquina inválido.");
        }
        
        if (!validateSaleAmount(newAccumulatedTotal)) {
            throw new Error("Monto de venta inválido.");
        }
        
        // Calculate sale amount for the period (SRS requirement)
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
        
        // Prepare data according to SRS format
        const saleData = {
            machineId,
            saleAmount: saleForPeriod,
            accumulatedTotal: newAccumulatedTotal,
            // SRS fields will be auto-calculated from timestamp
            date: today.toISOString().split('T')[0], // YYYY-MM-DD format
            hour: today.toTimeString().substring(0, 5) // HH:mm format
        };
        
        await addSale(saleData);
        showToast("Venta registrada con éxito.", "success");
        event.target.reset();
        triggerRefetch();
        
    } catch (e) {
        showToast(e.message, "error");
        console.error('Error adding sale:', e);
    } finally {
        toggleButtonSpinner(submitBtn, false);
    }
}

export async function handleDeleteSale(saleId) {
    const allSales = getAllSales();
    const saleToDelete = allSales.find(s => s.id === saleId);
    if (!saleToDelete) return showToast("No se encontró el registro para eliminar.", "error");

    const saleDate = saleToDelete.timestamp.toDate();
    const salesOnThatDay = allSales
        .filter(s => {
            const d = s.timestamp.toDate();
            return s.machineId === saleToDelete.machineId && 
                   d.getFullYear() === saleDate.getFullYear() && 
                   d.getMonth() === saleDate.getMonth() && 
                   d.getDate() === saleDate.getDate();
        })
        .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

    const saleIndexInDay = salesOnThatDay.findIndex(s => s.id === saleId);
    const previousSale = saleIndexInDay > 0 ? salesOnThatDay[saleIndexInDay - 1] : null;
    const nextSale = saleIndexInDay < salesOnThatDay.length - 1 ? salesOnThatDay[saleIndexInDay + 1] : null;

    let nextSaleUpdate = null;
    if (nextSale) {
        const previousTotal = previousSale ? previousSale.accumulatedTotal : 0;
        nextSaleUpdate = {
            id: nextSale.id,
            saleAmount: nextSale.accumulatedTotal - previousTotal
        };
    }

    try {
        await deleteSaleAndUpdate(saleId, nextSaleUpdate);
        showToast("Registro eliminado con éxito.", "success");
        triggerRefetch();
    } catch (e) {
        showToast("Error al eliminar el registro.", "error");
        console.error('Error deleting sale:', e);
    }
}

export async function handleUpdateSale(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('save-edit-btn');
    toggleButtonSpinner(submitBtn, true);

    try {
        const saleId = document.getElementById('edit-sale-id').value;
        const newTotal = parseFloat(document.getElementById('edit-accumulated-total').value);
        const newDateStr = document.getElementById('edit-sale-date').value;
        const newTimeStr = document.getElementById('edit-sale-time').value;

        if (!newDateStr || !newTimeStr || isNaN(newTotal)) {
            throw new Error("Datos inválidos.");
        }

        const [year, month, day] = newDateStr.split('-').map(Number);
        const [hour, minute] = newTimeStr.split(':').map(Number);
        const newDate = new Date(year, month - 1, day, hour, minute);
        const newTimestamp = Timestamp.fromDate(newDate);

        const allSales = getAllSales();
        const saleToEdit = allSales.find(s => s.id === saleId);
        if (!saleToEdit) throw new Error("No se encontró el registro.");

        const originalDate = saleToEdit.timestamp.toDate();
        const tempSales = allSales.map(s => ({ ...s, timestamp: s.timestamp.toDate() }));
        const saleToUpdateInMemory = tempSales.find(s => s.id === saleId);

        // Apply changes to in-memory object
        saleToUpdateInMemory.timestamp = newDate;
        saleToUpdateInMemory.accumulatedTotal = newTotal;
        // Update SRS fields
        saleToUpdateInMemory.date = newDate.toISOString().split('T')[0];
        saleToUpdateInMemory.hour = newDate.toTimeString().substring(0, 5);

        const updates = [];
        
        // If date changed, recalculate original day
        if (originalDate.toDateString() !== newDate.toDateString()) {
            const originalDayRecalculations = recalculateSalesForDay(tempSales, saleToEdit.machineId, originalDate);
            updates.push(...originalDayRecalculations);
        }

        // Always recalculate destination day
        const newDayRecalculations = recalculateSalesForDay(tempSales, saleToEdit.machineId, newDate);
        updates.push(...newDayRecalculations);

        // Combine updates and remove duplicates
        const finalUpdatesMap = new Map();
        updates.forEach(u => {
            u.data.timestamp = Timestamp.fromDate(u.data.timestamp);
            // Ensure SRS fields are updated
            if (u.data.timestamp) {
                const date = u.data.timestamp.toDate();
                u.data.date = date.toISOString().split('T')[0];
                u.data.hour = date.toTimeString().substring(0, 5);
            }
            finalUpdatesMap.set(u.id, u.data);
        });
        
        const finalUpdates = Array.from(finalUpdatesMap.entries()).map(([id, data]) => ({ id, data }));

        await batchUpdateSales(finalUpdates);
        showToast("Registro actualizado con éxito.", "success");
        closeEditModal();
        triggerRefetch();

    } catch (error) {
        showToast(error.message, "error");
        console.error('Error updating sale:', error);
    } finally {
        toggleButtonSpinner(submitBtn, false);
    }
}

export async function handleCSVUpload() {
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
            
            // Add SRS fields to each record
            const enhancedRecords = records.map(record => {
                const date = record.timestamp.toDate();
                return {
                    ...record,
                    date: date.toISOString().split('T')[0], // YYYY-MM-DD
                    hour: date.toTimeString().substring(0, 5) // HH:mm
                };
            });
            
            await uploadHistoricalData(enhancedRecords);
            showToast(`¡${records.length} registros históricos subidos con éxito!`, 'success');
            fileInput.value = '';
            triggerRefetch();
            
        } catch (e) {
            showToast(`Error procesando el archivo: ${e.message}`, 'error');
            console.error('Error uploading CSV:', e);
        } finally {
            toggleButtonSpinner(uploadBtn, false);
        }
    };
    
    reader.onerror = () => {
        showToast("No se pudo leer el archivo.", "error");
        toggleButtonSpinner(uploadBtn, false);
    };
    
    reader.readAsText(file);
}

export function handleExportCSV() {
    try {
        const sales = getAllSales();
        if (!sales.length) {
            showToast('No hay datos para exportar con el filtro actual.', 'info');
            return;
        }
        
        const result = generateAndDownloadBackups(sales);
        
        if (result.skippedRecords > 0) {
            showToast(`Exportación completada. ${result.exportedRecords} registros exportados, ${result.skippedRecords} registros omitidos por datos inválidos.`, 'warning');
        } else {
            showToast(`Exportación completada exitosamente. ${result.exportedRecords} registros exportados.`, 'success');
        }
    } catch (e) {
        console.error('Error during export:', e);
        showToast(e.message || 'Error al exportar los datos.', 'error');
    }
}

export async function handleExportAll() {
    try {
        showToast('Preparando exportación completa...', 'info');
        const all = await fetchAllSalesPaginated();
        if (!all.length) {
            showToast('No hay registros para exportar.', 'info');
            return;
        }
        
        const result = generateAndDownloadBackups(all);
        
        if (result.skippedRecords > 0) {
            showToast(`Exportación completa finalizada. ${result.exportedRecords} registros exportados, ${result.skippedRecords} registros omitidos por datos inválidos.`, 'warning');
        } else {
            showToast(`Exportación completa exitosa. ${result.exportedRecords} registros históricos exportados.`, 'success');
        }
    } catch (e) {
        console.error('Error exporting all:', e);
        showToast('Error al exportar el histórico.', 'error');
    }
}

/**
 * Setup event listeners specific to hourly sales
 * This function should be called when the hourly sales module is active
 */
export function setupHourlySalesEventListeners() {
    console.log('⏰ Setting up hourly sales event listeners...');
    
    // Sales form
    const saleForm = document.getElementById('sale-form');
    if (saleForm) {
        saleForm.removeEventListener('submit', handleAddSale); // Remove if exists
        saleForm.addEventListener('submit', handleAddSale);
    }
    
    // CSV upload
    const uploadBtn = document.getElementById('upload-csv-btn');
    if (uploadBtn) {
        uploadBtn.removeEventListener('click', handleCSVUpload);
        uploadBtn.addEventListener('click', handleCSVUpload);
    }
    
    // Edit form
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.removeEventListener('submit', handleUpdateSale);
        editForm.addEventListener('submit', handleUpdateSale);
    }
    
    // Filter buttons
    const filterToday = document.getElementById('filter-today');
    if (filterToday) {
        filterToday.removeEventListener('click', () => setFilter({ type: 'today' }));
        filterToday.addEventListener('click', () => setFilter({ type: 'today' }));
    }
    
    const filterWeek = document.getElementById('filter-week');
    if (filterWeek) {
        filterWeek.removeEventListener('click', () => setFilter({ type: 'week' }));
        filterWeek.addEventListener('click', () => setFilter({ type: 'week' }));
    }
    
    const filterMonth = document.getElementById('filter-month');
    if (filterMonth) {
        filterMonth.removeEventListener('click', () => setFilter({ type: 'month' }));
        filterMonth.addEventListener('click', () => setFilter({ type: 'month' }));
    }
    
    // Machine filter
    const machineFilter = document.getElementById('machine-filter');
    if (machineFilter) {
        machineFilter.removeEventListener('change', e => setFilter({ machine: e.target.value }));
        machineFilter.addEventListener('change', e => setFilter({ machine: e.target.value }));
    }
    
    // Comparison features
    const addComparisonBtn = document.getElementById('add-comparison-date');
    if (addComparisonBtn) {
        addComparisonBtn.removeEventListener('click', addComparisonDate);
        addComparisonBtn.addEventListener('click', addComparisonDate);
    }
    
    const comparisonPills = document.getElementById('comparison-pills');
    if (comparisonPills) {
        comparisonPills.removeEventListener('click', handlePillClick);
        comparisonPills.addEventListener('click', handlePillClick);
    }
    
    const compareDaysBtn = document.getElementById('compare-days-btn');
    if (compareDaysBtn) {
        compareDaysBtn.removeEventListener('click', () => setFilter({ type: 'comparison' }));
        compareDaysBtn.addEventListener('click', () => setFilter({ type: 'comparison' }));
    }
    
    // Table events (edit/delete)
    const salesTableBody = document.getElementById('sales-table-body');
    if (salesTableBody) {
        salesTableBody.removeEventListener('click', handleTableClick);
        salesTableBody.addEventListener('click', handleTableClick);
    }
    
    // Export buttons
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.removeEventListener('click', handleExportCSV);
        exportBtn.addEventListener('click', handleExportCSV);
    }
    
    const exportAllBtn = document.getElementById('export-all-btn');
    if (exportAllBtn) {
        exportAllBtn.removeEventListener('click', handleExportAll);
        exportAllBtn.addEventListener('click', handleExportAll);
    }
    
    // Modal events
    const cancelEdit = document.getElementById('cancel-edit');
    if (cancelEdit) {
        cancelEdit.removeEventListener('click', closeEditModal);
        cancelEdit.addEventListener('click', closeEditModal);
    }
    
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.removeEventListener('click', handleModalClick);
        editModal.addEventListener('click', handleModalClick);
    }
    
    console.log('✅ Hourly sales event listeners setup complete');
}

function handleTableClick(event) {
    const editButton = event.target.closest('.edit-btn');
    const deleteButton = event.target.closest('.delete-btn');

    if (editButton) {
        openEditModal(editButton.dataset.id);
    } else if (deleteButton) {
        openConfirmModal(
            () => handleDeleteSale(deleteButton.dataset.id)
        );
    }
}

function handleModalClick(e) {
    if (e.target.id === 'edit-modal') {
        closeEditModal();
    }
}

/**
 * Cleanup hourly sales event listeners
 */
export function cleanupHourlySalesEventListeners() {
    console.log('⏰ Cleaning up hourly sales event listeners...');
    
    // Note: In a real cleanup, you would store references to the actual event handler functions
    // and remove them properly. For now, this serves as a placeholder for the cleanup logic.
    
    console.log('✅ Hourly sales event listeners cleanup complete');
}
