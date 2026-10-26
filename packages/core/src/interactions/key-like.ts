/**
 * What interactions read from a key press. A DOM `KeyboardEvent`, React's `KeyboardEvent` and a
 * Soundor key event all have these fields, so adapters pass their events as they are.
 * Interactions only read the event: the adapter prevents its default when it acts on the intent.
 */
export interface KeyLike {
  /** The value of the key, as `KeyboardEvent.key` gives it: `'ArrowDown'`, `'a'`, `' '`… */
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}
