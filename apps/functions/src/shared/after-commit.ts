import * as logger from 'firebase-functions/logger';

/**
 * Runs a cleanup step that follows a committed transaction. Its failure is
 * logged, not thrown: a trigger with `retry: true` would otherwise run the
 * transaction again and move the tag counts twice.
 */
export async function afterCommit(
  step: string,
  run: () => Promise<unknown>,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    logger.error(`${step} failed`, { error });
  }
}
