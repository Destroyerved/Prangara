import { initializeApp, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function configured(): boolean {
  return Object.values(firebaseConfig).every((v) => typeof v === 'string' && v.length > 0);
}

// Lazy + guarded: Firebase never initializes at import time, so a deployment
// built without VITE_FIREBASE_* values renders instead of crashing the app.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function googleAuth(): Auth {
  app = app ?? initializeApp(firebaseConfig as Record<string, string>);
  auth = auth ?? getAuth(app);
  return auth;
}

function provider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
}

export async function signInWithGoogle(): Promise<string> {
  if (!configured()) {
    const error = new Error('Google sign-in is not configured for this deployment.') as Error & { code: string };
    error.code = 'auth/invalid-api-key';
    throw error;
  }
  const { signInWithPopup } = await import('firebase/auth');
  const result = await signInWithPopup(googleAuth(), provider());
  return await result.user.getIdToken();
}