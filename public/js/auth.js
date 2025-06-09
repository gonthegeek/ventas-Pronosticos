import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { setFilter } from './state.js';
import { toggleGlobalLoader, updateUserIdDisplay, showToast } from './ui.js';

const firebaseConfig = {
    apiKey: "***REMOVED***",
    authDomain: "***REMOVED***",
    projectId: "***REMOVED***",
    storageBucket: "***REMOVED***.firebasestorage.app",
    messagingSenderId: "***REMOVED***",
    appId: "1:***REMOVED***:web:f57acbf580012df5ef4751",
    measurementId: "***REMOVED***"
};
const appId = 'ventas-pronosticos';

export let db;
export let auth;
export let salesCollection;

export function initFirebase() {
    toggleGlobalLoader(true);
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        onAuthStateChanged(auth, handleAuthState);
    } catch (e) {
        console.error("Error inicializando Firebase:", e);
        showToast("Error crítico al inicializar la aplicación.", "error");
        toggleGlobalLoader(false);
    }
}

async function handleAuthState(user) {
    try {
        if (user) {
            updateUserIdDisplay(user.uid);
            salesCollection = collection(db, `public_data/${appId}/sales`);
            // Dispara el filtro inicial para cargar los datos de hoy
            setFilter({ type: 'today' });
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Error en el estado de autenticación:", error);
        showToast("No se pudo conectar al servidor.", "error");
        toggleGlobalLoader(false);
    }
}