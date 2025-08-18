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
        
        // Show the original content without cloning
        setTimeout(() => {
            this.showOriginalContent();
        }, 500);
    }

    /**
     * Show the original content (temporarily while we migrate)
     */
    showOriginalContent() {
        if (!this.contentContainer) return;

        // Clear loading state
        this.contentContainer.innerHTML = '';

        // Show the original legacy content directly
        const legacyContent = document.querySelector('.container.mx-auto.p-4');
        if (legacyContent) {
            // Simply show the original content
            legacyContent.style.display = 'block';
            console.log('⏰ Original hourly sales content displayed');
        } else {
            // If legacy content not found, show a message
            this.contentContainer.innerHTML = `
                <div class="p-6">
                    <div class="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                        <div class="font-semibold">⚠️ Contenido Original No Encontrado</div>
                        <div class="text-sm">No se pudo cargar el contenido de ventas por hora original</div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Cleanup hourly sales module
     */
    async onDestroy() {
        console.log('⏰ Hourly Sales module cleaning up...');
        
        // Hide the original content when leaving this module
        const legacyContent = document.querySelector('.container.mx-auto.p-4');
        if (legacyContent) {
            legacyContent.style.display = 'none';
        }
    }
}

// Export instance
export const hourlySalesModule = new HourlySalesModule();
