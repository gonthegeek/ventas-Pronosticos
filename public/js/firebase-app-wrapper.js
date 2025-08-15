// Lazy wrapper to support browser (CDN) and node/vitest (npm package)
let _initializeApp;
async function load() {
  if (_initializeApp) return;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const mod = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
    _initializeApp = mod.initializeApp;
  } else {
    const mod = await import('firebase/app');
    _initializeApp = mod.initializeApp;
  }
}
export function initializeApp(config) {
  if (_initializeApp) return _initializeApp(config);
  return load().then(() => _initializeApp(config));
}
