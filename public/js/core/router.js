/**
 * Simple SPA Router for Sales and Lottery System
 * Manages navigation between different modules without page reload
 */

export class Router {
    constructor() {
        this.routes = new Map();
        this.currentModule = null;
        this.currentPath = '';
        this.defaultRoute = '/dashboard';
        
        // Bind methods
        this.navigate = this.navigate.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
        
        // Listen for browser back/forward buttons
        window.addEventListener('popstate', this.handlePopState);
        
        console.log('📍 Router initialized');
    }

    /**
     * Register a route with its corresponding module
     * @param {string} path - Route path (e.g., '/sales/hourly')
     * @param {Object} module - Module object with init() and render() methods
     * @param {Object} options - Additional options like requiresAuth, role, etc.
     */
    register(path, module, options = {}) {
        this.routes.set(path, {
            module,
            options,
            path
        });
        console.log(`📍 Route registered: ${path}`);
    }

    /**
     * Navigate to a specific route
     * @param {string} path - Route path to navigate to
     * @param {Object} params - Optional parameters to pass to the module
     * @param {boolean} addToHistory - Whether to add to browser history (default: true)
     */
    async navigate(path, params = {}, addToHistory = true) {
        console.log(`📍 Navigating to: ${path}`);

        const route = this.routes.get(path);
        
        if (!route) {
            console.warn(`📍 Route not found: ${path}, redirecting to default`);
            this.navigate(this.defaultRoute, {}, addToHistory);
            return;
        }

        // Check permissions if needed
        if (route.options.requiresAuth && !this.isAuthenticated()) {
            console.warn('📍 Route requires authentication');
            this.navigate('/login', {}, addToHistory);
            return;
        }

        if (route.options.requiredRole && !this.hasRole(route.options.requiredRole)) {
            console.warn(`📍 Route requires role: ${route.options.requiredRole}`);
            this.navigate('/unauthorized', {}, addToHistory);
            return;
        }

        try {
            // Unload current module
            await this.unloadCurrent();

            // Load new module
            await this.loadModule(route, params);

            // Update browser history
            if (addToHistory && path !== this.currentPath) {
                window.history.pushState({ path, params }, '', `#${path}`);
            }

            // Update navigation UI
            this.updateNavigation(path);

            // Update current path
            this.currentPath = path;

        } catch (error) {
            console.error('📍 Navigation error:', error);
            this.navigate('/error', { error: error.message }, false);
        }
    }

    /**
     * Load and initialize a module
     */
    async loadModule(route, params = {}) {
        const { module } = route;
        
        console.log(`📍 Loading module for: ${route.path}`);

        try {
            // Initialize module if it has init method
            if (typeof module.init === 'function') {
                await module.init(params);
            }

            // Render module if it has render method  
            if (typeof module.render === 'function') {
                await module.render(params);
            }

            this.currentModule = module;
            console.log(`📍 Module loaded successfully: ${route.path}`);

        } catch (error) {
            console.error(`📍 Error loading module for ${route.path}:`, error);
            throw error;
        }
    }

    /**
     * Unload current module
     */
    async unloadCurrent() {
        if (this.currentModule && typeof this.currentModule.destroy === 'function') {
            console.log('📍 Unloading current module');
            try {
                await this.currentModule.destroy();
            } catch (error) {
                console.warn('📍 Error unloading module:', error);
            }
        }
        this.currentModule = null;
    }

    /**
     * Handle browser back/forward navigation
     */
    handlePopState(event) {
        const path = event.state?.path || this.getPathFromHash();
        const params = event.state?.params || {};
        
        console.log(`📍 PopState navigation to: ${path}`);
        this.navigate(path, params, false);
    }

    /**
     * Get current path from URL hash
     */
    getPathFromHash() {
        const hash = window.location.hash.substring(1); // Remove #
        return hash || this.defaultRoute;
    }

    /**
     * Update navigation UI to show active state
     */
    updateNavigation(activePath) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current nav item
        const activeNavItem = document.querySelector(`[data-route="${activePath}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update page title if needed
        const route = this.routes.get(activePath);
        if (route?.options?.title) {
            document.title = `${route.options.title} - Sistema de Ventas`;
        }

        console.log(`📍 Navigation UI updated for: ${activePath}`);
    }

    /**
     * Initialize router and start routing
     */
    init() {
        console.log('📍 Router starting...');
        
        // Get initial path from URL hash or use default
        const initialPath = this.getPathFromHash();
        
        // Navigate to initial path
        this.navigate(initialPath, {}, false);
    }

    /**
     * Check if user is authenticated (placeholder)
     */
    isAuthenticated() {
        // This will be implemented with the auth system
        return true; // For now, assume always authenticated
    }

    /**
     * Check if user has required role (placeholder)
     */
    hasRole(requiredRole) {
        // This will be implemented with the role system
        return true; // For now, assume always has permission
    }

    /**
     * Get current route path
     */
    getCurrentPath() {
        return this.currentPath;
    }

    /**
     * Get all registered routes
     */
    getRoutes() {
        return Array.from(this.routes.keys());
    }

    /**
     * Programmatically refresh current route
     */
    refresh() {
        if (this.currentPath) {
            this.navigate(this.currentPath, {}, false);
        }
    }
}

// Create and export global router instance
export const router = new Router();
