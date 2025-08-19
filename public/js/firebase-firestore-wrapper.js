let loaded = false;
let exportsCache = {};
async function load() {
  if (loaded) return exportsCache;
  let mod;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    mod = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
  } else {
    mod = await import('firebase/firestore');
  }
  exportsCache = mod;
  loaded = true;
  return mod;
}
function proxy(name) {
  return (...args) => {
    if (loaded) return exportsCache[name](...args);
    // Lazy path returns promise for first call; for simplicity in tests we load synchronously via then
    throw new Error('Firebase Firestore module not loaded yet: attempted to call ' + name);
  };
}
export { load as __loadFirestore }; // for potential manual preload
export const __firestoreLoadPromise = load();
export let getFirestore, collection, addDoc, query, onSnapshot, orderBy, doc, writeBatch, Timestamp, where, deleteDoc, getDocs, getDoc, setDoc, limit, startAfter;
// Preload immediately in browser; in node tests consumers will mock before usage
load().then(mod => {
  ({ getFirestore, collection, addDoc, query, onSnapshot, orderBy, doc, writeBatch, Timestamp, where, deleteDoc, getDocs, getDoc, setDoc, limit, startAfter } = mod);
}).catch(()=>{});
