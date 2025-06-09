import { updateChartConfig } from './chart-config.js';
import { getAllSales } from './state.js';

// --- Selectores del DOM ---
const elements = {
    userIdDisplay: document.getElementById('user-id-display'),
    tableBody: document.getElementById('sales-table-body'),
    feedbackMessage: document.getElementById('feedback-message'),
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    editSaleId: document.getElementById('edit-sale-id'),
    editMachineId: document.getElementById('edit-machine-id'),
    editTimestamp: document.getElementById('edit-timestamp'),
    editAccumulatedTotal: document.getElementById('edit-accumulated-total'),
    comparisonPills: document.getElementById('comparison-pills'),
    compareDaysBtn: document.getElementById('compare-days-btn'),
};

export function updateUserIdDisplay(uid) {
    elements.userIdDisplay.textContent = uid;
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button class="edit-btn p-1 text-indigo-600 hover:text-indigo-900" data-id="${sale.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
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
    elements.editSaleId.value = saleId;
    elements.editMachineId.textContent = saleData.machineId;
    elements.editTimestamp.textContent = saleData.timestamp.toDate().toLocaleString('es-MX');
    elements.editAccumulatedTotal.value = saleData.accumulatedTotal;
    elements.editModal.classList.add('visible');
}

export function closeEditModal() {
    elements.editModal.classList.remove('visible');
    elements.editForm.reset();
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

export function displayFeedback(message, type) {
    elements.feedbackMessage.textContent = message;
    elements.feedbackMessage.className = `mt-4 text-center font-medium ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    setTimeout(() => elements.feedbackMessage.textContent = '', 4000);
}
