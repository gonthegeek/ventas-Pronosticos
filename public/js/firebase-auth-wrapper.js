let getAuth, onAuthStateChanged, signInWithEmailAndPassword;
const authLoadPromise = (async () => {
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      ({ getAuth, onAuthStateChanged, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'));
    } else {
      ({ getAuth, onAuthStateChanged, signInWithEmailAndPassword } = await import('firebase/auth'));
    }
  } catch (e) {}
})();
export { getAuth, onAuthStateChanged, signInWithEmailAndPassword, authLoadPromise as __authLoadPromise };
