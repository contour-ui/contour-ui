/** The longest delay `setTimeout` takes: a longer one overflows and fires at once. */
const MAX_DELAY = 2_147_483_647;

/**
 * The clock of the DOM platform (`Platform.schedule` of a machine): call `fire` after `ms`
 * milliseconds with `setTimeout`, and return the function that cancels it with `clearTimeout`.
 * Delays above the `setTimeout` limit (about 24.8 days), `Infinity` included, wait that long
 * instead of firing at once. The name of the delay, the third argument, is not needed here.
 *
 * @example
 * const platform: Platform<clipboard.Schema> = { schedule, actions: { writeText }, effects: {} };
 */
export function schedule(ms: number, fire: () => void): () => void {
  const id = setTimeout(fire, Math.min(ms, MAX_DELAY));
  return () => {
    clearTimeout(id);
  };
}
