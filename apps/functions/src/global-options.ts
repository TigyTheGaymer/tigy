import { setGlobalOptions } from 'firebase-functions/options';

// Firestore, Storage and Functions all live in Zurich.
// maxInstances caps every function by default; functions with tighter limits (such as upload
// processing) set their own.
// main.ts imports this module first: functions read these options when they are defined.
setGlobalOptions({ region: 'europe-west6', maxInstances: 10 });
