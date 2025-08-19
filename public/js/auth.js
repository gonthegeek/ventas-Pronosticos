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
            // Using standardized collection name from SRS: hourly_sales
            // Changed from 'sales' to 'hourly_sales' as per refactor-plan.json data model
            salesCollection = collection(db, `artifacts/app/public/data/hourly_sales`);

            // Trigger initial filter to load today's data
            setFilter({ type: 'today' });

            // Show the main app content
            showMainContent();
            toggleGlobalLoader(false);
        } else {
            // If no user is authenticated, show the login form
            showLoginForm();
            toggleGlobalLoader(false);
        }
    } catch (error) {
        console.error("Error en el estado de autenticación:", error);
        showToast("No se pudo conectar al servidor.", "error");
        toggleGlobalLoader(false);
    }
}

