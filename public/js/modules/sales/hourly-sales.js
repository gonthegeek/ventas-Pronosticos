/**
 * Hourly Sales Module
 * Migrated from existing functionality - handles sales tracking by hour
 */

import { BaseModule } from '../base-module.js';

export class HourlySalesModule extends BaseModule {
    constructor() {
        super('hourly-sales', {
            title: 'Ventas por Hora',
            description: 'Registro y análisis de ventas por hora'
        });
    }

    /**
     * Initialize hourly sales module
     */
    async onInit(params) {
        console.log('⏰ Hourly Sales module initializing...');
        // Any specific initialization for hourly sales
    }

    /**
     * Render hourly sales content
     */
    async onRender(params) {
        console.log('⏰ Hourly Sales module rendering...');
        
        this.showLoading('Cargando ventas por hora...');
        
        // Show the original content by making it visible
        setTimeout(() => {
            this.showOriginalContent();
        }, 500);
    }

    /**
     * Show the original content (temporarily while we migrate)
     */
    showOriginalContent() {
        if (!this.contentContainer) return;

        // For now, we'll show the original content within the module
        // This is a temporary solution while we complete the migration
        this.contentContainer.innerHTML = `
            <div class="hourly-sales-wrapper">
                <div class="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800">
                    <div class="font-semibold">🔄 Módulo de Ventas por Hora</div>
                    <div class="text-sm">Funcionalidad actual migrada al nuevo sistema de navegación</div>
                </div>
                <div id="original-content-placeholder">
                    <!-- El contenido original se mostrará aquí -->
                </div>
            </div>
        `;

        // Show the original content
        const legacyContent = document.querySelector('.container.mx-auto.p-4');
        if (legacyContent) {
            legacyContent.style.display = 'block';
            // Move it into our module container temporarily
            const placeholder = document.getElementById('original-content-placeholder');
            if (placeholder) {
                // Clone the content to avoid moving the original
                const clonedContent = legacyContent.cloneNode(true);
                placeholder.appendChild(clonedContent);
                // Hide the original
                legacyContent.style.display = 'none';
            }
        }

        console.log('⏰ Original hourly sales content displayed');
    }

    /**
     * Cleanup hourly sales module
     */
    async onDestroy() {
        console.log('⏰ Hourly Sales module cleaning up...');
        
        // Restore original content visibility
        const legacyContent = document.querySelector('.container.mx-auto.p-4');
        if (legacyContent) {
            legacyContent.style.display = 'block';
        }
    }
}

// Export instance
export const hourlySalesModule = new HourlySalesModule();
