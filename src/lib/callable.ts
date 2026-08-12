import { app } from './firebase';
import { handleMockCallable } from './mockStore';

export const FUNCTIONS_REGION = 'asia-southeast1';

/**
 * Invoke a Cloud Functions callable and return its unwrapped `.data`.
 * Falls back to mock store if Firebase is unconfigured or call fails.
 */
export async function callable<Req, Res>(name: string, args: Req): Promise<Res> {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.length < 10) {
    return handleMockCallable(name, args) as Res;
  }

  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const fn = httpsCallable<Req, Res>(getFunctions(app, FUNCTIONS_REGION), name);
    
    // Add a 2-second timeout to prevent hanging when Cloud Functions are not deployed or network is slow
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Callable "${name}" request timed out`)), 2000)
    );
    const res = await Promise.race([fn(args), timeout]);
    return res.data;
  } catch (err) {
    console.warn(`[Firebase Callable "${name}" fallback to MockStore]`, err);
    return handleMockCallable(name, args) as Res;
  }
}

