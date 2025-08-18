/**
 * Dashboard Module
 * Main dashboard with KPIs and overview
 */

import { BaseModule } from '../base-module.js';

export class DashboardModule extends BaseModule {
    constructor() {
        super('dashboard', {
            title: 'Dashboard - Vista General',
            description: 'Resumen general del sistema con KPIs principales'
        });
    }

    /**
     * Initialize dashboard module
     */
    async onInit(params) {
        console.log('📊 Dashboard module initializing...');
        // Dashboard-specific initialization can go here
    }

    /**
     * Render dashboard content
     */
    async onRender(params) {
        console.log('📊 Dashboard module rendering...');
        
        this.showLoading('Cargando dashboard...');
        
        // Simulate loading delay
        setTimeout(() => {
            this.renderDashboardContent();
        }, 800);
    }

    /**
     * Render the actual dashboard content
     */
    renderDashboardContent() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="p-6">
                <!-- Dashboard Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p class="text-gray-600 mt-2">Vista general del sistema de ventas y sorteos</p>
                </div>

                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    ${this.generateKPICard('📈', 'Ventas Hoy', '$1,250.00', '+5.2%', 'text-green-600')}
                    ${this.generateKPICard('🎫', 'Boletos Vendidos', '324', '+12.1%', 'text-blue-600')}
                    ${this.generateKPICard('🏆', 'Premios Pagados', '$45.00', '-2.3%', 'text-red-600')}
                    ${this.generateKPICard('🎰', 'Sorteos Activos', '3', '0%', 'text-gray-600')}
                </div>

                <!-- Quick Actions -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div class="bg-white p-6 rounded-xl shadow-lg">
                        <h3 class="text-lg font-semibold mb-4">⚡ Acciones Rápidas</h3>
                        <div class="space-y-3">
                            ${this.generateQuickAction('📝 Registrar Venta', '/sales/hourly', '⏰')}
                            ${this.generateQuickAction('🎫 Registrar Boletos', '/finances/tickets', '🎫')}
                            ${this.generateQuickAction('📜 Cambio de Rollo', '/operations/roll-changes', '🔧')}
                            ${this.generateQuickAction('🏆 Registrar Premio', '/finances/prizes', '💰')}
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-xl shadow-lg">
                        <h3 class="text-lg font-semibold mb-4">📊 Resumen Semanal</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600">Ventas Totales:</span>
                                <span class="font-semibold">$8,750.00</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600">Boletos Vendidos:</span>
                                <span class="font-semibold">2,140</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600">Premios Pagados:</span>
                                <span class="font-semibold">$315.00</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600">Máquinas Activas:</span>
                                <span class="font-semibold">2/2</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <h3 class="text-lg font-semibold mb-4">🕒 Actividad Reciente</h3>
                    <div class="space-y-3">
                        ${this.generateActivityItem('📈', 'Venta registrada - Máquina 76', '$150.50', '10 min')}
                        ${this.generateActivityItem('🎫', 'Boletos vendidos - Máquina 79', '45 boletos', '25 min')}
                        ${this.generateActivityItem('📜', 'Cambio de rollo - Máquina 76', 'Completado', '1h')}
                        ${this.generateActivityItem('🏆', 'Premio pagado', '$25.00', '2h')}
                        ${this.generateActivityItem('📈', 'Venta registrada - Máquina 79', '$89.75', '3h')}
                    </div>
                </div>

                <!-- Footer Info -->
                <div class="mt-8 text-center text-gray-500 text-sm">
                    <p>🏪 Sistema de Ventas y Sorteos - Dashboard Principal</p>
                    <p>Última actualización: ${new Date().toLocaleString('es-MX')}</p>
                </div>
            </div>
        `;

        // Attach event listeners for quick actions
        this.attachDashboardEvents();
    }

    /**
     * Generate KPI card HTML
     */
    generateKPICard(icon, title, value, change, changeClass) {
        return `
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-600 text-sm">${title}</p>
                        <p class="text-2xl font-bold text-gray-900 mt-1">${value}</p>
                    </div>
                    <div class="text-3xl">${icon}</div>
                </div>
                <div class="mt-4 flex items-center">
                    <span class="text-sm ${changeClass} font-semibold">${change}</span>
                    <span class="text-gray-500 text-sm ml-2">vs. ayer</span>
                </div>
            </div>
        `;
    }

    /**
     * Generate quick action button HTML
     */
    generateQuickAction(title, route, icon) {
        return `
            <button class="quick-action w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    data-route="${route}">
                <div class="flex items-center">
                    <span class="text-lg mr-3">${icon}</span>
                    <span class="text-gray-700 hover:text-indigo-700">${title}</span>
                </div>
            </button>
        `;
    }

    /**
     * Generate activity item HTML
     */
    generateActivityItem(icon, description, detail, time) {
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center">
                    <span class="text-lg mr-3">${icon}</span>
                    <div>
                        <p class="text-gray-900 font-medium">${description}</p>
                        <p class="text-gray-600 text-sm">${detail}</p>
                    </div>
                </div>
                <span class="text-gray-500 text-sm">${time}</span>
            </div>
        `;
    }

    /**
     * Attach event listeners for dashboard interactions
     */
    attachDashboardEvents() {
        // Quick action buttons
        document.querySelectorAll('.quick-action').forEach(button => {
            button.addEventListener('click', () => {
                const route = button.getAttribute('data-route');
                if (route) {
                    // Import router and navigate
                    import('../../core/router.js').then(({ router }) => {
                        router.navigate(route);
                    });
                }
            });
        });

        console.log('📊 Dashboard events attached');
    }

    /**
     * Cleanup dashboard module
     */
    async onDestroy() {
        console.log('📊 Dashboard module cleaning up...');
        // Clean up any timers, subscriptions, etc.
    }
}

// Export instance
export const dashboardModule = new DashboardModule();
