import { updateTable, updateChart, renderComparisonPills, updateActiveButton, toggleGlobalLoader } from './ui.js';
import { subscribeToSalesData } from './core/api.js';
import { auth } from './auth.js';

let allSalesData = [];
let isAuthenticated = false;
let currentFilter = {
    type: 'today',
    date: new Date(),
    machine: 'all',
    comparisonDates: []
};

export const getAllSales = () => allSalesData;
export const getUserId = () => auth?.currentUser?.uid;
export const getDateRange = () => calculateDateRange();
export const getCurrentFilter = () => currentFilter;

export const setIsAuthenticated = (status) => { isAuthenticated = status; };
export const getIsAuthenticated = () => isAuthenticated;

function calculateDateRange() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (currentFilter.type) {
        case 'week': {
            const firstDayOfWeek = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
            const startDate = new Date(today.setDate(firstDayOfWeek));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
            return { startDate, endDate };
        }
        case 'month': {
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Corregido: primer día del siguiente mes
            return { startDate, endDate };
        }
        case 'comparison': {
            if (currentFilter.comparisonDates.length === 0) {
                 const tomorrow = new Date(today);
                 tomorrow.setDate(tomorrow.getDate() + 1);
                 return { startDate: today, endDate: tomorrow };
            }
            const sortedDates = [...currentFilter.comparisonDates].sort((a,b) => a - b);
            const startDate = sortedDates[0];
            const endDate = new Date(sortedDates[sortedDates.length - 1]);
            endDate.setDate(endDate.getDate() + 1);
            return { startDate, endDate };
        }
        default: { // 'today' or 'custom'
            const date = currentFilter.date;
            const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            return { startDate, endDate };
        }
    }
}

export function setFilter(newFilter) {
    // Si se aplica un filtro de tipo (hoy, semana, mes), reseteamos la fecha a la actual.
    if (newFilter.type && newFilter.type !== 'custom' && newFilter.type !== 'comparison') {
        currentFilter.date = new Date();
    }
    // Asignamos los nuevos valores de filtro al estado actual
    Object.assign(currentFilter, newFilter);
    
    updateActiveButton(currentFilter.type);
    
    const { startDate, endDate } = calculateDateRange();
    
    // Use the new API with proper callbacks
    subscribeToSalesData(
        startDate, 
        endDate,
        (salesData) => {
            applyFiltersAndUpdateUI(salesData);
            toggleGlobalLoader(false);
        },
        (error) => {
            console.error("Error in subscription:", error);
            toggleGlobalLoader(false);
        }
    );
}

export function triggerRefetch() {
    setFilter({}); // Llama a setFilter sin argumentos para usar el filtro actual
}

export function applyFiltersAndUpdateUI(sales) {
    allSalesData = sales;
    let filteredSales = allSalesData;
    if (currentFilter.machine !== 'all') {
        filteredSales = filteredSales.filter(sale => sale.machineId === currentFilter.machine);
    }
    updateTable(filteredSales);
    updateChart(filteredSales, currentFilter);
}

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