type Handler = (...args: unknown[]) => unknown;

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;

/** The props of every source of {@link mergeProps} combined into one type. */
export type MergedProps<T extends readonly object[]> = UnionToIntersection<T[number]>;

/** `onPointerDown`, `onKeyDown`…: `on` followed by an uppercase letter. */
const HANDLER_KEY = /^on[A-Z]/u;

const isHandler = (value: unknown): value is Handler => typeof value === 'function';

/** One handler that calls `first`, then `second`, with the same arguments. */
function chain(first: Handler, second: Handler): Handler {
  return (...args) => {
    first(...args);
    second(...args);
  };
}

/** A style, or the style a function of the state gives for `state`. */
const resolve = (style: unknown, state: unknown): unknown =>
  isHandler(style) ? style(state) : style;

/**
 * Two styles as one, the later winning per property: a list, as Soundor's `StyleProp` merges it.
 * A function of the state (the `style` of Pressable) makes the merge one too, of the same state.
 */
function mergeStyles(previous: unknown, next: unknown): unknown {
  if (isHandler(previous) || isHandler(next)) {
    return (state: unknown) => [resolve(previous, state), resolve(next, state)];
  }
  return [previous, next];
}

function mergeValue(key: string, previous: unknown, next: unknown): unknown {
  if (key === 'style' || key === 'textStyle') {
    return mergeStyles(previous, next);
  }
  if (HANDLER_KEY.test(key) && isHandler(previous) && isHandler(next)) {
    // The later handler runs first: user props come last, so the user's handler sees the event
    // before the built-in one, and its `event.preventDefault()` can keep the part still.
    return chain(next, previous);
  }
  return next;
}

/**
 * Merge prop objects into one, for a part that combines its own props with the user's:
 * `mergeProps(api.getControlProps(), props)`. Later sources take precedence; none of them is
 * modified. The same as the web build's, but for styles:
 *
 * - **Event handlers** (`on` + an uppercase letter, e.g. `onPointerDown`): every one runs, the
 *   last source's first, with the same arguments. A built-in handler that should yield to the
 *   user checks `event.defaultPrevented` itself.
 * - **`style`** and **`textStyle`**: a list of both, the later one winning per property. A
 *   function of the state (the `style` of `Primitive.button`) makes a function of the same state.
 * - **Anything else**, `ref` included: the last value wins. Use `useComposedRefs` to keep both.
 *
 * A key whose value is `undefined` is ignored, so passing `undefined` never removes an earlier
 * value, and no `undefined` reaches a Soundor prop.
 *
 * @example
 * mergeProps({ style: own, onKeyDown: first }, { style: user, onKeyDown: second });
 * // { style: [own, user], onKeyDown: (event) => { second(event); first(event); } }
 */
export function mergeProps<T extends readonly object[]>(...sources: T): MergedProps<T> {
  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    const entries: Array<[string, unknown]> = Object.entries(source);
    for (const [key, value] of entries) {
      if (value === undefined) {
        continue;
      }
      const previous = merged[key];
      merged[key] = previous === undefined ? value : mergeValue(key, previous, value);
    }
  }
  // `merged` is every source's props with later sources on top: what `MergedProps` describes.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return merged as MergedProps<T>;
}
