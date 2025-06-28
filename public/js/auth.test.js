import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn((db, path) => ({ db, path })),
}));

vi.mock('firebase/auth', () => {
  const onAuthStateChanged = vi.fn();
  const signInWithEmailAndPassword = vi.fn();
  return {
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged,
    signInWithEmailAndPassword,
    __onAuthStateChanged: onAuthStateChanged,
    __signInWithEmailAndPassword: signInWithEmailAndPassword,
  };
});

vi.mock('./state.js', () => ({
  setFilter: vi.fn(),
}));

vi.mock('./ui.js', () => {
  return {
    toggleGlobalLoader: vi.fn(),
    updateUserIdDisplay: vi.fn(),
    showToast: vi.fn(),
    showLoginForm: vi.fn(),
    showMainContent: vi.fn(),
  };
});

// --- Import after mocks ---
import * as authModule from './auth.js';
import * as firebaseAuth from 'firebase/auth';
import * as ui from './ui.js';

describe('auth.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initFirebase initializes Firebase and sets up auth state listener', () => {
    authModule.initFirebase();
    expect(ui.toggleGlobalLoader).toHaveBeenCalledWith(true);
    expect(authModule.db).toBeDefined();
    expect(authModule.auth).toBeDefined();
    expect(firebaseAuth.__onAuthStateChanged).toHaveBeenCalled();
  });

  it('signInWithEmail calls signInWithEmailAndPassword and toggles loader', async () => {
    firebaseAuth.__signInWithEmailAndPassword.mockResolvedValueOnce({});
    await authModule.signInWithEmail('test@example.com', 'pass');
    expect(ui.toggleGlobalLoader).toHaveBeenCalledWith(true);
    expect(firebaseAuth.__signInWithEmailAndPassword).toHaveBeenCalledWith(authModule.auth, 'test@example.com', 'pass');
    expect(ui.toggleGlobalLoader).toHaveBeenCalledWith(false);
  });

  it('signInWithEmail shows toast on error', async () => {
    firebaseAuth.__signInWithEmailAndPassword.mockRejectedValueOnce(new Error('fail'));
    await authModule.signInWithEmail('bad@example.com', 'bad');
    expect(ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Error al iniciar sesión'), 'error');
    expect(ui.toggleGlobalLoader).toHaveBeenCalledWith(false);
  });

  it('handleAuthState (user) shows main content and sets up salesCollection', async () => {
    const user = { uid: 'abc123' };
    const handleAuthState = authModule.__get__ ? authModule.__get__('handleAuthState') : authModule.handleAuthState;
    await handleAuthState(user);
    expect(ui.updateUserIdDisplay).toHaveBeenCalledWith('abc123');
    expect(authModule.salesCollection).toBeDefined();
    expect(ui.showMainContent).toHaveBeenCalled();
    expect(ui.toggleGlobalLoader).toHaveBeenCalledWith(false);
  });

  it('handleAuthState (no user) shows login form', async () => {
    const handleAuthState = authModule.__get__ ? authModule.__get__('handleAuthState') : authModule.handleAuthState;
    await handleAuthState(null);
    expect(ui.showLoginForm).toHaveBeenCalled();
    expect(ui.toggleGlobalLoader).toHaveBeenCalledWith(false);
  });
});