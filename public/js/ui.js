import { updateChartConfig } from './chart-config.js';
import { getAllSales } from './state.js';

// Add references to login form and main content elements
const elements = {
    globalLoader: document.getElementById('global-loader'),
    loginFormContainer: document.getElementById('login-form-container'), // Assuming you wrap your form in a div with this ID
    toastContainer: document.getElementById('toast-container'),
    userIdDisplay: document.getElementById('user-id-display'),
    tableBody: document.getElementById('sales-table-body'),
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    editSaleId: document.getElementById('edit-sale-id'),
    editMachineId: document.getElementById('edit-machine-id'),
    editSaleDate: document.getElementById('edit-sale-date'),
    editSaleTime: document.getElementById('edit-sale-time'),
    editAccumulatedTotal: document.getElementById('edit-accumulated-total'),
    comparisonPills: document.getElementById('comparison-pills'),
    compareDaysBtn: document.getElementById('compare-days-btn'),
    confirmModal: document.getElementById('confirm-modal'),
    cancelConfirmBtn: document.getElementById('cancel-confirm'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    mainContent: document.getElementById('main-content'), // Assuming your main app content is in a div with this ID
};

export function toggleGlobalLoader(show) {
    elements.globalLoader.classList.toggle('hidden', !show);
}

export function toggleButtonSpinner(button, show) {
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.btn-spinner');
    if (show) {
        button.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        button.disabled = false;
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

export function updateUserIdDisplay(uid) {
    elements.userIdDisplay.textContent = uid;
}

export function showLoginForm() {
    elements.loginFormContainer.classList.remove('hidden');
    elements.mainContent.classList.add('hidden');
}

export function showMainContent() {
    elements.loginFormContainer.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');
}

export function updateTable(sales) {
    elements.tableBody.innerHTML = '';
    const content = sales.slice(0, 50).map(sale => {
        const saleDate = sale.timestamp.toDate();
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.machineId}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">${sale.saleAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${sale.accumulatedTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${saleDate.toLocaleDateString('es-MX')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${saleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                    <button class="edit-btn p-1 text-indigo-600 hover:text-indigo-900" data-id="${sale.id}" aria-label="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </button>
                     <button class="delete-btn p-1 text-red-600 hover:text-red-900" data-id="${sale.id}" aria-label="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    elements.tableBody.innerHTML = content || `<tr><td colspan="6" class="text-center p-4 text-gray-500">No hay registros para este filtro.</td></tr>`;
}

export function updateChart(salesData, currentFilter) {
    updateChartConfig(salesData, currentFilter);
}

export function openEditModal(saleId) {
    const allSales = getAllSales();
    const saleData = allSales.find(s => s.id === saleId);
    if (!saleData) return;
    
    const saleDate = saleData.timestamp.toDate();
    const yyyy = saleDate.getFullYear();
    const mm = String(saleDate.getMonth() + 1).padStart(2, '0');
    const dd = String(saleDate.getDate()).padStart(2, '0');
    const hh = String(saleDate.getHours()).padStart(2, '0');
    const min = String(saleDate.getMinutes()).padStart(2, '0');

    elements.editSaleId.value = saleId;
    elements.editMachineId.textContent = saleData.machineId;
    elements.editSaleDate.value = `${yyyy}-${mm}-${dd}`;
    elements.editSaleTime.value = `${hh}:${min}`;
    elements.editAccumulatedTotal.value = saleData.accumulatedTotal;
    elements.editModal.classList.add('visible');
}

export function closeEditModal() {
    elements.editModal.classList.remove('visible');
    elements.editForm.reset();
}

export function openConfirmModal(onConfirm) {
    elements.confirmModal.classList.add('visible');

    const confirmBtn = elements.confirmDeleteBtn;
    const cancelBtn = elements.cancelConfirmBtn;

    const confirmListener = () => {
        onConfirm();
        closeConfirmModal();
    };

    const closeListener = () => {
        closeConfirmModal();
    };

    const closeConfirmModal = () => {
        elements.confirmModal.classList.remove('visible');
        confirmBtn.removeEventListener('click', confirmListener);
        cancelBtn.removeEventListener('click', closeListener);
    };

    confirmBtn.addEventListener('click', confirmListener, { once: true });
    cancelBtn.addEventListener('click', closeListener, { once: true });
}

export function renderComparisonPills(comparisonDates) {
    elements.comparisonPills.innerHTML = '';
    comparisonDates.forEach(date => {
        const dateString = date.toISOString().split('T')[0];
        const pill = document.createElement('div');
        pill.className = 'date-pill';
        pill.innerHTML = `
            <span>${date.toLocaleDateString('es-MX', { timeZone: 'UTC' })}</span>
            <button data-date="${dateString}" class="remove-pill-btn">&times;</button>
        `;
        elements.comparisonPills.appendChild(pill);
    });

    if (comparisonDates.length > 1) {
        elements.compareDaysBtn.classList.remove('hidden');
    } else {
        elements.compareDaysBtn.classList.add('hidden');
    }
}

export function updateActiveButton(activeType) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('filter-btn-active'));
    const compareBtn = document.getElementById('compare-days-btn');
    if (activeType === 'comparison') {
        compareBtn?.classList.add('filter-btn-active');
    } else {
        compareBtn?.classList.remove('filter-btn-active');
        const activeBtn = document.getElementById(`filter-${activeType}`);
        if(activeBtn) activeBtn.classList.add('filter-btn-active');
    }
}

export function showToast(message, type = 'info') {
    const toastColors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const toastIcons = {
        success: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>`,
        error: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`,
        info: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`
    };
    const toast = document.createElement('div');
    toast.className = `flex items-center p-4 w-full max-w-xs text-white ${toastColors[type]} rounded-lg shadow-lg transform transition-all duration-300 opacity-0`;
    toast.innerHTML = `
        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">${toastIcons[type]}</div>
        <div class="ml-3 text-sm font-normal"></div>
        <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-white bg-opacity-20 text-white rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-opacity-30 inline-flex h-8 w-8">
            <span class="sr-only">Cerrar</span>
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
        </button>
    `;
    // Set the message as plain text (prevents HTML injection)
    toast.querySelector('.ml-3').textContent = message;

    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    const removeToast = () => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector('button').addEventListener('click', removeToast);
    setTimeout(removeToast, 5000);
}

// Function to display authentication error messages
export function displayAuthError(message) {
    // Find or create an element to display errors within the login form
    let errorElement = document.getElementById('auth-error-message');
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.id = 'auth-error-message';
        elements.loginFormContainer.appendChild(errorElement); // Or a more specific error container
    }
    errorElement.textContent = message;
}
