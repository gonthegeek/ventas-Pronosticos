/**
 * Navigation Component - Sidebar Menu
 * Handles the main navigation sidebar with role-based menu items
 */

import { router } from '../core/router.js';
import { getCurrentUser, hasMenuAccess, hasPermission, PERMISSIONS } from '../utils/permissions.js';
import { handleSignOut } from '../core/auth.js';

export class Navigation {
    constructor() {
        this.isCollapsed = false;
        this.currentUser = null;
        this.menuItems = [];
        
        console.log('🧭 Navigation component initialized');
    }

    /**
     * Initialize navigation with current user permissions
     */
    initialize() {
        this.currentUser = getCurrentUser();
        this.menuItems = this.getMenuItemsByRole();
    }

    /**
     * Get menu items based on user role and permissions
     */
    getMenuItemsByRole() {
        if (!this.currentUser || !this.currentUser.role) {
            return [];
        }

        const baseItems = [
            {
                id: 'dashboard',
                title: 'Dashboard',
                icon: '📊',
                route: '/dashboard',
                permission: PERMISSIONS.DASHBOARD_READ,
                roles: ['operador', 'supervisor', 'admin']
            }
        ];

        const salesItems = [
            {
                id: 'sales',
                title: 'Ventas',
                icon: '📈',
                isSection: true,
                permission: PERMISSIONS.VENTAS_READ,
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'hourly-sales',
                title: 'Por Hora',
                icon: '⏰',
                route: '/sales/hourly',
                parent: 'sales',
                permission: PERMISSIONS.VENTAS_ALL,
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'daily-sales',
                title: 'Diarias',
                icon: '📅',
                route: '/sales/daily',
                parent: 'sales',
                permission: PERMISSIONS.VENTAS_READ,
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'weekly-sales',
                title: 'Semanales',
                icon: '🗓️',
                route: '/sales/weekly',
                parent: 'sales',
                permission: PERMISSIONS.VENTAS_READ,
                roles: ['operador', 'supervisor', 'admin']
            }
        ];

        const financeItems = [
            {
                id: 'finances',
                title: 'Finanzas',
                icon: '💰',
                isSection: true,
                permission: PERMISSIONS.COMISIONES_READ,
                roles: ['supervisor', 'admin']
            },
            {
                id: 'commissions',
                title: 'Comisiones',
                icon: '💵',
                route: '/finances/commissions',
                parent: 'finances',
                permission: PERMISSIONS.COMISIONES_ALL,
                roles: ['supervisor', 'admin']
            },
            {
                id: 'tickets',
                title: 'Boletos',
                icon: '🎫',
                route: '/finances/tickets',
                parent: 'finances',
                permission: PERMISSIONS.BOLETOS_READ,
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'prizes',
                title: 'Premiados',
                icon: '🏆',
                route: '/finances/prizes',
                parent: 'finances',
                permission: PERMISSIONS.PREMIADOS_ALL,
                roles: ['supervisor', 'admin']
            }
        ];

        const lotteryItems = [
            {
                id: 'lottery',
                title: 'Sorteos',
                icon: '🎰',
                isSection: true,
                permission: PERMISSIONS.SORTEOS_READ,
                roles: ['supervisor', 'admin']
            },
            {
                id: 'scratches',
                title: 'Raspados',
                icon: '🎲',
                route: '/lottery/scratches',
                parent: 'lottery',
                permission: PERMISSIONS.SORTEOS_ALL,
                roles: ['supervisor', 'admin']
            },
            {
                id: 'first-places',
                title: 'Primeros',
                icon: '🥇',
                route: '/lottery/first-places',
                parent: 'lottery',
                permission: PERMISSIONS.SORTEOS_ALL,
                roles: ['supervisor', 'admin']
            }
        ];

        const operationItems = [
            {
                id: 'operations',
                title: 'Operación',
                icon: '🔧',
                isSection: true,
                permission: PERMISSIONS.ROLLOS_READ,
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'roll-changes',
                title: 'Cambio Rollos',
                icon: '📜',
                route: '/operations/roll-changes',
                parent: 'operations',
                permission: PERMISSIONS.ROLLOS_CREATE,
                roles: ['operador', 'supervisor', 'admin']
            }
        ];

        const adminItems = [
            {
                id: 'admin',
                title: 'Admin',
                icon: '⚙️',
                isSection: true,
                permission: PERMISSIONS.ADMIN_ALL,
                roles: ['admin']
            },
            {
                id: 'users',
                title: 'Usuarios',
                icon: '👥',
                route: '/admin/users',
                parent: 'admin',
                permission: PERMISSIONS.USERS_ALL,
                roles: ['admin']
            },
            {
                id: 'settings',
                title: 'Configuración',
                icon: '🛠️',
                route: '/admin/settings',
                parent: 'admin',
                permission: PERMISSIONS.ADMIN_ALL,
                roles: ['admin']
            }
        ];

        const allItems = [
            ...baseItems,
            ...salesItems,
            ...financeItems,
            ...lotteryItems,
            ...operationItems,
            ...adminItems
        ];

        // Filter by role and permissions
        return allItems.filter(item => {
            // Check role access
            const hasRoleAccess = !item.roles || item.roles.includes(this.currentUser.role);
            
            // Check permission access
            const hasPermissionAccess = !item.permission || hasPermission(item.permission);
            
            return hasRoleAccess && hasPermissionAccess;
        });
    }

    /**
     * Filter menu items by user role (legacy method for compatibility)
     */
    getFilteredMenuItems() {
        return this.getMenuItemsByRole();
    }

    /**
     * Render the navigation sidebar
     */
    render() {
        const filteredItems = this.getFilteredMenuItems();
        const sidebarHtml = this.generateSidebarHtml(filteredItems);
        
        // Insert sidebar into DOM
        const existingSidebar = document.getElementById('sidebar');
        if (existingSidebar) {
            existingSidebar.outerHTML = sidebarHtml;
        } else {
            // Insert as first child of main-content
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.insertAdjacentHTML('afterbegin', sidebarHtml);
            }
        }

        // Update main content layout to accommodate sidebar
        this.updateMainContentLayout();

        // Attach event listeners
        this.attachEventListeners();

        console.log('🧭 Navigation rendered');
    }

    /**
     * Generate sidebar HTML
     */
    generateSidebarHtml(menuItems) {
        const itemsHtml = menuItems.map(item => {
            if (item.isSection) {
                return `
                    <div class="nav-section">
                        <div class="nav-section-title">
                            <span class="nav-icon">${item.icon}</span>
                            <span class="nav-text ${this.isCollapsed ? 'hidden' : ''}">${item.title}</span>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <a href="#${item.route}" 
                       class="nav-item ${item.parent ? 'nav-sub-item' : ''}" 
                       data-route="${item.route}"
                       data-id="${item.id}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text ${this.isCollapsed ? 'hidden' : ''}">${item.title}</span>
                    </a>
                `;
            }
        }).join('');

        return `
            <nav id="sidebar" class="sidebar ${this.isCollapsed ? 'collapsed' : ''}">
                <div class="sidebar-header">
                    <div class="sidebar-brand ${this.isCollapsed ? 'collapsed' : ''}">
                        <span class="brand-icon">🏪</span>
                        <span class="brand-text ${this.isCollapsed ? 'hidden' : ''}">Ventas & Sorteos</span>
                    </div>
                    <button id="sidebar-toggle" class="sidebar-toggle" title="Alternar menú">
                        <span class="toggle-icon">${this.isCollapsed ? '▶️' : '◀️'}</span>
                    </button>
                </div>
                <div class="sidebar-content">
                    ${itemsHtml}
                </div>
                <div class="sidebar-footer">
                    <div class="user-info ${this.isCollapsed ? 'collapsed' : ''}">
                        <span class="user-icon">👤</span>
                        <div class="user-text ${this.isCollapsed ? 'hidden' : ''}">
                            <div class="user-role">${this.currentUser?.email || 'Usuario'}</div>
                            <small class="user-level">${this.currentUser?.role || 'Sin rol'}</small>
                        </div>
                    </div>
                    <button id="logout-button" 
                            class="logout-btn ${this.isCollapsed ? 'collapsed' : ''}" 
                            title="Cerrar Sesión">
                        <span class="logout-icon">🚪</span>
                        <span class="logout-text ${this.isCollapsed ? 'hidden' : ''}">Cerrar Sesión</span>
                    </button>
                </div>
            </nav>
        `;
    }

    /**
     * Update main content layout to accommodate sidebar
     */
    updateMainContentLayout() {
        const mainContent = document.getElementById('main-content');
        if (mainContent && !mainContent.classList.contains('with-sidebar')) {
            mainContent.classList.add('with-sidebar');
            if (this.isCollapsed) {
                mainContent.classList.add('sidebar-collapsed');
            }
        }

        // Adjust all content containers
        const contentContainers = [
            document.querySelector('.container.mx-auto.p-4'),
            ...document.querySelectorAll('.module-content')
        ];

        contentContainers.forEach(container => {
            if (container) {
                container.classList.toggle('sidebar-collapsed', this.isCollapsed);
            }
        });
    }

    /**
     * Attach event listeners to navigation elements
     */
    attachEventListeners() {
        // Toggle sidebar
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const route = item.getAttribute('data-route');
                if (route) {
                    router.navigate(route);
                }
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        console.log('🧭 Event listeners attached');
    }

    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        
        const sidebar = document.getElementById('sidebar');
        const toggleIcon = document.querySelector('.toggle-icon');
        const navTexts = document.querySelectorAll('.nav-text');
        const brandText = document.querySelector('.brand-text');
        const userText = document.querySelector('.user-text');
        const logoutText = document.querySelector('.logout-text');
        const userInfo = document.querySelector('.user-info');
        const logoutBtn = document.querySelector('.logout-btn');
        const sidebarBrand = document.querySelector('.sidebar-brand');
        const mainContent = document.getElementById('main-content');

        if (sidebar) {
            sidebar.classList.toggle('collapsed', this.isCollapsed);
        }

        if (toggleIcon) {
            toggleIcon.textContent = this.isCollapsed ? '▶️' : '◀️';
        }

        navTexts.forEach(text => {
            text.classList.toggle('hidden', this.isCollapsed);
        });

        if (brandText) brandText.classList.toggle('hidden', this.isCollapsed);
        if (userText) userText.classList.toggle('hidden', this.isCollapsed);
        if (logoutText) logoutText.classList.toggle('hidden', this.isCollapsed);
        if (userInfo) userInfo.classList.toggle('collapsed', this.isCollapsed);
        if (logoutBtn) logoutBtn.classList.toggle('collapsed', this.isCollapsed);
        if (sidebarBrand) sidebarBrand.classList.toggle('collapsed', this.isCollapsed);

        // Update main content and all containers
        if (mainContent) {
            mainContent.classList.toggle('sidebar-collapsed', this.isCollapsed);
        }

        // Update all content containers
        const contentContainers = [
            document.querySelector('.container.mx-auto.p-4'),
            ...document.querySelectorAll('.module-content')
        ];

        contentContainers.forEach(container => {
            if (container) {
                container.classList.toggle('sidebar-collapsed', this.isCollapsed);
            }
        });

        console.log(`🧭 Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`);
    }

    /**
     * Handle logout functionality
     */
    async handleLogout() {
        await handleSignOut();
    }

    /**
     * Set user role and re-render if needed
     */
    setUserRole(role) {
        if (this.currentUserRole !== role) {
            this.currentUserRole = role;
            this.menuItems = this.getMenuItemsByRole();
            this.render(); // Re-render with new role permissions
        }
    }

    /**
     * Update active navigation item
     */
    setActiveRoute(route) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-route="${route}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Destroy navigation component
     */
    destroy() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.remove();
        }

        // Reset main content layout
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.remove('with-sidebar', 'sidebar-collapsed');
        }

        // Reset all content containers
        const contentContainers = [
            document.querySelector('.container.mx-auto.p-4'),
            ...document.querySelectorAll('.module-content')
        ];

        contentContainers.forEach(container => {
            if (container) {
                container.classList.remove('sidebar-collapsed');
                container.style.marginLeft = '';
            }
        });

        console.log('🧭 Navigation destroyed');
    }
}

// Export singleton instance
export const navigation = new Navigation();
