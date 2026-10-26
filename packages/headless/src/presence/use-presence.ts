import { useCallback, useInsertionEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefCallback } from 'react';
import { flushSync } from 'react-dom';

/** Props of {@link usePresence}. */
export interface UsePresenceProps {
  /**
   * Whether the element is open: the state of its owner, such as the `open` state of a popover.
   * The owner renders it on the element as `data-state="open"` or `"closed"`, the attribute its
   * CSS animations key on.
   */
  readonly present: boolean;
  /**
   * Render nothing until `present` is `true` for the first time.
   *
   * @defaultValue false
   */
  readonly lazyMount?: boolean | undefined;
  /**
   * Unmount the element once it has closed, after its exit animation. Otherwise it stays
   * mounted, `hidden`.
   *
   * @defaultValue false
   */
  readonly unmountOnExit?: boolean | undefined;
  /**
   * Called each time the element has closed, once it is hidden or unmounted: when its exit
   * animation ends, or right after `present` turns `false` if it has none. Not called when
   * `present` turns `true` again during the exit, which cancels it.
   */
  readonly onExitComplete?: (() => void) | undefined;
}

/** Props for the element, and for the parts around it that show and hide with it. */
export interface PresenceAttributes {
  /** `true` while the element is mounted but closed, its exit animation over. */
  readonly hidden: boolean;
  /**
   * `true` while the exit animation runs: the closing element takes no clicks and no focus, and
   * is out of the accessibility tree.
   */
  readonly inert: boolean;
}

/** What {@link usePresence} returns. */
export interface UsePresenceReturn {
  /**
   * Whether to render the element: `false` before the first `present` with `lazyMount`, and
   * after the exit with `unmountOnExit`. A part renders `null` while it is `false`.
   */
  readonly mounted: boolean;
  /** Whether the element shows: while `present`, and until its exit animation ends. */
  readonly visible: boolean;
  /**
   * The ref of the element whose exit animation to wait for: the one that carries `data-state`.
   * Compose it with the part's own ref (`useComposedRefs`). Without an element, closing hides at
   * once.
   */
  readonly ref: RefCallback<Element>;
  /** `hidden` and `inert` for the element, and for parts that show and hide with it. */
  readonly getPresenceProps: () => PresenceAttributes;
}

/**
 * The CSS animations of an element: not its transitions, and not the animations of scripts or
 * of its children. None where the DOM has no Web Animations API, as in jsdom, where nothing
 * animates anyway.
 */
function cssAnimations(node: Element): CSSAnimation[] {
  if (!('getAnimations' in node)) {
    return [];
  }
  return node.getAnimations().filter((animation) => isCssAnimation(animation));
}

/** Whether an animation comes from the `animation` property: a `CSSAnimation`. */
function isCssAnimation(animation: Animation): animation is CSSAnimation {
  return 'animationName' in animation;
}

/** The names of the CSS animations an element has now. */
function animationNames(node: Element): ReadonlySet<string> {
  return new Set(cssAnimations(node).map((animation) => animation.animationName));
}

/** Whether an animation is still to end: neither finished nor cancelled. */
function isRunning(animation: Animation): boolean {
  return animation.playState !== 'finished' && animation.playState !== 'idle';
}

/** Whether an animation ever ends: an endless one is no exit to wait for. */
function hasEnd(animation: Animation): boolean {
  return animation.effect?.getComputedTiming().endTime !== Number.POSITIVE_INFINITY;
}

/**
 * The animations that closing started on the element: CSS animations whose names it did not have
 * while open, still running, with an end. An animation of both states keeps running and is no
 * exit; so is a closed state without `animation-name`, or one whose `@keyframes` are missing,
 * which the browser does not run.
 */
function exitAnimations(node: Element, openNames: ReadonlySet<string>): CSSAnimation[] {
  return cssAnimations(node).filter(
    (animation) =>
      !openNames.has(animation.animationName) && isRunning(animation) && hasEnd(animation),
  );
}

/**
 * Mount and unmount an element with an exit animation: the logic of `Presence`, for parts that
 * render their own element, such as the content of a popover. The owner renders `data-state`
 * from its own state, and the part renders `null` while `mounted` is `false`.
 *
 * - **Open** (`present`): the element is mounted and shows.
 * - **Closing**: once `present` is `false`, the owner's `data-state="closed"` applies. If that
 *   starts CSS animations on the element itself (an `animation-name` the open state did not
 *   have), the element stays mounted and shows, `inert`, until they end or are cancelled;
 *   animations of its children do not count. Otherwise it closes at once, before the browser
 *   paints. `present` again during the exit cancels it.
 * - **Closed**: the element is `hidden`, or unmounted with `unmountOnExit`; it is first mounted
 *   only once `present` is `true` with `lazyMount`. `onExitComplete` reports each close.
 *
 * Under `prefers-reduced-motion`, a closed state with a short animation or with none works the
 * same way. Give the closed state its own `@keyframes`: an animation that keeps its name, such
 * as the open one reversed, does not run again.
 *
 * @example
 * function Content({ open, ref, ...props }: ContentProps): ReactElement | null {
 *   const presence = usePresence({ present: open, unmountOnExit: true });
 *   const composedRef = useComposedRefs(presence.ref, ref);
 *   if (!presence.mounted) {
 *     return null;
 *   }
 *   const ownProps = { 'data-state': open ? 'open' : 'closed', ...presence.getPresenceProps() };
 *   return <Primitive.div {...mergeProps(ownProps, props)} ref={composedRef} />;
 * }
 *
 * @example
 * // One presence for several parts: the positioner shows and hides with the content, whose
 * // element runs the animation. Take `ref` apart, or compose it: the React Compiler's lint
 * // reports reads of an object whose member goes straight into a `ref` attribute.
 * const { mounted, ref, getPresenceProps } = usePresence({ present: open, unmountOnExit: true });
 * if (!mounted) {
 *   return null;
 * }
 * return (
 *   <div className="positioner" {...getPresenceProps()}>
 *     <div ref={ref} className="content" data-state={state} {...getPresenceProps()} />
 *   </div>
 * );
 */
export function usePresence({
  present,
  lazyMount = false,
  unmountOnExit = false,
  onExitComplete,
}: UsePresenceProps): UsePresenceReturn {
  // `shown`: open, or closed but still running the exit animation. `opened`: open at least once.
  const [state, setState] = useState(() => ({ shown: present, opened: present }));
  if (present && !state.shown) {
    // Shows in this very render: React renders the component again at once, before its children.
    setState({ shown: true, opened: true });
  }
  const shown = present || state.shown;
  const opened = present || state.opened;
  const exiting = !present && state.shown;

  const nodeRef = useRef<Element | null>(null);
  // The names of the animations the element has while open: the closed state keeps those
  // running, so they are no exit.
  const openNames = useRef<ReadonlySet<string>>(new Set());
  // Set when the exit ends, until the commit that hides the element reports it.
  const exitEnded = useRef(false);
  const onExitCompleteRef = useRef(onExitComplete);
  useInsertionEffect(() => {
    onExitCompleteRef.current = onExitComplete;
  });

  const ref = useCallback((node: Element | null) => {
    nodeRef.current = node;
    // An element mounted after the commit that opened it, as into a portal after hydration.
    if (node !== null) {
      openNames.current = animationNames(node);
    }
  }, []);

  useLayoutEffect(() => {
    if (present && nodeRef.current !== null) {
      openNames.current = animationNames(nodeRef.current);
    }
  }, [present]);

  useLayoutEffect(() => {
    if (!exiting) {
      return undefined;
    }
    const finish = (): void => {
      exitEnded.current = true;
      setState({ shown: false, opened: true });
    };
    const node = nodeRef.current;
    // Read after the commit that closed it: the closed state's animations have started.
    const animations = node === null ? [] : exitAnimations(node, openNames.current);
    if (animations.length === 0) {
      // In a layout effect: React renders the change before the browser paints.
      finish();
      return undefined;
    }
    let waiting = true;
    const waitForEnd = async (): Promise<void> => {
      // `finished` settles when an animation ends (`animationend`) or is cancelled
      // (`animationcancel`), even one cancelled before it started, for which the browser sends
      // no event. It belongs to these animations alone: never a child's, nor an earlier exit's.
      await Promise.allSettled(animations.map((animation) => animation.finished));
      if (waiting) {
        // In the frame the last animation ends: committed before the browser paints the element
        // without its animation.
        flushSync(finish);
      }
    };
    void waitForEnd();
    return () => {
      waiting = false;
    };
  }, [exiting]);

  useLayoutEffect(() => {
    if (!state.shown && exitEnded.current) {
      exitEnded.current = false;
      onExitCompleteRef.current?.();
    }
  }, [state.shown]);

  return {
    mounted: shown || (opened ? !unmountOnExit : !lazyMount),
    visible: shown,
    ref,
    getPresenceProps: () => ({ hidden: !shown, inert: exiting }),
  };
}
