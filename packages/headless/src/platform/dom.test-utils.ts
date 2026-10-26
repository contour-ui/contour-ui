/** Wait for the next animation frame: overlay effects start in it (see `whenRendered`). */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

/** Render `html` into a new `div` at the end of the body, and return the `div`. */
export function mount(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  return container;
}

/** The element with an id, which must exist. */
export function byId(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (element === null) {
    throw new Error(`No #${id}.`);
  }
  return element;
}

/**
 * Cleanups to run after the test, last first: the overlay modules keep module-level stacks, so
 * a test must not leave a layer, a trap or a lock behind.
 */
export function createCleanups(): {
  readonly add: (cleanup: () => void) => () => void;
  readonly run: () => void;
} {
  const cleanups: Array<() => void> = [];
  return {
    add: (cleanup) => {
      cleanups.push(cleanup);
      return cleanup;
    },
    run: () => {
      for (const cleanup of cleanups.splice(0).toReversed()) {
        cleanup();
      }
    },
  };
}
