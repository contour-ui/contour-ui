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
 * A part's own ref and the user's in one callback ref, memoized: it keeps its identity until one
 * of them changes. Without a user's ref, the part's own is returned as is. The callback returns a
 * cleanup (React 19 ref cleanups) that undoes both.
 *
 * @example
 * const composedRef = useComposedRefs(own.ref, ref);
 * return <Svg {...mergeProps(own, props)} ref={composedRef} />;
 */
export function useComposedRefs<T>(own: Ref<T>, user: Ref<T> | undefined): Ref<T> {
  return useMemo<Ref<T>>(() => {
    if (user === undefined || user === null) {
      return own;
    }
    const composed: RefCallback<T> = (node) => {
      const cleanups = [attach(own, node), attach(user, node)];
      return () => {
        for (const cleanup of cleanups) {
          cleanup?.();
        }
      };
    };
    return composed;
  }, [own, user]);
}
