/**
 * Hourly Sales Module
 * Handles sales tracking by hour for vending machines
 */

import { BaseModule } from '../base-module.js';
import { subscribeToSalesData } from '../../core/api.js';
import { applyFiltersAndUpdateUI, getDateRange } from '../../state.js';
import { setupHourlySalesEventListeners, cleanupHourlySalesEventListeners } from './hourly-sales-events.js';
import { toggleGlobalLoader } from '../../ui.js';

export class HourlySalesModule extends BaseModule {
    constructor() {
        super('hourly-sales', {
            title: 'Ventas por Hora',
            description: 'Registro y análisis de ventas por hora'
        });
        this.dataSubscription = null;
    }

    /**
     * Initialize hourly sales module
     */
    async onInit(params) {
        console.log('⏰ Hourly Sales module initializing...');
        
        // Setup specific event listeners for hourly sales
        this.setupDataSubscription();
    }

    /**
     * Render hourly sales content
     */
    async onRender(params) {
        console.log('⏰ Hourly Sales module rendering...');
        
        this.showLoading('Cargando ventas por hora...');
        
        // Show the original content and enhance it
        setTimeout(() => {
            this.showEnhancedContent();
            this.setupEventListeners();
        }, 300);
    }

    /**
     * Show enhanced content with better integration
     */
    showEnhancedContent() {
        if (!this.contentContainer) return;

        // Clear loading state
        this.contentContainer.innerHTML = '';

        // Find and show the original legacy content
        const legacyContent = document.querySelector('.container.mx-auto.p-4');
        if (legacyContent) {
            // Show the original content
            legacyContent.style.display = 'block';
            
            // Add SRS compliance notice
            this.addSRSNotice(legacyContent);
            
            console.log('⏰ Enhanced hourly sales content displayed');
        } else {
            // If legacy content not found, create basic structure
            this.createBasicContent();
        }

        // Refresh data subscription
        this.refreshDataSubscription();
    }

    /**
     * Add SRS compliance notice to the content
     */
    addSRSNotice(container) {
        const existingNotice = container.querySelector('.srs-notice');
        if (existingNotice) return; // Don't add multiple notices

        const notice = document.createElement('div');
        notice.className = 'srs-notice mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm';
        notice.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2">📋</span>
                <div>
                    <strong>Registro de Ventas</strong>
                    <div class="text-xs mt-1">
                        Sistema de seguimiento de ventas por hora
                    </div>
                </div>
            </div>
        `;
        
        container.insertBefore(notice, container.firstChild);
    }

    /**
     * Create basic content structure if legacy content not found
     */
    createBasicContent() {
        this.contentContainer.innerHTML = `
            <div class="p-6">
                <div class="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                    <div class="font-semibold">⚠️ Contenido Original No Encontrado</div>
                    <div class="text-sm">El contenido de ventas por hora original no está disponible.</div>
                    <div class="text-sm mt-2">
                        <strong>Sistema de Ventas:</strong> Registro de ventas por hora<br>
                        Campos requeridos: fecha, hora, máquina, venta
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold mb-4">Ventas por Hora</h2>
                    <p class="text-gray-600">
                        Esta funcionalidad permite registrar y analizar ventas por hora de las máquinas.
                        Es la base para comparativas históricas por horas entre días.
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Setup data subscription for real-time updates
     */
    setupDataSubscription() {
        const { startDate, endDate } = getDateRange();
        
        this.dataSubscription = subscribeToSalesData(
            startDate,
            endDate,
            (salesData) => {
                // Update UI with new data
                applyFiltersAndUpdateUI(salesData);
                toggleGlobalLoader(false);
            },
            (error) => {
                console.error("Error in hourly sales subscription:", error);
                toggleGlobalLoader(false);
            }
        );
    }

    /**
     * Refresh data subscription when filters change
     */
    refreshDataSubscription() {
        if (this.dataSubscription) {
            this.dataSubscription(); // Unsubscribe
        }
        this.setupDataSubscription();
    }

    /**
     * Setup event listeners for hourly sales
     */
    setupEventListeners() {
        console.log('⏰ Setting up hourly sales event listeners...');
        setupHourlySalesEventListeners();
    }

    /**
     * Cleanup hourly sales module
     */
    async onDestroy() {
        console.log('⏰ Hourly Sales module cleaning up...');
        
        // Cleanup data subscription
        if (this.dataSubscription) {
            this.dataSubscription();
            this.dataSubscription = null;
        }
        
        // Cleanup event listeners
        cleanupHourlySalesEventListeners();
        
        // Hide the original content when leaving this module
        const legacyContent = document.querySelector('.container.mx-auto.p-4');
        if (legacyContent) {
            legacyContent.style.display = 'none';
            
            // Remove SRS notice
            const notice = legacyContent.querySelector('.srs-notice');
            if (notice) {
                notice.remove();
            }
        }
        
        console.log('✅ Hourly Sales module cleanup complete');
    }

    /**
     * Handle filter changes (called by router or state management)
     */
    async onFilterChange(filterData) {
        console.log('⏰ Filter changed in hourly sales:', filterData);
        this.refreshDataSubscription();
    }

    /**
     * Export functionality specific to hourly sales
     */
    async exportData(format = 'csv') {
        console.log(`⏰ Exporting hourly sales data in ${format} format...`);
        // Export functionality will be handled by the existing export functions
        // in hourly-sales-events.js
    }
}

// Export instance
export const hourlySalesModule = new HourlySalesModule();
