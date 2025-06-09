import { updateTable, updateChart, renderComparisonPills, updateActiveButton } from './ui.js';
import { auth } from './auth.js';

// Almacena el estado global de la aplicación
let allSalesData = [];
let currentFilter = {
    type: 'today',
    date: new Date(),
    machine: 'all',
    comparisonDates: []
};

// --- GETTERS (para acceder al estado desde otros módulos) ---
export const getAllSales = () => allSalesData;
export const getUserId = () => auth?.currentUser?.uid;
export const getState = () => ({ allSalesData, currentFilter });

// --- SETTERS y Lógica de Estado ---

// Actualiza los datos de ventas y refresca la UI
export function setAllSales(sales) {
    allSalesData = sales;
}

// Actualiza el filtro actual y refresca la UI
export function setFilter(newFilter) {
    if (newFilter.type && newFilter.type !== 'custom' && newFilter.type !== 'comparison') {
        currentFilter.type = newFilter.type;
        currentFilter.date = new Date();
    } else if (newFilter.type) {
        currentFilter.type = newFilter.type;
    }
    if (newFilter.date) {
        currentFilter.date = newFilter.date;
    }
    if (newFilter.machine) {
        currentFilter.machine = newFilter.machine;
    }
    
    updateActiveButton(currentFilter.type);
    applyFiltersAndUpdateUI(allSalesData);
}

// Aplica los filtros a los datos y actualiza la tabla y la gráfica
export function applyFiltersAndUpdateUI(sales) {
    setAllSales(sales);
    let filteredSales = allSalesData;
    if (currentFilter.machine !== 'all') {
        filteredSales = filteredSales.filter(sale => sale.machineId === currentFilter.machine);
    }
    updateTable(filteredSales);
    updateChart(filteredSales, currentFilter);
}

// Lógica para el modo de comparación
export function addComparisonDate() {
    const dateInput = document.getElementById('date-comparison-input');
    if (!dateInput.value) return;
    const selectedDate = new Date(dateInput.value + 'T00:00:00');
    const dateString = selectedDate.toISOString().split('T')[0];

    if (!currentFilter.comparisonDates.some(d => d.toISOString().split('T')[0] === dateString)) {
        currentFilter.comparisonDates.push(selectedDate);
        renderComparisonPills(currentFilter.comparisonDates);
    }
    dateInput.value = '';
}

export function handlePillClick(event) {
    if (event.target.classList.contains('remove-pill-btn')) {
        const dateToRemove = event.target.dataset.date;
        currentFilter.comparisonDates = currentFilter.comparisonDates.filter(d => d.toISOString().split('T')[0] !== dateToRemove);
        renderComparisonPills(currentFilter.comparisonDates);
    }
}
