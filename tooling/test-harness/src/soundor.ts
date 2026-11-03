/*
 * The Soundor half of the harness: the simulated runtime of `@soundor/testing-library`, in Node.
 * Shared tests speak web (`slider`); this half translates with its own expectations of Soundor's
 * roles (`adjustable`), never with the tables of the backend under test.
 */
import { advanceTime, fireEvent, render, screen, userEvent } from '@soundor/testing-library/react';

import type { Drawing, Harness, HarnessRole, QueryOptions, Semantics, Shape } from './harness.ts';

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

/** A node of the simulated runtime: the handle of an element on Soundor. */
export type Handle = ReturnType<typeof screen.getByRole>;

type User = ReturnType<typeof userEvent.setup>;
type SoundorRole = Parameters<typeof screen.getByRole>[0];

/**
 * What a test expects each shared role to be on Soundor: the harness's own table, not the
 * backend's, so a wrong translation fails the tests instead of passing through both sides.
 */
const EXPECTED_ROLES: { readonly [Role in HarnessRole]: SoundorRole } = {
  button: 'button',
  img: 'image',
  slider: 'adjustable',
};

/** The web role of a Soundor role, by the same table; a role outside it as it is. */
function webRoleOf(role: string | undefined): string | undefined {
  for (const [web, native] of Object.entries(EXPECTED_ROLES)) {
    if (native === role) {
      return web;
    }
  }
  return role;
}

const queryOf = (options: QueryOptions = {}): { name?: string } =>
  options.name === undefined ? {} : { name: options.name };

/** A label, unless it is empty. */
const labelOf = (node: Handle): string | undefined => {
  const { label } = node.accessibility;
  return label === undefined || label === '' ? undefined : label;
};

/**
 * The text of a node, as Soundor's semantic tree names a node from its content: the label of
 * each shown child, else the text of a text node, else the text of its own children, trimmed and
 * joined by spaces.
 */
function contentOf(node: Handle): string {
  if (node.type === 'text') {
    return node.text;
  }
  return node.children
    .filter((child) => child.style['display'] !== 'none')
    .map((child) => labelOf(child) ?? contentOf(child))
    .map((text) => text.trim())
    .filter((text) => text !== '')
    .join(' ');
}

function semantics(node: Handle): Semantics {
  const { role, hint, value, state } = node.accessibility;
  return {
    role: webRoleOf(role),
    name: labelOf(node) ?? contentOf(node),
    description: hint ?? '',
    value: { min: value?.min, max: value?.max, now: value?.now, text: value?.text },
    disabled: state?.disabled ?? false,
  };
}

/** The fields of a shape as the scene has them, each `undefined` where it is not set. */
type ShapeFields = { readonly [Key in Exclude<keyof Shape, 'type'>]?: Shape[Key] | undefined };

/** A shape with the fields that are set; numbers in single precision, as the scene keeps them. */
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

function drawing(node: Handle): Drawing {
  const scene = node.svgScene;
  if (scene === null) {
    throw new Error(`No vector drawing on a node of type ${node.type}.`);
  }
  const shapes: Shape[] = [];
  for (const child of scene.children) {
    if (child.type !== 'path' && child.type !== 'line') {
      continue;
    }
    const paint = child.presentation;
    const fields: ShapeFields = {
      stroke: paint?.stroke,
      strokeWidth: paint?.strokeWidth,
      strokeLinecap: paint?.strokeLinecap,
      strokeLinejoin: paint?.strokeLinejoin,
      fill: paint?.fill,
      color: paint?.color,
      opacity: paint?.opacity,
    };
    shapes.push(
      child.type === 'path'
        ? shapeOf('path', { ...fields, d: child.d })
        : shapeOf('line', { ...fields, x1: child.x1, y1: child.y1, x2: child.x2, y2: child.y2 }),
    );
  }
  return { viewBox: scene.viewBox?.map((number) => Math.fround(number)), shapes };
}

/** The simulated input of the current test, and the container of its last render. */
interface Session {
  readonly user: User;
  readonly container: Handle;
}

let session: Session | undefined;

function current(): Session {
  if (session === undefined) {
    throw new Error('Render something with harness.render() first.');
  }
  return session;
}

/**
 * Where the next gesture presses. The simulation stops its clock between events, so the presses
 * of a test come at the same moment: a press in the same place as the one before it would make a
 * double press with it, where the web, whose clicks are separate unless a test double-clicks,
 * makes none. Each gesture presses ten pixels away from the last, out of reach of a double press;
 * nothing else reads where a press is, since the simulation has no layout.
 */
let spot = 0;

function nextSpot(): { readonly clientX: number; readonly clientY: number } {
  spot += 10;
  return { clientX: spot, clientY: 0 };
}

/** The Soundor harness: one test file, the simulated runtime of Soundor. */
export const harness: Harness<Handle> = {
  platform: 'soundor',
  render: async (ui) => {
    const user = userEvent.setup();
    const view = await render(ui);
    session = { user, container: view.container };
    return { rerender: (next) => view.rerender(next), unmount: () => view.unmount() };
  },
  getByRole: (role, options) => screen.getByRole(EXPECTED_ROLES[role], queryOf(options)),
  queryByRole: (role, options) => screen.queryByRole(EXPECTED_ROLES[role], queryOf(options)),
  semantics,
  drawing,
  hasFocus: (node) => node.focused,
  focusVisible: (node) => node.focusVisible,
  hasText: (text) => screen.queryAllByText(text).length > 0,
  readsText: (text) => screen.queryAllByRole('text', { name: text }).length > 0,
  keyDown: (node, key, options = {}) =>
    fireEvent.keyDown(node, { ...options, key }).defaultPrevented,
  advanceTime: (ms) => advanceTime(ms),
  user: {
    drag: async (node, dy, options = {}) => {
      const at = nextSpot();
      const shiftKey = options.shiftKey ?? false;
      fireEvent.pointerDown(node, { ...at, shiftKey });
      for (let move = 1; move <= 4; move++) {
        // Soundor reports the movement of a press, locked or not: the knob reads only that.
        fireEvent.pointerMove(node, {
          clientX: at.clientX,
          clientY: at.clientY + (dy * move) / 4,
          movementY: dy / 4,
          shiftKey,
        });
      }
      fireEvent.pointerUp(node, { clientX: at.clientX, clientY: at.clientY + dy, shiftKey });
      await Promise.resolve();
    },
    wheel: async (node, delta, options = {}) => {
      const event = fireEvent(node, 'wheel', {
        deltaX: delta.x ?? 0,
        deltaY: delta.y ?? 0,
        deltaMode: 0,
        shiftKey: options.shiftKey ?? false,
      });
      await Promise.resolve();
      return event.defaultPrevented;
    },
    keyboard: (keys) => current().user.keyboard(keys),
    tab: () => current().user.tab(),
    press: async (node) => {
      const at = nextSpot();
      // The mouse comes over the element first. The simulation skips that for a disabled
      // element, but the press reaches it, as a click reaches a disabled control on the web.
      await current().user.pointer({ target: node, ...at });
      fireEvent.pointerDown(node, at);
      fireEvent.pointerUp(node, at);
    },
    doublePress: async (node) => {
      const at = nextSpot();
      await current().user.pointer({ target: node, ...at });
      // Two presses at the same moment of the simulated clock, in the same place.
      for (let press = 0; press < 2; press++) {
        fireEvent.pointerDown(node, at);
        fireEvent.pointerUp(node, at);
      }
    },
    hover: (node) => current().user.pointer({ target: node }),
    // Over the container of the render: in the UI, but over none of its elements.
    unhover: () => current().user.pointer({ target: current().container }),
  },
};
