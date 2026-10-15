import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/options';

// Firestore, Storage and Functions all live in Zurich (design A8).
// maxInstances caps every function by default for cost control; functions
// with tighter limits (such as upload processing) set their own.
setGlobalOptions({ region: 'europe-west6', maxInstances: 10 });

initializeApp();
