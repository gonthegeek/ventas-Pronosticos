let getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut;
const authLoadPromise = (async () => {
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      ({ getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'));
    } else {
      ({ getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } = await import('firebase/auth'));
    }
  } catch (e) {}
})();
export { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, authLoadPromise as __authLoadPromise };
