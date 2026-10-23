// Must stay the first import, before any function is defined.
import './global-options';

import { initializeApp } from 'firebase-admin/app';

initializeApp();

// Keep the derived summaries under meta current.
export { onImageWritten } from './images/sync-image';
export { onPersonWritten } from './people/sync-person';

// Turn each upload into an unpublished artwork, and clean up cleared uploads.
export { processUpload } from './uploads/process-upload';
export { onUploadDeleted } from './uploads/clear-upload';

// Only the owner's account may be created, and it gets the owner claim.
export { beforeUserCreatedBlocking as beforeUserCreated } from './owner/before-user-created';

// Owner-only tools for the admin.
export { rebuildSummariesCallable as rebuildSummaries } from './summaries/rebuild-summaries';
export { deletePersonCallable as deletePerson } from './people/delete-person';
export { creditTigyCallable as creditTigy } from './people/credit-tigy';
