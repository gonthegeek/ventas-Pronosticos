import { initFirebase } from './auth.js';
import { setupEventListeners } from './events.js';

window.onload = () => {
    initFirebase();
    setupEventListeners();
};