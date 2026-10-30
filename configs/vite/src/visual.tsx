/**
 * Screenshot tests of the styled packages (`*.visual.test.tsx`, `vp run visual`): each state of a
 * component drawn on the canvas of an app page in every theme, compared with its committed
 * screenshot, and checked with axe in the default theme.
 */
import axe from 'axe-core';
import type { CSSProperties, ReactElement } from 'react';
import { expect, it } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

/** How a package draws its states: its themes and the look of the canvas, from its tokens. */
export interface VisualOptions {
  readonly themes: readonly string[];
  readonly defaultTheme: string;
  /** The attribute that switches the theme of a subtree (`themeAttribute` of the tokens). */
  readonly attribute: string;
  /** Style of the canvas in each theme: token background, text color, font. */
  readonly canvas: CSSProperties;
  /** Wraps every state, such as in the providers of a docs site. */
  readonly wrap?: (ui: ReactElement) => ReactElement;
}

/** One state of a component, screenshotted in every theme. */
export interface VisualState {
  readonly render: () => ReactElement;
  /**
   * What the screenshot shows: the canvas (the default), or the whole page, for overlays, which
   * render under `<body>`, outside the canvas.
   */
  readonly target?: 'canvas' | 'page';
  /** At the size of a phone, 390×844, instead of 1280×720. */
  readonly phone?: boolean;
  /** Whether the canvas has a padding of 1rem (the default); a layout drawn to the edges has none. */
  readonly padded?: boolean;
  /** The element that has the focus once the state is ready, such as the x of an open dialog. */
  readonly focused?: () => Locator;
  /** Runs between the render and the checks: open a menu, type in a field… */
  readonly ready?: () => Promise<void>;
  /** Whether axe checks the state in the default theme (the default). Say why in a comment if not. */
  readonly axe?: boolean;
}

export const VIEWPORT = { width: 1280, height: 720 } as const;
export const PHONE = { width: 390, height: 844 } as const;

/**
 * Waits for the animations and transitions running on the page to end, such as the entry of an
 * overlay: axe would judge the contrast of text still fading in. Endless ones are left alone.
 */
export async function animationsDone(): Promise<void> {
  const finite = document
    .getAnimations()
    .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
  // A cancelled animation rejects `finished`: it is over all the same.
  await Promise.allSettled(finite.map((animation) => animation.finished));
}

/**
 * Checks the page with every rule axe runs by default, but `region`: a component alone sits in no
 * landmark (the Storybook a11y checks skipped it too).
 */
export async function expectNoAxeViolations(context: Element = document.body): Promise<void> {
  const { violations } = await axe.run(context, { rules: { region: { enabled: false } } });
  expect(
    violations.map(
      ({ id, help, nodes }) =>
        `${id}: ${help} (${nodes.map(({ target }) => target.join(' ')).join(', ')})`,
    ),
  ).toEqual([]);
}

/**
 * Returns a function that defines one test per state and theme, `<state> in <theme>`, compared
 * with `__visual__/<test file>/<state>-<theme>.png`. Name states in lowercase words with dashes.
 */
export function defineVisualStates(
  options: VisualOptions,
): (states: Readonly<Record<string, VisualState>>) => void {
  const { themes, defaultTheme, attribute, canvas, wrap } = options;
  return (states) => {
    for (const [name, state] of Object.entries(states)) {
      for (const theme of themes) {
        it(`${name} in ${theme}`, async () => {
          const { width, height } = state.phone === true ? PHONE : VIEWPORT;
          await page.viewport(width, height);
          // Overlays that portal to <body> take the theme from <html>.
          document.documentElement.setAttribute(attribute, theme);
          document.body.style.margin = '0';
          const ui = state.render();
          const screen = await render(
            <div
              data-testid="visual-canvas"
              {...{ [attribute]: theme }}
              style={{
                boxSizing: 'border-box',
                minBlockSize: '100vh',
                padding: state.padded === false ? 0 : '1rem',
                ...canvas,
              }}
            >
              {wrap === undefined ? ui : wrap(ui)}
            </div>,
          );
          // Layout first, so that the faces in use start loading before we wait for them.
          document.body.getBoundingClientRect();
          await document.fonts.ready;
          await state.ready?.();
          if (state.focused !== undefined) {
            await expect.element(state.focused()).toHaveFocus();
          }
          await animationsDone();
          if (theme === defaultTheme && state.axe !== false) {
            await expectNoAxeViolations();
          }
          const target =
            state.target === 'page'
              ? page.elementLocator(document.body)
              : screen.getByTestId('visual-canvas');
          await expect.element(target).toMatchScreenshot(`${name}-${theme}`);
        });
      }
    }
  };
}
