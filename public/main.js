import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, onSnapshot, Timestamp, orderBy, doc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "***REMOVED***",
    authDomain: "***REMOVED***",
    projectId: "***REMOVED***",
    storageBucket: "***REMOVED***.firebasestorage.app",
    messagingSenderId: "***REMOVED***",
    appId: "1:***REMOVED***:web:f57acbf580012df5ef4751",
    measurementId: "***REMOVED***"
};
const appId = 'ventas-pronosticos';

let db, auth, userId, salesCollection;
let salesChart;
let allSalesData = [];
let currentFilter = { type: 'today', date: new Date(), machine: 'all', comparisonDates: [] };

async function initialize() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        onAuthStateChanged(auth, handleAuthState);
    } catch (e) { console.error("Error inicializando Firebase:", e); }
}

async function handleAuthState(user) {
    if (user) {
        userId = user.uid;
        document.getElementById('user-id-display').textContent = userId;
        salesCollection = collection(db, `public_data/${appId}/sales`);
        setupListeners();
    } else {
        try {
            await signInAnonymously(auth);
        } catch (error) { console.error("Error en la autenticación anónima:", error); }
    }
}

function setupListeners() {
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
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') closeEditModal();
    });
    document.getElementById('upload-csv-btn').addEventListener('click', handleCSVUpload);

    const q = query(salesCollection, orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
        allSalesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        applyFiltersAndUpdateUI();
    }, console.error);

    setFilter({ type: 'today' });
}

function setFilter(newFilter) {
    if (newFilter.type) currentFilter.type = newFilter.type;
    if (newFilter.date) currentFilter.date = newFilter.date;
    if (newFilter.machine) currentFilter.machine = newFilter.machine;

    if (currentFilter.type !== 'comparison') {
        document.getElementById('compare-days-btn').classList.add('hidden');
    }

    updateActiveButton(currentFilter.type);
    applyFiltersAndUpdateUI();
}

function applyFiltersAndUpdateUI() {
    let filteredSales = allSalesData;
    if (currentFilter.machine !== 'all') {
        filteredSales = filteredSales.filter(sale => sale.machineId === currentFilter.machine);
    }
    updateTable(filteredSales);
    updateChart(filteredSales);
}

function updateActiveButton(activeType) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('filter-btn-active'));
    if (activeType !== 'comparison' && activeType !== 'custom') {
        const btn = document.getElementById(`filter-${activeType}`);
        if(btn) btn.classList.add('filter-btn-active');
    } else if (activeType === 'comparison') {
        document.getElementById('compare-days-btn').classList.add('filter-btn-active');
    }
}

function addComparisonDate() {
    const dateInput = document.getElementById('date-comparison-input');
    if (!dateInput.value) return;

    const selectedDate = new Date(dateInput.value + 'T00:00:00');
    const dateString = selectedDate.toISOString().split('T')[0];

    if (!currentFilter.comparisonDates.some(d => d.toISOString().split('T')[0] === dateString)) {
        currentFilter.comparisonDates.push(selectedDate);
        renderComparisonPills();
    }
    dateInput.value = '';
}

function renderComparisonPills() {
    const pillsContainer = document.getElementById('comparison-pills');
    pillsContainer.innerHTML = '';
    currentFilter.comparisonDates.forEach(date => {
        const dateString = date.toISOString().split('T')[0];
        const pill = document.createElement('div');
        pill.className = 'date-pill';
        pill.innerHTML = `
            <span>${date.toLocaleDateString('es-MX', { timeZone: 'UTC' })}</span>
            <button data-date="${dateString}" class="remove-pill-btn">&times;</button>
        `;
        pillsContainer.appendChild(pill);
    });
    const compareBtn = document.getElementById('compare-days-btn');
    if (currentFilter.comparisonDates.length > 1) {
        compareBtn.classList.remove('hidden');
    } else {
        compareBtn.classList.add('hidden');
    }
}

function handlePillClick(event) {
    if (event.target.classList.contains('remove-pill-btn')) {
        const dateToRemove = event.target.dataset.date;
        currentFilter.comparisonDates = currentFilter.comparisonDates.filter(d => d.toISOString().split('T')[0] !== dateToRemove);
        renderComparisonPills();
    }
}

async function handleAddSale(event) {
    event.preventDefault();
    const machineId = document.getElementById('machine-id').value;
    const newAccumulatedTotal = parseFloat(document.getElementById('sale-amount').value);
    if (!machineId || isNaN(newAccumulatedTotal) || newAccumulatedTotal < 0) return;

    const today = new Date();
    const lastSaleToday = allSalesData.find(sale => {
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
    await addDoc(salesCollection, { machineId, saleAmount: saleForPeriod, accumulatedTotal: newAccumulatedTotal, timestamp: Timestamp.now(), userId });
    displayFeedback("Venta registrada con éxito.", "success");
    event.target.reset();
}

function handleTableClick(event) {
    const editButton = event.target.closest('.edit-btn');
    if (editButton) openEditModal(editButton.dataset.id);
}

async function handleUpdateSale(event) {
    event.preventDefault();
    const saleId = document.getElementById('edit-sale-id').value;
    const newAccumulatedTotal = parseFloat(document.getElementById('edit-accumulated-total').value);

    const saleToEdit = allSalesData.find(s => s.id === saleId);
    if (!saleToEdit) return displayFeedback("No se encontró el registro.", "error");

    const saleDate = saleToEdit.timestamp.toDate();
    const salesOnThatDay = allSalesData
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
        const batch = writeBatch(db);
        const saleRef = doc(db, salesCollection.path, saleId);
        batch.update(saleRef, { accumulatedTotal: newAccumulatedTotal, saleAmount: newAccumulatedTotal - previousAccumulated });

        if (nextSale) {
            const nextSaleRef = doc(db, salesCollection.path, nextSale.id);
            batch.update(nextSaleRef, { saleAmount: nextSale.accumulatedTotal - newAccumulatedTotal });
        }

        await batch.commit();
        displayFeedback("Registro actualizado con éxito.", "success");
        closeEditModal();
    } catch (error) {
        console.error("Error actualizando registro:", error);
        displayFeedback("Error al guardar los cambios.", "error");
    }
}

async function handleCSVUpload() {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];
    if (!file) return displayFeedback("Por favor, selecciona un archivo CSV.", "error");

    const reader = new FileReader();
    reader.onload = async (event) => {
        const csvText = event.target.result;
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

        try {
            displayFeedback(`Procesando ${lines.length} registros...`, 'success');

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

            const batch = writeBatch(db);
            parsedData.forEach(record => {
                const newDocRef = doc(collection(db, salesCollection.path));
                batch.set(newDocRef, { ...record, userId });
            });

            await batch.commit();
            displayFeedback(`¡${lines.length} registros históricos subidos con éxito!`, 'success');
            fileInput.value = '';
        } catch (e) {
            displayFeedback(`Error procesando el archivo: ${e.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

function openEditModal(saleId) {
    const saleData = allSalesData.find(s => s.id === saleId);
    if (!saleData) return;
    document.getElementById('edit-sale-id').value = saleId;
    document.getElementById('edit-machine-id').textContent = saleData.machineId;
    document.getElementById('edit-timestamp').textContent = saleData.timestamp.toDate().toLocaleString('es-MX');
    document.getElementById('edit-accumulated-total').value = saleData.accumulatedTotal;
    document.getElementById('edit-modal').classList.add('visible');
}
function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('visible');
    document.getElementById('edit-form').reset();
}

function updateTable(sales) {
    const tableBody = document.getElementById('sales-table-body');
    tableBody.innerHTML = '';
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
    tableBody.innerHTML = content || `<tr><td colspan="6" class="text-center p-4 text-gray-500">No hay registros para este filtro.</td></tr>`;
}

function updateChart(salesData) {
    const chartTitleEl = document.getElementById('chart-title');
    let chartConfig;

    if (currentFilter.type === 'comparison') {
        chartTitleEl.textContent = 'Comparación de Ventas por Hora';
        chartConfig = getComparisonChartConfig(salesData);
    } else {
        const targetDate = currentFilter.date;
        const titleMap = { 'today': `Análisis por Hora - ${targetDate.toLocaleDateString('es-MX')}`, 'custom': `Análisis por Hora - ${targetDate.toLocaleDateString('es-MX')}`, 'week': 'Análisis Semanal', 'month': 'Análisis Mensual' };
        chartTitleEl.textContent = titleMap[currentFilter.type] || 'Análisis';
        const configFn = { 'today': getHourlyChartConfig, 'custom': getHourlyChartConfig, 'week': (d, p) => getDailyChartConfig(d, 'week', p), 'month': (d, p) => getDailyChartConfig(d, 'month', p) }[currentFilter.type];
        chartConfig = configFn(salesData, targetDate);
    }

    const ctx = document.getElementById('sales-chart').getContext('2d');
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, chartConfig);
}

function getHourlyChartConfig(salesData, targetDate) {
    const hourlySales = Array(24).fill(0);
    salesData.forEach(sale => {
        const sDate = sale.timestamp.toDate();
        if (sDate.getFullYear() === targetDate.getFullYear() && sDate.getMonth() === targetDate.getMonth() && sDate.getDate() === targetDate.getDate()) {
            hourlySales[sDate.getHours()] += sale.saleAmount;
        }
    });
    return { type: 'bar', data: { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ label: 'Ventas (MXN)', data: hourlySales, backgroundColor: 'rgba(79, 70, 229, 0.5)' }] }, options: getCommonChartOptions() };
}

function getComparisonChartConfig(salesData) {
    const colors = ['rgba(79, 70, 229, 0.8)', 'rgba(219, 39, 119, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)'];
    const datasets = currentFilter.comparisonDates.map((date, index) => {
        const hourlySales = Array(24).fill(0);
        salesData.forEach(sale => {
            const sDate = sale.timestamp.toDate();
            if (sDate.getFullYear() === date.getFullYear() && sDate.getMonth() === date.getMonth() && sDate.getDate() === date.getDate()) {
                hourlySales[sDate.getHours()] += sale.saleAmount;
            }
        });
        return {
            label: `Ventas ${date.toLocaleDateString('es-MX', { timeZone: 'UTC' })}`,
            data: hourlySales,
            borderColor: colors[index % colors.length],
            backgroundColor: 'transparent',
            tension: 0.1,
            fill: false
        };
    });

    return {
        type: 'line',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: datasets
        },
        options: getCommonChartOptions()
    };
}

function getDailyChartConfig(salesData, period, date) {
    const { y, m, d } = { y: date.getFullYear(), m: date.getMonth(), d: date.getDate() };
    let start, end;
    if (period === 'week') {
        const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
        start = new Date(y, m, d - dayOfWeek); end = new Date(y, m, d - dayOfWeek + 6);
    } else {
        start = new Date(y, m, 1); end = new Date(y, m + 1, 0);
    }
    const labels = [], dataPoints = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        labels.push(new Date(dt));
        dataPoints.push(salesData.reduce((sum, s) => {
            const sDate = s.timestamp.toDate();
            return sDate >= dt && sDate < new Date(dt.getTime() + 24 * 60 * 60 * 1000) ? sum + s.saleAmount : sum;
        }, 0));
    }
    return { type: 'line', data: { labels, datasets: [{ label: 'Ventas (MXN)', data: dataPoints, fill: true, backgroundColor: 'rgba(79, 70, 229, 0.5)' }] }, options: getCommonChartOptions(true) };
}

function getCommonChartOptions(isTimeSeries = false) {
    const options = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) } } }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.parsed.y.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) } } } };
    if (isTimeSeries) options.scales.x = { type: 'time', time: { unit: 'day', tooltipFormat: 'PPP', displayFormats: { day: 'dd MMM' } }, adapters: { date: {} } };
    return options;
}

function displayFeedback(message, type) {
    const el = document.getElementById('feedback-message');
    el.textContent = message;
    el.className = `mt-4 text-center font-medium ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    setTimeout(() => el.textContent = '', 4000);
}

window.onload = initialize;
