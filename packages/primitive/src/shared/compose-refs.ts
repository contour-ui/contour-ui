import { useMemo } from 'react';
import type { Ref, RefCallback } from 'react';

/** Point `ref` at `node` and return what undoes it. */
function attach<T>(ref: Ref<T> | undefined, node: T | null): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup = ref(node);
    return () => {
      // React's own rule: a callback ref that returned no cleanup is detached with `null`.
      if (typeof cleanup === 'function') {
        cleanup();
      } else {
        ref(null);
      }
    };
  }
  if (ref === null || ref === undefined) {
    return undefined;
  }
  ref.current = node;
  return () => {
    ref.current = null;
  };
}

/**
 * Combine refs into one callback ref, so one element can feed several of them:
 * a part's own ref and the user's, or a part's ref and its `asChild` child's.
 *
 * Object refs get the node in `current`, callback refs are called with it;
 * `null` and `undefined` refs are skipped. The callback returns a cleanup
 * (React 19 ref cleanups) that undoes every ref, in order: it runs the cleanups
 * that callback refs returned, calls the other callback refs with `null`, and
 * sets object refs back to `null`.
 *
 * Every call returns a new function, and React re-attaches a ref whose identity
 * changes. Inside a component, use {@link useComposedRefs}, which keeps the
 * combined ref until one of the refs changes.
 *
 * @example
 * const ref = composeRefs(measureRef, (node) => setAnchor(node));
 */
export function composeRefs<T>(...refs: ReadonlyArray<Ref<T> | undefined>): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => attach(ref, node));
    return () => {
      for (const cleanup of cleanups) {
        cleanup?.();
      }
    };
  };
}

/**
 * {@link composeRefs} for two refs inside a component, memoized: the combined
 * ref keeps its identity until `first` or `second` changes. When one of them is
 * `null` or `undefined`, the other one is returned as is.
 *
 * @example
 * function Content({ ref, ...props }: ContentProps): ReactElement {
 *   const ownRef = useRef<HTMLDivElement>(null);
 *   const composedRef = useComposedRefs(ownRef, ref);
 *   return <div ref={composedRef} {...props} />;
 * }
 */
export function useComposedRefs<T>(
  first: Ref<T> | undefined,
  second: Ref<T> | undefined,
): Ref<T> | undefined {
  return useMemo(
    () => (first && second ? composeRefs(first, second) : (first ?? second)),
    [first, second],
  );
}
