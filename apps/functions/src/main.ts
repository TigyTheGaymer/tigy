// Must stay the first import, before any function is defined.
import './global-options';

import { initializeApp } from 'firebase-admin/app';

initializeApp();

// Keep the derived summaries under meta current (define-data-model, D4).
export { onImageWritten } from './images/sync-image';
export { onPersonWritten } from './people/sync-person';

// Owner-only tools for the admin.
export { rebuildSummariesCallable as rebuildSummaries } from './summaries/rebuild-summaries';
export { deletePersonCallable as deletePerson } from './people/delete-person';
