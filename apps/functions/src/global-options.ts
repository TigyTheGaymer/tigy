import { setGlobalOptions } from 'firebase-functions/options';

// Firestore, Storage and Functions all live in Zurich (design A8).
// maxInstances caps every function by default for cost control; functions
// with tighter limits (such as upload processing) set their own.
// main.ts imports this module first: functions read these options when they
// are defined, so setting them after the function modules load has no effect.
setGlobalOptions({ region: 'europe-west6', maxInstances: 10 });
