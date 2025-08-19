/**
 * Global Events Module - Refactored
 * Now handles only global events, module-specific events moved to their respective modules
 * Authentication and core app events remain here
 */

import { displayAuthError, showToast, toggleButtonSpinner } from './ui.js';
import { sanitizeInput, validateEmail } from './utils.js';
import { signInWithEmail, auth } from './auth.js';

// --- AUTHENTICATION EVENT HANDLERS ---

export async function handleLoginSubmit(event) {
    event.preventDefault();

    const submitBtn = document.querySelector('#login-form button[type="submit"]');

    if (submitBtn) {
        toggleButtonSpinner(submitBtn, true);
    } else {
        console.warn("Login submit button not found.");
    }

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    const emailValue = emailInput.value;
    const passwordValue = passwordInput.value;
    
    // Sanitize and validate inputs
    const email = sanitizeInput(emailValue);
    const password = sanitizeInput(passwordValue);
    
    // Validate email format
    if (!validateEmail(email)) {
        displayAuthError('Formato de correo electrónico inválido');
        showToast('Formato de correo electrónico inválido', 'error');
        if (submitBtn) toggleButtonSpinner(submitBtn, false);
        return;
    }
    
    // Validate password length (basic security)
    if (!password || password.length < 6 || password.length > 100) {
        displayAuthError('La contraseña debe tener entre 6 y 100 caracteres');
        showToast('La contraseña debe tener entre 6 y 100 caracteres', 'error');
        if (submitBtn) toggleButtonSpinner(submitBtn, false);
        return;
    }

    try {
        await signInWithEmail(email, password);
        displayAuthError(''); // Clear any previous error messages

    } catch (error) {
        console.error("Login error:", error);
        const errorMsg = sanitizeInput(error.message || 'Error de autenticación');
        displayAuthError(`Error al iniciar sesión: ${errorMsg}`);
        showToast(`Error al iniciar sesión: ${errorMsg}`, "error");

    } finally {
        if (submitBtn) {
            toggleButtonSpinner(submitBtn, false);
        }
    }
}

export async function handleLogout() {
    try {
        await auth.signOut();
        showToast("Sesión cerrada con éxito.", "success");
    } catch (error) {
        console.error("Error logging out:", error);
        showToast(`Error al cerrar sesión: ${error.message}`, "error");
    }
}

// --- GLOBAL EVENT LISTENERS SETUP ---

/**
 * Setup only global event listeners
 * Module-specific events are handled by their respective modules
 */
export function setupEventListeners() {
    console.log('🌐 Setting up global event listeners...');
    
    // Authentication events
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    } else {
        console.warn("Logout button not found.");
    }
    
    console.log('✅ Global event listeners setup complete');
}