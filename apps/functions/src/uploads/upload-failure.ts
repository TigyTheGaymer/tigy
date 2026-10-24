import type { UploadError } from '@tigy/models';

/** A failure with a reason the owner can act on; anything else is `internal`. */
export class UploadFailure extends Error {
  constructor(readonly code: UploadError) {
    super(code);
  }
}
