import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { listenForSales } from './api.js';
import { updateUserIdDisplay } from './ui.js';

// Configuración de tu proyecto de Firebase
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

// Variables exportadas para ser usadas en otros módulos
export let db;
export let auth;
export let salesCollection;

// Inicializa Firebase y la autenticación
export function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        onAuthStateChanged(auth, handleAuthState);
    } catch (e) {
        console.error("Error inicializando Firebase:", e);
    }
}

// Maneja los cambios en el estado de autenticación
async function handleAuthState(user) {
    if (user) {
        updateUserIdDisplay(user.uid);
        salesCollection = collection(db, `public_data/${appId}/sales`);
        listenForSales(salesCollection); // Empieza a escuchar los datos una vez autenticado
    } else {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Error en la autenticación anónima:", error);
        }
    }
}
