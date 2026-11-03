/**
 * An element an overlay effect works on, or a function that returns it: `null` or `undefined`
 * while the element is not rendered.
 *
 * Effects start as their machine enters a state, often inside the click handler that opens the
 * overlay, before React has rendered the open content (or, with `lazyMount`, mounted it at all).
 * Pass a getter that finds the element when called, such as
 * `() => document.getElementById(contentId)`, rather than an element from an earlier render.
 */
export type ElementSource<E extends Element = HTMLElement> =
  | E
  | null
  | undefined
  | (() => E | null | undefined);

/**
 * The element of a source now, or `null` while there is none.
 *
 * @example
 * const content = resolveElement(() => document.getElementById(contentId));
 */
export function resolveElement<E extends Element>(source: ElementSource<E>): E | null {
  const element = typeof source === 'function' ? source() : source;
  return element ?? null;
}

/** The phase of a start: `layer`, `inert` or `focus`, run in this order within a frame. */
export type StartPhase = 'layer' | 'inert' | 'focus';

/**
 * The phases of the starts that fall in the same frame, in the order they run. Layers come
 * first, so that a modal layer below already counts a new layer as above it, and takes `inert`
 * off its element, when the rest starts; focus comes last, once what it moves to is not inert.
 */
const PHASES: readonly StartPhase[] = ['layer', 'inert', 'focus'];

/** A start that waits for its frame or its element. */
interface PendingStart {
  readonly phase: number;
  /** Start if the element is there; `true` once started. */
  readonly attempt: () => boolean;
}

/** Starts waiting for their first frame, in call order. */
const queued: PendingStart[] = [];
/** Starts past their first frame, waiting for their element to be added to the document. */
const waiting: PendingStart[] = [];
let frame: number | null = null;
let observer: MutationObserver | null = null;

/** Remove `start` from `list`, if it is there. */
function removeFrom(list: PendingStart[], start: PendingStart): void {
  const index = list.indexOf(start);
  if (index !== -1) {
    list.splice(index, 1);
  }
}

/**
 * Attempt each start, phase by phase (call order within a phase), and return those whose element
 * is still missing. An error of one start does not stop the others: the first one is thrown
 * once all have run.
 */
function attempt(starts: readonly PendingStart[]): PendingStart[] {
  const left: PendingStart[] = [];
  const errors: unknown[] = [];
  for (const start of starts.toSorted((a, b) => a.phase - b.phase)) {
    try {
      if (!start.attempt()) {
        left.push(start);
      }
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw errors[0];
  }
  return left;
}

/** Watch the document for added elements while some start waits for one, and only then. */
function syncObserver(): void {
  if (waiting.length === 0) {
    observer?.disconnect();
    observer = null;
    return;
  }
  if (observer === null) {
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

function onFrame(): void {
  frame = null;
  const batch = queued.splice(0);
  try {
    waiting.push(...attempt(batch));
  } finally {
    syncObserver();
  }
}

function onMutations(): void {
  const batch = waiting.splice(0);
  try {
    waiting.push(...attempt(batch));
  } finally {
    syncObserver();
  }
}

/**
 * Run `start` with the element of `source` once it is rendered, and return the function that
 * stops it, or cancels the start that has not happened yet. The cleanup of a platform effect.
 *
 * The start waits for the next animation frame, by which React has committed the state that
 * started the effect: the content is mounted and shown. If the element is still missing then,
 * it waits until it is added to the document. Starts that fall in the same frame run by
 * `phase` (`layer`, `inert`, `focus`), then in call order.
 *
 * @example
 * const stop = whenRendered(() => document.getElementById(contentId), 'layer', (content) => {
 *   content.dataset.open = '';
 *   return () => {
 *     delete content.dataset.open;
 *   };
 * });
 */
export function whenRendered<E extends Element>(
  source: ElementSource<E>,
  phase: StartPhase,
  start: (element: E) => () => void,
): () => void {
  let stop: (() => void) | null = null;
  let done = false;
  const pending: PendingStart = {
    phase: PHASES.indexOf(phase),
    attempt: () => {
      // Stopped by an earlier start of the same batch: drop it.
      if (done) {
        return true;
      }
      const element = resolveElement(source);
      if (element === null) {
        return false;
      }
      stop = start(element);
      return true;
    },
  };
  queued.push(pending);
  frame ??= requestAnimationFrame(onFrame);
  return () => {
    if (done) {
      return;
    }
    done = true;
    removeFrom(queued, pending);
    removeFrom(waiting, pending);
    if (queued.length === 0 && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    syncObserver();
    stop?.();
  };
}
