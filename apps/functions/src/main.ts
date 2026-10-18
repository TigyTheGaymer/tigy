import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/options';

// Firestore, Storage and Functions all live in Zurich (design A8).
// maxInstances caps every function by default for cost control; functions
// with tighter limits (such as upload processing) set their own.
setGlobalOptions({ region: 'europe-west6', maxInstances: 10 });

initializeApp();

// Keep the derived summaries under meta current (define-data-model, D4).
export { onImageWritten } from './images/sync-image';
export { onPersonWritten } from './people/sync-person';

// Owner-only tools for the admin.
export { rebuildSummariesCallable as rebuildSummaries } from './summaries/rebuild-summaries';
export { deletePersonCallable as deletePerson } from './people/delete-person';
