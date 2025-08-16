import { addSale, batchUpdateSales, deleteSaleAndUpdate, fetchAllSalesPaginated } from './api.js';
import { setFilter, addComparisonDate, handlePillClick, getAllSales, triggerRefetch } from './state.js';
import { openEditModal, closeEditModal, showToast, toggleButtonSpinner, openConfirmModal, displayAuthError } from './ui.js';
import { 
    parseCSVAndCalculateSales, 
    recalculateSalesForDay, 
    generateAndDownloadBackups, 
    normalizeSalesForExport, 
    buildImportCompatibleCSV, 
    downloadTextFile,
    sanitizeInput,
    validateMachineId,
    validateSaleAmount,
    validateEmail
} from './utils.js';
import { Timestamp } from './firebase-firestore-wrapper.js';
import { signInWithEmail, auth } from './auth.js';

// --- MANEJADORES DE EVENTOS (EXPORTADOS PARA TESTING) ---

export async function handleAddSale(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('add-sale-btn');
    toggleButtonSpinner(submitBtn, true);
    try {
        const machineIdInput = document.getElementById('machine-id').value;
        const saleAmountInput = document.getElementById('sale-amount').value;
        
        // Sanitize and validate inputs
        const machineId = sanitizeInput(machineIdInput);
        const newAccumulatedTotal = parseFloat(sanitizeInput(saleAmountInput));
        
        if (!machineId || !validateMachineId(machineId)) {
            throw new Error("ID de máquina inválido.");
        }
        
        if (!validateSaleAmount(newAccumulatedTotal)) {
            throw new Error("Monto de venta inválido.");
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
        triggerRefetch();
    } catch (e) {
        showToast(e.message, "error");
        console.error(e);
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
            return s.machineId === saleToDelete.machineId && d.getFullYear() === saleDate.getFullYear() && d.getMonth() === saleDate.getMonth() && d.getDate() === saleDate.getDate();
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
        console.error(e);
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

        if (!newDateStr || !newTimeStr || isNaN(newTotal)) throw new Error("Datos inválidos.");

        const [year, month, day] = newDateStr.split('-').map(Number);
        const [hour, minute] = newTimeStr.split(':').map(Number);
        const newDate = new Date(year, month - 1, day, hour, minute);
        const newTimestamp = Timestamp.fromDate(newDate);

        const allSales = getAllSales();
        const saleToEdit = allSales.find(s => s.id === saleId);
        if (!saleToEdit) throw new Error("No se encontró el registro.");

        const originalDate = saleToEdit.timestamp.toDate();
        // Convertimos todos los timestamps a fechas JS para una manipulación segura.
        const tempSales = allSales.map(s => ({ ...s, timestamp: s.timestamp.toDate() }));
        const saleToUpdateInMemory = tempSales.find(s => s.id === saleId);

        // Aplicamos los cambios al objeto en memoria.
        saleToUpdateInMemory.timestamp = newDate;
        saleToUpdateInMemory.accumulatedTotal = newTotal;

        const updates = [];
        // Si la fecha del registro cambió, recalculamos el día original (ahora sin el registro movido).
        if (originalDate.toDateString() !== newDate.toDateString()) {
            const originalDayRecalculations = recalculateSalesForDay(tempSales, saleToEdit.machineId, originalDate);
            updates.push(...originalDayRecalculations);
        }

        // Siempre recalculamos el día de destino del registro.
        const newDayRecalculations = recalculateSalesForDay(tempSales, saleToEdit.machineId, newDate);
        updates.push(...newDayRecalculations);

        // Combinamos las actualizaciones y eliminamos duplicados.
        const finalUpdatesMap = new Map();
        updates.forEach(u => {
            // Convertimos la fecha de JS de nuevo a Timestamp de Firebase antes de guardar.
            u.data.timestamp = Timestamp.fromDate(u.data.timestamp);
            finalUpdatesMap.set(u.id, u.data)
        });
        const finalUpdates = Array.from(finalUpdatesMap.entries()).map(([id, data]) => ({ id, data }));

        await batchUpdateSales(finalUpdates);
        showToast("Registro actualizado con éxito.", "success");
        closeEditModal();
        triggerRefetch();

    } catch (error) {
        showToast(error.message, "error");
        console.error(error);
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
            await uploadHistoricalData(records);
            showToast(`¡${records.length} registros históricos subidos con éxito!`, 'success');
            fileInput.value = '';
            triggerRefetch();
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

// Export visible (currently loaded & filtered) sales to CSV & JSON
export function handleExportCSV() {
    try {
        const sales = getAllSales();
        if (!sales.length) {
            showToast('No hay datos para exportar con el filtro actual.', 'info');
            return;
        }
        generateAndDownloadBackups(sales);
        showToast('Exportación iniciada (CSV y JSON).', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error al exportar los datos.', 'error');
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
    const normalized = normalizeSalesForExport(all);
    const csv = buildImportCompatibleCSV(normalized);
    const stamp = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
    downloadTextFile(`ventas-historico-${stamp}.csv`, csv);
    showToast(`Exportados ${normalized.length} registros (CSV compatible).`, 'success');
    } catch (e) {
        console.error(e);
        showToast('Error al exportar el histórico.', 'error');
    }
}

// Function to handle login form submission
export async function handleLoginSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    // Correctly get the submit button using a more specific selector
    const submitBtn = document.querySelector('#login-form button[type="submit"]');

    // Check if the submit button was found before calling toggleButtonSpinner
    if (submitBtn) {
        toggleButtonSpinner(submitBtn, true); // Show spinner on the login button
    } else {
        console.warn("Login submit button not found."); // Log a warning if the button is not found
    }

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    const emailValue = emailInput.value;
    const passwordValue = passwordInput.value;
    
    // Sanitize and validate inputs
    const email = sanitizeInput(emailValue);
    const password = sanitizeInput(passwordValue);
    
    // Validate email format
    if (!validateEmail(email)) {
        displayAuthError('Formato de correo electrónico inválido');
        showToast('Formato de correo electrónico inválido', 'error');
        if (submitBtn) toggleButtonSpinner(submitBtn, false);
        return;
    }
    
    // Validate password length (basic security)
    if (!password || password.length < 6 || password.length > 100) {
        displayAuthError('La contraseña debe tener entre 6 y 100 caracteres');
        showToast('La contraseña debe tener entre 6 y 100 caracteres', 'error');
        if (submitBtn) toggleButtonSpinner(submitBtn, false);
        return;
    }

    try {
        await signInWithEmail(email, password);
        // onAuthStateChanged in auth.js will handle showing the main content on success.
        // showToast("Login successful!", "success"); // Optional: show a success toast
        displayAuthError(''); // Clear any previous error messages

    } catch (error) {
        console.error("Login error:", error);
        // Display the error message to the user (sanitized)
        const errorMsg = sanitizeInput(error.message || 'Error de autenticación');
        displayAuthError(`Error al iniciar sesión: ${errorMsg}`);
        showToast(`Error al iniciar sesión: ${errorMsg}`, "error"); // Also show a toast

    } finally {
        // Turn off the spinner regardless of success or failure, only if button was found
        if (submitBtn) {
            toggleButtonSpinner(submitBtn, false);
        }
    }
}

// Function to handle logout
export async function handleLogout() {
    try {
        await auth.signOut();
        // onAuthStateChanged in auth.js will handle showing the login form on logout
        showToast("Sesión cerrada con éxito.", "success");
    } catch (error) {
        console.error("Error logging out:", error);
        showToast(`Error al cerrar sesión: ${error.message}`, "error");
    }
}

// --- CONFIGURACIÓN DE LISTENERS (NO SE EXPORTA) ---

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



export function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLoginSubmit); // Add event listener for login form
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
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) exportBtn.addEventListener('click', handleExportCSV);
    const exportAllBtn = document.getElementById('export-all-btn');
    if (exportAllBtn) exportAllBtn.addEventListener('click', handleExportAll);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') closeEditModal();
    });
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    } else {
        console.warn("Logout button not found.");
    }
}