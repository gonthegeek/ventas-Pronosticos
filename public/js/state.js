import { updateTable, updateChart, renderComparisonPills, updateActiveButton } from './ui.js';
import { auth } from './auth.js';

let _state = {};

function getInitialState() {
    return {
        allSalesData: [],
        currentFilter: {
            type: 'today',
            date: new Date(),
            machine: 'all',
            comparisonDates: []
        }
    };
}

export function initializeState() {
    _state = getInitialState();
}

export const getState = () => _state;
export const getAllSales = () => _state.allSalesData;
export const getUserId = () => auth?.currentUser?.uid;

export function setFilter(newFilter) {
    if (newFilter.type && newFilter.type !== 'custom' && newFilter.type !== 'comparison') {
        _state.currentFilter.type = newFilter.type;
        _state.currentFilter.date = new Date();
    } else if (newFilter.type) {
        _state.currentFilter.type = newFilter.type;
    }
    if (newFilter.date) {
        _state.currentFilter.date = newFilter.date;
    }
    if (newFilter.machine) {
        _state.currentFilter.machine = newFilter.machine;
    }
    updateActiveButton(_state.currentFilter.type);
    applyFiltersAndUpdateUI(_state.allSalesData);
}

export function applyFiltersAndUpdateUI(sales) {
    _state.allSalesData = sales;
    let filteredSales = _state.allSalesData;
    if (_state.currentFilter.machine !== 'all') {
        filteredSales = filteredSales.filter(sale => sale.machineId === _state.currentFilter.machine);
    }
    updateTable(filteredSales);
    updateChart(filteredSales, _state.currentFilter);
}

export function addComparisonDate() {
    const dateInput = document.getElementById('date-comparison-input');
    if (!dateInput.value) return;
    const selectedDate = new Date(dateInput.value + 'T00:00:00');
    const dateString = selectedDate.toISOString().split('T')[0];

    if (!_state.currentFilter.comparisonDates.some(d => d.toISOString().split('T')[0] === dateString)) {
        _state.currentFilter.comparisonDates.push(selectedDate);
        renderComparisonPills(_state.currentFilter.comparisonDates);
    }
    dateInput.value = '';
}

export function handlePillClick(event) {
    if (event.target.classList.contains('remove-pill-btn')) {
        const dateToRemove = event.target.dataset.date;
        _state.currentFilter.comparisonDates = _state.currentFilter.comparisonDates.filter(d => d.toISOString().split('T')[0] !== dateToRemove);
        renderComparisonPills(_state.currentFilter.comparisonDates);
    }
}

initializeState();
