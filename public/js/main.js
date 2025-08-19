import { initFirebase } from './auth.js';
import { setupEventListeners } from './events.js';
import { router } from './core/router.js';
import { navigation } from './ui/navigation.js';
import { dashboardModule } from './modules/dashboard/dashboard.js';
import { hourlySalesModule } from './modules/sales/hourly-sales.js';
import { PERMISSIONS } from './utils/permissions.js';

// Initialize the application
window.onload = async () => {
    console.log('🚀 Application starting...');
    
    try {
        // Initialize Firebase and auth
        await initFirebase();
        
        // Setup global event listeners (auth, navigation)
        setupEventListeners();
        
        // Make navigation available globally for auth.js
        window.navigation = navigation;
        
        // Register routes with modules
        registerRoutes();
        
        // Note: Navigation will be initialized after successful authentication
        // in the auth state handler to ensure permissions are loaded
        
        // Initialize router
        router.init();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing application:', error);
    }
};

/**
 * Register all application routes
 */
function registerRoutes() {
    console.log('📍 Registering application routes...');
    
    // Dashboard
    router.register('/dashboard', dashboardModule, {
        title: 'Dashboard',
        requiresAuth: true,
        permission: PERMISSIONS.DASHBOARD_READ
    });
    
    // Sales routes
    router.register('/sales/hourly', hourlySalesModule, {
        title: 'Ventas por Hora',
        requiresAuth: true,
        permission: PERMISSIONS.VENTAS_ALL
    });
    
    // Placeholder routes for future modules
    router.register('/sales/daily', createPlaceholderModule('daily-sales', 'Ventas Diarias', '📅'), {
        title: 'Ventas Diarias',
        requiresAuth: true,
        permission: PERMISSIONS.VENTAS_READ
    });
    
    router.register('/sales/weekly', createPlaceholderModule('weekly-sales', 'Ventas Semanales', '🗓️'), {
        title: 'Ventas Semanales', 
        requiresAuth: true,
        permission: PERMISSIONS.VENTAS_READ
    });
    
    // Finance routes
    router.register('/finances/commissions', createPlaceholderModule('commissions', 'Comisiones Mensuales', '💵'), {
        title: 'Comisiones',
        requiresAuth: true,
        permission: PERMISSIONS.COMISIONES_ALL
    });
    
    router.register('/finances/tickets', createPlaceholderModule('tickets', 'Boletos Vendidos', '🎫'), {
        title: 'Boletos',
        requiresAuth: true,
        permission: PERMISSIONS.BOLETOS_READ
    });
    
    router.register('/finances/prizes', createPlaceholderModule('prizes', 'Boletos Premiados', '🏆'), {
        title: 'Premiados',
        requiresAuth: true,
        permission: PERMISSIONS.PREMIADOS_ALL
    });
    
    // Lottery routes
    router.register('/lottery/scratches', createPlaceholderModule('scratches', 'Raspados Premiados', '🎲'), {
        title: 'Raspados',
        requiresAuth: true,
        permission: PERMISSIONS.SORTEOS_ALL
    });
    
    router.register('/lottery/first-places', createPlaceholderModule('first-places', 'Primeros Lugares', '🥇'), {
        title: 'Primeros Lugares',
        requiresAuth: true,
        permission: PERMISSIONS.SORTEOS_ALL
    });
    
    // Operations routes
    router.register('/operations/roll-changes', createPlaceholderModule('roll-changes', 'Cambio de Rollos', '📜'), {
        title: 'Cambio de Rollos',
        requiresAuth: true,
        permission: PERMISSIONS.ROLLOS_CREATE
    });
    
    // Admin routes
    router.register('/admin/users', createPlaceholderModule('users', 'Gestión de Usuarios', '👥'), {
        title: 'Usuarios',
        requiresAuth: true,
        permission: PERMISSIONS.USERS_ALL
    });
    
    router.register('/admin/settings', createPlaceholderModule('settings', 'Configuración', '🛠️'), {
        title: 'Configuración',
        requiresAuth: true,
        permission: PERMISSIONS.ADMIN_ALL
    });
    
    console.log('✅ Routes registered successfully');
}

/**
 * Create placeholder module for routes not yet implemented
 */
function createPlaceholderModule(name, title, icon) {
    return {
        init: async () => {
            console.log(`📦 Placeholder module ${name} initialized`);
        },
        render: async () => {
            console.log(`📦 Placeholder module ${name} rendered`);
            
            // Find or create module content container
            let container = document.getElementById(`module-${name}`);
            if (!container) {
                container = document.createElement('div');
                container.id = `module-${name}`;
                container.className = 'module-content';
                
                // Apply sidebar layout immediately
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('collapsed')) {
                    container.classList.add('sidebar-collapsed');
                }
                
                const mainContent = document.getElementById('main-content');
                if (mainContent) {
                    mainContent.appendChild(container);
                }
            }
            
            // Hide other content
            document.querySelector('.container.mx-auto.p-4')?.style.setProperty('display', 'none');
            document.querySelectorAll('.module-content').forEach(el => {
                if (el !== container) el.style.display = 'none';
            });
            
            container.style.display = 'block';
            container.innerHTML = `
                <div class="p-6">
                    <div class="max-w-2xl mx-auto text-center">
                        <div class="text-6xl mb-6">${icon}</div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-4">${title}</h1>
                        <p class="text-lg text-gray-600 mb-8">
                            Esta funcionalidad está en desarrollo y será implementada en las próximas fases del proyecto.
                        </p>
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                            <h3 class="font-semibold text-blue-900 mb-2">🚧 Estado de Desarrollo</h3>
                            <p class="text-blue-800 text-sm">
                                Este módulo está incluido en el plan de refactor y será implementado siguiendo 
                                los requerimientos del SRS. Consulta el archivo refactor-plan.json para más detalles.
                            </p>
                        </div>
                        <button onclick="window.history.back()" 
                                class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                            ← Volver
                        </button>
                    </div>
                </div>
            `;
        },
        destroy: async () => {
            console.log(`📦 Placeholder module ${name} destroyed`);
        }
    };
}