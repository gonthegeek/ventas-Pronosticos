/**
 * Base Module Class
 * Provides common functionality for all application modules
 */

export class BaseModule {
    constructor(name, options = {}) {
        this.name = name;
        this.options = options;
        this.isInitialized = false;
        this.contentContainer = null;
        
        console.log(`📦 Module created: ${name}`);
    }

    /**
     * Initialize the module
     * Override in child classes for specific initialization
     */
    async init(params = {}) {
        if (this.isInitialized) {
            console.log(`📦 Module ${this.name} already initialized`);
            return;
        }

        console.log(`📦 Initializing module: ${this.name}`, params);
        
        try {
            // Create content container
            this.createContentContainer();
            
            // Call child-specific initialization
            if (typeof this.onInit === 'function') {
                await this.onInit(params);
            }
            
            this.isInitialized = true;
            console.log(`✅ Module ${this.name} initialized successfully`);
            
        } catch (error) {
            console.error(`❌ Error initializing module ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Render the module
     * Override in child classes for specific rendering
     */
    async render(params = {}) {
        if (!this.isInitialized) {
            await this.init(params);
        }

        console.log(`📦 Rendering module: ${this.name}`);
        
        try {
            // Show the content container
            this.showContentContainer();
            
            // Call child-specific rendering
            if (typeof this.onRender === 'function') {
                await this.onRender(params);
            }
            
            console.log(`✅ Module ${this.name} rendered successfully`);
            
        } catch (error) {
            console.error(`❌ Error rendering module ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Destroy the module
     * Override in child classes for cleanup
     */
    async destroy() {
        console.log(`📦 Destroying module: ${this.name}`);
        
        try {
            // Call child-specific cleanup
            if (typeof this.onDestroy === 'function') {
                await this.onDestroy();
            }
            
            // Remove content container
            this.removeContentContainer();
            
            this.isInitialized = false;
            console.log(`✅ Module ${this.name} destroyed successfully`);
            
        } catch (error) {
            console.error(`❌ Error destroying module ${this.name}:`, error);
        }
    }

    /**
     * Create main content container
     */
    createContentContainer() {
        // Hide existing content
        this.hideExistingContent();
        
        // Create new content container
        const container = document.createElement('div');
        container.id = `module-${this.name}`;
        container.className = 'module-content';
        
        // Add to main content area
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.appendChild(container);
            this.contentContainer = container;
            
            // Apply sidebar layout immediately
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('collapsed')) {
                container.classList.add('sidebar-collapsed');
            }
        } else {
            throw new Error('Main content container not found');
        }
    }

    /**
     * Show this module's content container
     */
    showContentContainer() {
        if (this.contentContainer) {
            this.contentContainer.style.display = 'block';
        }
    }

    /**
     * Hide existing content (legacy content)
     */
    hideExistingContent() {
        // Hide the original content that's not in modules
        const legacyContent = document.querySelector('.container.mx-auto.p-4');
        if (legacyContent) {
            legacyContent.style.display = 'none';
        }
        
        // Hide other module containers
        document.querySelectorAll('.module-content').forEach(container => {
            if (container !== this.contentContainer) {
                container.style.display = 'none';
            }
        });
    }

    /**
     * Remove content container
     */
    removeContentContainer() {
        if (this.contentContainer) {
            this.contentContainer.remove();
            this.contentContainer = null;
        }
    }

    /**
     * Utility method to create HTML elements
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Append children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    }

    /**
     * Utility method to show loading state
     */
    showLoading(message = 'Cargando...') {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div class="flex items-center justify-center h-64">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
                        <p class="mt-4 text-gray-600">${message}</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Utility method to show error state
     */
    showError(message = 'Ha ocurrido un error', details = '') {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div class="flex items-center justify-center h-64">
                    <div class="text-center">
                        <div class="text-red-500 text-4xl mb-4">❌</div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">${message}</h3>
                        ${details ? `<p class="text-gray-600">${details}</p>` : ''}
                        <button onclick="window.location.reload()" 
                                class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Get module name
     */
    getName() {
        return this.name;
    }

    /**
     * Check if module is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}
