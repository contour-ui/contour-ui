/*
 * The web half of the harness: Chromium in Vitest's browser mode, React DOM, real input through
 * Playwright. The UI renders in a pad of room, so a drag has somewhere to go and the mouse
 * somewhere to rest.
 */
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import type { Drawing, Harness, QueryOptions, Semantics, Shape } from './harness.ts';

export type {
  Drawing,
  Harness,
  HarnessRole,
  KeyOptions,
  PointerOptions,
  QueryOptions,
  Rendered,
  Semantics,
  Shape,
} from './harness.ts';

/** A Playwright locator: the handle of an element on the web. */
export type Handle = Locator;

/** The test id of the pad around every render. */
const PAD = 'harness-pad';

const locate = (role: string, options: QueryOptions = {}): Locator =>
  page.getByRole(role, options.name === undefined ? {} : { name: options.name, exact: true });

const numberOf = (element: Element, name: string): number | undefined => {
  const value = element.getAttribute(name);
  return value === null ? undefined : Number(value);
};

/** The text of the elements an id list points at, joined as accname joins it. */
function textOfIds(ids: string | null): string {
  if (ids === null) {
    return '';
  }
  return ids
    .split(/\s+/u)
    .filter((id) => id !== '')
    .map((id) => document.querySelector(`#${CSS.escape(id)}`)?.textContent.trim() ?? '')
    .filter((text) => text !== '')
    .join(' ');
}

function semantics(handle: Locator): Semantics {
  const element = handle.element();
  return {
    role: element.getAttribute('role') ?? (element.localName === 'button' ? 'button' : undefined),
    name: nameOf(element),
    description: textOfIds(element.getAttribute('aria-describedby')),
    value: {
      min: numberOf(element, 'aria-valuemin'),
      max: numberOf(element, 'aria-valuemax'),
      now: numberOf(element, 'aria-valuenow'),
      text: element.getAttribute('aria-valuetext') ?? undefined,
    },
    disabled: element.getAttribute('aria-disabled') === 'true' || element.matches(':disabled'),
  };
}

/**
 * The accessible name, as accname finds it for the elements of these tests: the text of
 * `aria-labelledby`, else `aria-label`, else the content of a button.
 */
function nameOf(element: Element): string {
  const labelled = textOfIds(element.getAttribute('aria-labelledby'));
  if (labelled !== '') {
    return labelled;
  }
  const label = element.getAttribute('aria-label');
  if (label !== null && label !== '') {
    return label;
  }
  const role = element.getAttribute('role') ?? (element.localName === 'button' ? 'button' : '');
  return role === 'button' ? element.textContent.trim().replaceAll(/\s+/gu, ' ') : '';
}

/** The fields of a shape, each `undefined` where the element does not set it. */
type ShapeFields = { readonly [Key in Exclude<keyof Shape, 'type'>]?: Shape[Key] | undefined };

/** A shape with the fields that are set; numbers in single precision, as Soundor's scene keeps them. */
function shapeOf(type: Shape['type'], fields: ShapeFields): Shape {
  const shape: Record<string, unknown> = { type };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      shape[key] = typeof value === 'number' ? Math.fround(value) : value;
    }
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- built from the fields of a Shape.
  return shape as unknown as Shape;
}

const textOf = (element: Element, name: string): string | undefined =>
  element.getAttribute(name) ?? undefined;

function drawing(handle: Locator): Drawing {
  const svg = handle.element();
  if (svg.localName !== 'svg') {
    throw new Error(`No vector drawing on a <${svg.localName}>.`);
  }
  const shapes: Shape[] = [];
  for (const element of svg.children) {
    const type = element.localName;
    if (type !== 'path' && type !== 'line') {
      continue;
    }
    const fields: ShapeFields = {
      stroke: textOf(element, 'stroke'),
      strokeWidth: numberOf(element, 'stroke-width'),
      strokeLinecap: textOf(element, 'stroke-linecap'),
      strokeLinejoin: textOf(element, 'stroke-linejoin'),
      fill: textOf(element, 'fill'),
      color: textOf(element, 'color'),
      opacity: numberOf(element, 'opacity'),
    };
    shapes.push(
      type === 'path'
        ? shapeOf('path', { ...fields, d: textOf(element, 'd') })
        : shapeOf('line', {
            ...fields,
            x1: numberOf(element, 'x1'),
            y1: numberOf(element, 'y1'),
            x2: numberOf(element, 'x2'),
            y2: numberOf(element, 'y2'),
          }),
    );
  }
  const viewBox = svg.getAttribute('viewBox');
  return {
    viewBox:
      viewBox === null
        ? undefined
        : viewBox
            .trim()
            .split(/[\s,]+/u)
            .map((number) => Math.fround(Number(number))),
    shapes,
  };
}

/** The elements whose own text, trimmed, is `text`: the innermost ones that show it. */
function elementsShowing(text: string): Element[] {
  return [...document.body.querySelectorAll('*')].filter(
    (element) =>
      element.textContent.trim() === text &&
      ![...element.children].some((child) => child.textContent.trim() === text),
  );
}

/** The UI in a pad of room around it: for drags to go, and for the mouse to rest away from it. */
const inPad = (ui: ReactElement): ReactElement =>
  createElement(
    'div',
    { 'data-testid': PAD, style: { padding: '160px 48px', width: 'max-content' } },
    ui,
  );

/** Run `run` with Shift held, if asked. */
async function withShift<T>(shiftKey: boolean | undefined, run: () => Promise<T>): Promise<T> {
  if (shiftKey !== true) {
    return run();
  }
  await userEvent.keyboard('{Shift>}');
  try {
    return await run();
  } finally {
    await userEvent.keyboard('{/Shift}');
  }
}

/** The web harness: one test file, Chromium and React DOM. */
export const harness: Harness<Locator> = {
  platform: 'web',
  render: async (ui) => {
    const screen = await render(inPad(ui));
    return {
      rerender: (next) => screen.rerender(inPad(next)),
      unmount: () => screen.unmount(),
    };
  },
  getByRole: (role, options) => {
    const locator = locate(role, options);
    // Throws now, as Soundor's query does, when there is no such element or more than one.
    locator.element();
    return locator;
  },
  queryByRole: (role, options) => {
    const locator = locate(role, options);
    return locator.query() === null ? null : locator;
  },
  semantics,
  drawing,
  hasFocus: (handle) => document.activeElement === handle.element(),
  focusVisible: (handle) => handle.element().matches(':focus-visible'),
  hasText: (text) => elementsShowing(text).length > 0,
  readsText: (text) =>
    elementsShowing(text).some((element) => element.closest('[aria-hidden="true"]') === null),
  keyDown: (handle, key, options = {}) => {
    const event = new KeyboardEvent('keydown', {
      ...options,
      key,
      bubbles: true,
      cancelable: true,
    });
    handle.element().dispatchEvent(event);
    return event.defaultPrevented;
  },
  advanceTime: async (ms) => {
    await vi.advanceTimersByTimeAsync(ms);
  },
  user: {
    drag: (handle, dy, options = {}) =>
      withShift(options.shiftKey, async () => {
        // From the center of the element, `dy` pixels straight up or down, in four moves; the
        // pointer leaves the element on the way, so the moves reach it through its capture.
        const box = handle.element().getBoundingClientRect();
        const pad = page.getByTestId(PAD);
        const padBox = pad.element().getBoundingClientRect();
        await userEvent.dragAndDrop(handle, pad, {
          sourcePosition: { x: box.width / 2, y: box.height / 2 },
          targetPosition: {
            x: box.left - padBox.left + box.width / 2,
            y: box.top - padBox.top + box.height / 2 + dy,
          },
          steps: 4,
        });
      }),
    wheel: (handle, delta, options = {}) =>
      withShift(options.shiftKey, async () => {
        // Whether the default went, as seen once every handler of the element has run.
        let prevented = false;
        const listener = (event: WheelEvent): void => {
          prevented = event.defaultPrevented;
        };
        window.addEventListener('wheel', listener, { passive: true });
        try {
          await userEvent.wheel(handle, { delta: { x: delta.x ?? 0, y: delta.y ?? 0 } });
        } finally {
          window.removeEventListener('wheel', listener);
        }
        return prevented;
      }),
    keyboard: (keys) => userEvent.keyboard(keys),
    tab: () => userEvent.tab(),
    // Playwright waits for an `aria-disabled` element to turn enabled before it clicks it.
    press: (handle) => userEvent.click(handle, { force: true }),
    doublePress: (handle) => userEvent.dblClick(handle, { force: true }),
    hover: (handle) => userEvent.hover(handle),
    // A corner of the pad: padding, over none of the UI.
    unhover: () => userEvent.hover(page.getByTestId(PAD), { position: { x: 1, y: 1 } }),
  },
};
