// Unified Firebase imports (wrapper chooses CDN in browser, npm in tests/node)
import { initializeApp } from './firebase-app-wrapper.js';
import { getFirestore, collection, __firestoreLoadPromise } from './firebase-firestore-wrapper.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, __authLoadPromise } from './firebase-auth-wrapper.js';
import { setFilter } from './state.js';
import { toggleGlobalLoader, updateUserIdDisplay, showToast, showLoginForm, showMainContent } from './ui.js';

// Firebase configuration - values will be injected during build
const firebaseConfig = {
    apiKey: window.FIREBASE_CONFIG?.apiKey || "YOUR_API_KEY",
    authDomain: window.FIREBASE_CONFIG?.authDomain || "YOUR_AUTH_DOMAIN",
    projectId: window.FIREBASE_CONFIG?.projectId || "YOUR_PROJECT_ID",
    storageBucket: window.FIREBASE_CONFIG?.storageBucket || "YOUR_STORAGE_BUCKET",
    messagingSenderId: window.FIREBASE_CONFIG?.messagingSenderId || "YOUR_MESSAGING_SENDER_ID",
    appId: window.FIREBASE_CONFIG?.appId || "YOUR_APP_ID",
    measurementId: window.FIREBASE_CONFIG?.measurementId || "YOUR_MEASUREMENT_ID"
};
const appId = '1:611374798340:web:f57acbf580012df5ef475';

export let db;
export let auth;
export let salesCollection;

export async function initFirebase() {
    toggleGlobalLoader(true);
    try {
        const app = await initializeApp(firebaseConfig);
        await Promise.all([__firestoreLoadPromise, __authLoadPromise]);
        db = getFirestore(app);
        auth = getAuth(app);
        onAuthStateChanged(auth, handleAuthState);
    } catch (e) {
        console.error("Error inicializando Firebase:", e);
        showToast("Error crítico al inicializar la aplicación.", "error");
        toggleGlobalLoader(false);
    }
}

// Add Firebase authentication functions here
export async function signInWithEmail(email, password) {
    try {
        toggleGlobalLoader(true);
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error signing in with email and password:", error);
        showToast(`Error al iniciar sesión: ${error.message}`, "error");
    } finally { toggleGlobalLoader(false); }
}

export async function handleAuthState(user) {
    try {
        if (user) {
            updateUserIdDisplay(user.uid);
            // Use the correct appId from firebaseConfig if it's different from the constant appId
            // Based on your firebaseConfig [3], your appId is "1:611374798340:web:f57acbf580012df5ef4751"
            // and your security rules use {appId}. Make sure the appId here matches your security rules.
            const currentAppId = firebaseConfig.appId; // Or use the constant 'appId' if it matches your rules
            salesCollection = collection(db, `artifacts/${currentAppId}/public/data/sales`);

            // Dispara el filtro inicial para cargar los datos de hoy
            setFilter({ type: 'today' });

            // Assuming you have a function to show the main app content
            showMainContent(); // Call the function to show the main content
            toggleGlobalLoader(false); // Turn off loader after showing main content
        } else {
            // If no user is authenticated (neither email/password nor anonymous),
            // show the login form.
            showLoginForm(); // Call the function to show the login form
            toggleGlobalLoader(false); // Turn off loader after showing login form
        }
    } catch (error) {
        console.error("Error en el estado de autenticación:", error);
        showToast("No se pudo conectar al servidor.", "error");
        toggleGlobalLoader(false); // Also turn off loader in case of error
    }
}

