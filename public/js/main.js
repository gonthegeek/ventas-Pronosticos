import { initFirebase } from './auth.js';
import { setupEventListeners } from './events.js';

// Punto de entrada principal de la aplicación.
// Llama a las funciones de inicialización necesarias cuando la ventana carga.
window.onload = () => {
    initFirebase();
    setupEventListeners();
};