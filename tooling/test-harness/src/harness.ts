/*
 * The contract of the test harness: render a UI, find its elements and drive them with the same
 * calls on every platform, so one test file runs on the web (Chromium, real input through
 * Playwright) and in Soundor's simulated runtime (Node). A test speaks web: roles are ARIA roles,
 * names are accessible names. Each half translates with expectations of its own, never with the
 * tables of the backend under test, so a wrong translation fails the tests instead of passing
 * through both sides.
 */
import type { ReactElement } from 'react';

/** The roles shared tests ask for, in web words. */
export type HarnessRole = 'button' | 'img' | 'slider';

/** How assistive technology sees an element: the same fields on every platform. */
export interface Semantics {
  /** In web words: `slider` for Soundor's `adjustable`; `undefined` for none. */
  readonly role: string | undefined;
  /** The accessible name: the text of `aria-labelledby`, else `aria-label`; `''` for none. */
  readonly name: string;
  /** The accessible description: the text of `aria-describedby`; `''` for none. */
  readonly description: string;
  readonly value: {
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly now: number | undefined;
    readonly text: string | undefined;
  };
  readonly disabled: boolean;
}

/**
 * A shape of a vector drawing (an `svg`), as the platform draws it: its geometry and its paint,
 * each field only where the shape sets it. Numbers are in single precision on every platform, as
 * Soundor's scene keeps them: compare them with `Math.fround`.
 */
export interface Shape {
  readonly type: 'path' | 'line';
  /** The path data of a `path`. */
  readonly d?: string;
  readonly x1?: number;
  readonly y1?: number;
  readonly x2?: number;
  readonly y2?: number;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly strokeLinecap?: string;
  readonly strokeLinejoin?: string;
  readonly fill?: string;
  /** The color `currentColor` stands for, where the shape sets one of its own. */
  readonly color?: string;
  readonly opacity?: number;
}

/** A vector drawing: its view box and its shapes, in their order. */
export interface Drawing {
  /** `[minX, minY, width, height]`; `undefined` for none. */
  readonly viewBox: readonly number[] | undefined;
  /** The paths and lines directly inside the drawing. */
  readonly shapes: readonly Shape[];
}

/** A rendered UI. */
export interface Rendered {
  readonly rerender: (ui: ReactElement) => Promise<void>;
  readonly unmount: () => Promise<void>;
}

export interface QueryOptions {
  /** The accessible name, exactly. */
  readonly name?: string;
}

/** Options of a pointer action. */
export interface PointerOptions {
  /** Hold Shift through the action. */
  readonly shiftKey?: boolean;
}

/** The modifier keys held through a key. */
export interface KeyOptions {
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
}

/**
 * Render, find and drive a UI on one platform. `H` is the platform's handle of an element: a
 * `Locator` on the web, a `TestNode` on Soundor; tests pass it back to the harness and never
 * read it themselves.
 */
export interface Harness<H> {
  readonly platform: 'web' | 'soundor';
  readonly render: (ui: ReactElement) => Promise<Rendered>;
  readonly getByRole: (role: HarnessRole, options?: QueryOptions) => H;
  readonly queryByRole: (role: HarnessRole, options?: QueryOptions) => H | null;
  readonly semantics: (handle: H) => Semantics;
  /** The drawing of a vector element (an `svg`): its view box and shapes. */
  readonly drawing: (handle: H) => Drawing;
  readonly hasFocus: (handle: H) => boolean;
  /** As the platform shows it: `:focus-visible` on the web, `node.focusVisible` on Soundor. */
  readonly focusVisible: (handle: H) => boolean;
  /** Whether an element shows exactly this text (trimmed), read by assistive technology or not. */
  readonly hasText: (text: string) => boolean;
  /**
   * Whether assistive technology reads this text, shown outside a control, on its own: no
   * `aria-hidden` on the web, no `accessible={false}` on Soundor. Text that names or describes
   * an element may still be read as its name or description.
   */
  readonly readsText: (text: string) => boolean;
  /**
   * Dispatch a `keydown` at the element, as a key pressed while it has focus does, and return
   * whether a handler prevented its default (on the web, a scroll of the page).
   */
  readonly keyDown: (handle: H, key: string, options?: KeyOptions) => boolean;
  /**
   * Move the clock, with `vi.useFakeTimers()` on: the timers of the page on the web, the
   * simulated clock and Node's timers on Soundor.
   */
  readonly advanceTime: (ms: number) => Promise<void>;
  /**
   * Real input. Each press, drag and double press is a gesture of its own: never the second half
   * of a double press with the press before it, however soon it comes.
   */
  readonly user: {
    /** Press the primary button, move `dy` pixels (negative: up) in four moves, release. */
    readonly drag: (handle: H, dy: number, options?: PointerOptions) => Promise<void>;
    /**
     * Turn the wheel over the element, in pixels (`deltaMode` 0). Resolves with whether a
     * handler prevented the default: whether the wheel was kept from scrolling what is around.
     */
    readonly wheel: (
      handle: H,
      delta: { readonly x?: number; readonly y?: number },
      options?: PointerOptions,
    ) => Promise<boolean>;
    /** testing-library's keyboard syntax: `{ArrowUp}`, `{Shift>}{ArrowUp}{/Shift}`. */
    readonly keyboard: (keys: string) => Promise<void>;
    readonly tab: () => Promise<void>;
    /** A click: press and release in place, also on a disabled element. */
    readonly press: (handle: H) => Promise<void>;
    /** Two clicks in place, as fast as a double click. */
    readonly doublePress: (handle: H) => Promise<void>;
    /** Move a mouse over the element. */
    readonly hover: (handle: H) => Promise<void>;
    /** Move the mouse away from the element, over nothing of the UI. */
    readonly unhover: (handle: H) => Promise<void>;
  };
}
