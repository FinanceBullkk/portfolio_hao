import { getFirestore, type Firestore } from 'firebase/firestore';
import { app } from './firebase';

let dbInstance: Firestore | null = null;
try {
  dbInstance = getFirestore(app);
} catch (e) {
  console.warn('[Firestore Init Warning]', e);
}

export const db = dbInstance as Firestore;

