/**
 * Navigation Component - Sidebar Menu
 * Handles the main navigation sidebar with role-based menu items
 */

import { router } from '../core/router.js';

export class Navigation {
    constructor() {
        this.isCollapsed = false;
        this.currentUserRole = 'operador'; // Will be set from auth system
        this.menuItems = this.getMenuItemsByRole();
        
        console.log('🧭 Navigation component initialized');
    }

    /**
     * Get menu items based on user role
     */
    getMenuItemsByRole() {
        const baseItems = [
            {
                id: 'dashboard',
                title: 'Dashboard',
                icon: '📊',
                route: '/dashboard',
                roles: ['operador', 'supervisor', 'admin']
            }
        ];

        const salesItems = [
            {
                id: 'sales',
                title: 'Ventas',
                icon: '📈',
                isSection: true,
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'hourly-sales',
                title: 'Por Hora',
                icon: '⏰',
                route: '/sales/hourly',
                parent: 'sales',
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'daily-sales',
                title: 'Diarias',
                icon: '📅',
                route: '/sales/daily',
                parent: 'sales',
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'weekly-sales',
                title: 'Semanales',
                icon: '🗓️',
                route: '/sales/weekly',
                parent: 'sales',
                roles: ['operador', 'supervisor', 'admin']
            }
        ];

        const financeItems = [
            {
                id: 'finances',
                title: 'Finanzas',
                icon: '💰',
                isSection: true,
                roles: ['supervisor', 'admin']
            },
            {
                id: 'commissions',
                title: 'Comisiones',
                icon: '💵',
                route: '/finances/commissions',
                parent: 'finances',
                roles: ['supervisor', 'admin']
            },
            {
                id: 'tickets',
                title: 'Boletos',
                icon: '🎫',
                route: '/finances/tickets',
                parent: 'finances',
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'prizes',
                title: 'Premiados',
                icon: '🏆',
                route: '/finances/prizes',
                parent: 'finances',
                roles: ['supervisor', 'admin']
            }
        ];

        const lotteryItems = [
            {
                id: 'lottery',
                title: 'Sorteos',
                icon: '🎰',
                isSection: true,
                roles: ['supervisor', 'admin']
            },
            {
                id: 'scratches',
                title: 'Raspados',
                icon: '🎲',
                route: '/lottery/scratches',
                parent: 'lottery',
                roles: ['supervisor', 'admin']
            },
            {
                id: 'first-places',
                title: 'Primeros',
                icon: '🥇',
                route: '/lottery/first-places',
                parent: 'lottery',
                roles: ['supervisor', 'admin']
            }
        ];

        const operationItems = [
            {
                id: 'operations',
                title: 'Operación',
                icon: '🔧',
                isSection: true,
                roles: ['operador', 'supervisor', 'admin']
            },
            {
                id: 'roll-changes',
                title: 'Cambio Rollos',
                icon: '📜',
                route: '/operations/roll-changes',
                parent: 'operations',
                roles: ['operador', 'supervisor', 'admin']
            }
        ];

        const adminItems = [
            {
                id: 'admin',
                title: 'Admin',
                icon: '⚙️',
                isSection: true,
                roles: ['admin']
            },
            {
                id: 'users',
                title: 'Usuarios',
                icon: '👥',
                route: '/admin/users',
                parent: 'admin',
                roles: ['admin']
            },
            {
                id: 'settings',
                title: 'Configuración',
                icon: '🛠️',
                route: '/admin/settings',
                parent: 'admin',
                roles: ['admin']
            }
        ];

        return [
            ...baseItems,
            ...salesItems,
            ...financeItems,
            ...lotteryItems,
            ...operationItems,
            ...adminItems
        ];
    }

    /**
     * Filter menu items by user role
     */
    getFilteredMenuItems() {
        return this.menuItems.filter(item => 
            item.roles.includes(this.currentUserRole)
        );
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
                        <span class="user-text ${this.isCollapsed ? 'hidden' : ''}">
                            <small>${this.currentUserRole}</small>
                        </span>
                    </div>
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
        }

        // Adjust content area padding based on sidebar state
        const contentArea = document.querySelector('.content-area') || 
                           document.querySelector('.container');
        if (contentArea) {
            contentArea.style.marginLeft = this.isCollapsed ? '60px' : '250px';
            contentArea.style.transition = 'margin-left 0.3s ease';
        }
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
        const userInfo = document.querySelector('.user-info');
        const sidebarBrand = document.querySelector('.sidebar-brand');

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
        if (userInfo) userInfo.classList.toggle('collapsed', this.isCollapsed);
        if (sidebarBrand) sidebarBrand.classList.toggle('collapsed', this.isCollapsed);

        // Update main content layout
        this.updateMainContentLayout();

        console.log(`🧭 Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`);
    }

    /**
     * Set user role and re-render if needed
     */
    setUserRole(role) {
        if (this.currentUserRole !== role) {
            this.currentUserRole = role;
            this.menuItems = this.getMenuItemsByRole();
            this.render(); // Re-render with new role permissions
            console.log(`🧭 User role updated to: ${role}`);
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
            mainContent.classList.remove('with-sidebar');
        }

        const contentArea = document.querySelector('.content-area') || 
                           document.querySelector('.container');
        if (contentArea) {
            contentArea.style.marginLeft = '';
        }

        console.log('🧭 Navigation destroyed');
    }
}

// Export singleton instance
export const navigation = new Navigation();
