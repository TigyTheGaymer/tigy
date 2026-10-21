// Writes the real project's function parameters next to the built functions,
// so the owner's email never lands in the repository.
import { writeFileSync } from 'node:fs';

const ownerEmail = process.env.OWNER_EMAIL?.trim();
if (!ownerEmail) {
  console.error(
    "OWNER_EMAIL is not set. Set it to the owner's Google account before deploying the functions; " +
      'CI takes it from the GitHub repository secret OWNER_EMAIL.',
  );
  process.exit(1);
}

writeFileSync(
  'dist/apps/functions/.env.tigy-165cc',
  `OWNER_EMAIL=${ownerEmail}\n`,
);
