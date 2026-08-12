import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type Auth, type User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let appInstance: FirebaseApp;
try {
  appInstance = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
} catch (e) {
  console.warn('[Firebase App Init Warning]', e);
  appInstance = getApps().length ? getApps()[0] : initializeApp({ apiKey: 'demo-key', projectId: 'demo-project' });
}
export const app = appInstance;

const appCheckSiteKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_V3_SITE_KEY as string | undefined;
if (appCheckSiteKey && firebaseConfig.apiKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('[Firebase AppCheck Init Warning]', e);
  }
}

let authInstance: Auth | null = null;
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    authInstance = getAuth(app);
  } catch (e) {
    console.warn('[Firebase Auth Init Warning]', e);
  }
}

export const auth = authInstance as Auth;

export const signInWithGoogle = async () => {
  let a = authInstance;
  if (!a) {
    try {
      a = getAuth(app);
    } catch (e) {
      console.warn('[Firebase signInWithGoogle Auth Error]', e);
      throw e;
    }
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(a, provider);
};

export const signOutUser = async () => {
  if (authInstance) {
    try {
      await signOut(authInstance);
    } catch (e) {
      console.warn('[Firebase SignOut Warning]', e);
    }
  }
};

export const onAuth = (cb: (user: User | null) => void) => {
  try {
    let a = authInstance;
    if (!a && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        a = getAuth(app);
      } catch {
        /* ignore */
      }
    }
    if (!a) {
      cb(null);
      return () => {};
    }
    return onAuthStateChanged(a, cb);
  } catch (e) {
    console.warn('[Firebase onAuth Warning]', e);
    cb(null);
    return () => {};
  }
};

