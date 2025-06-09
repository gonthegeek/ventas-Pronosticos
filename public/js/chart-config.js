let salesChart;

export function updateChartConfig(salesData, currentFilter) {
    const chartTitleEl = document.getElementById('chart-title');
    let chartConfig;

    if (currentFilter.type === 'comparison') {
        chartTitleEl.textContent = 'Comparación de Ventas por Hora';
        chartConfig = getComparisonChartConfig(salesData, currentFilter.comparisonDates);
    } else {
        const targetDate = currentFilter.date;
        const titleMap = { 'today': `Análisis por Hora - ${targetDate.toLocaleDateString('es-MX')}`, 'custom': `Análisis por Hora - ${targetDate.toLocaleDateString('es-MX')}`, 'week': 'Análisis Semanal', 'month': 'Análisis Mensual' };
        chartTitleEl.textContent = titleMap[currentFilter.type] || 'Análisis';
        const configFn = { 'today': getHourlyChartConfig, 'custom': getHourlyChartConfig, 'week': getDailyChartConfig, 'month': getDailyChartConfig }[currentFilter.type];
        chartConfig = configFn(salesData, currentFilter.type, targetDate);
    }
   
    const ctx = document.getElementById('sales-chart').getContext('2d');
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, chartConfig);
}

function getHourlyChartConfig(salesData, type, targetDate) {
    const hourlySales = Array(24).fill(0);
    salesData.forEach(sale => {
        const sDate = sale.timestamp.toDate();
        if (sDate.getFullYear() === targetDate.getFullYear() && sDate.getMonth() === targetDate.getMonth() && sDate.getDate() === targetDate.getDate()) {
            hourlySales[sDate.getHours()] += sale.saleAmount;
        }
    });
    return { type: 'bar', data: { labels: Array.from({length: 24}, (_, i) => `${i}:00`), datasets: [{ label: 'Ventas (MXN)', data: hourlySales, backgroundColor: 'rgba(79, 70, 229, 0.5)' }] }, options: getCommonChartOptions() };
}

function getComparisonChartConfig(salesData, comparisonDates) {
    const colors = ['rgba(79, 70, 229, 0.8)', 'rgba(219, 39, 119, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)'];
    const datasets = comparisonDates.map((date, index) => {
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
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: datasets
        },
        options: getCommonChartOptions()
    };
}

function getDailyChartConfig(salesData, period, date) {
    const {y, m, d} = {y: date.getFullYear(), m: date.getMonth(), d: date.getDate()};
    let start, end;
    if (period === 'week') {
        const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
        start = new Date(y, m, d - dayOfWeek); end = new Date(y, m, d - dayOfWeek + 6);
    } else { // month
        start = new Date(y, m, 1); end = new Date(y, m + 1, 0);
    }
    const labels = [], dataPoints = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        labels.push(new Date(dt));
        dataPoints.push(salesData.reduce((sum, s) => {
            const sDate = s.timestamp.toDate();
            return sDate >= dt && sDate < new Date(dt.getTime() + 24*60*60*1000) ? sum + s.saleAmount : sum;
        }, 0));
    }
    return { type: 'line', data: { labels, datasets: [{ label: 'Ventas (MXN)', data: dataPoints, fill: true, backgroundColor: 'rgba(79, 70, 229, 0.5)' }] }, options: getCommonChartOptions(true) };
}

function getCommonChartOptions(isTimeSeries = false) {
     const options = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('es-MX', {style:'currency', currency:'MXN'}) } } }, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label || ''}: ${c.parsed.y.toLocaleString('es-MX', {style:'currency', currency:'MXN'})}` } } } };
     if(isTimeSeries) options.scales.x = { type: 'time', time: { unit: 'day', tooltipFormat: 'PPP', displayFormats: {day: 'dd MMM'} }, adapters: { date: {} } };
     return options;
}
