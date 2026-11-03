import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import type { DragOptions } from '../shared/services.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';
import { useDrag } from './use-drag.ts';
import { useInteraction } from './use-interaction.ts';

/** What a drag reported, in order: `start`, `move <dx> <dy>` (` shift`), `end <reason>`, `double`. */
type Log = string[];

interface DialProps extends Partial<Omit<DragOptions, 'onStart' | 'onMove' | 'onEnd'>> {
  readonly log: Log;
  /** A handler of the owner, which runs before the service's. */
  readonly onPointerDown?: (event: ReactPointerEvent) => void;
  /** Hears the focus of the dial and whether it shows, through the interaction service. */
  readonly onFocusChange?: (focused: boolean, focusVisible: boolean) => void;
}

/** What makes the dial a slider, in a spread as a part writes it. */
const SLIDER = { role: 'slider', 'aria-label': 'Dial', 'aria-valuenow': 0, tabIndex: 0 } as const;

/** A 40 px dial that drags, in a pad of room around it. */
function Dial({ log, onPointerDown, onFocusChange, ...options }: DialProps): ReactElement {
  const interaction = useInteraction({ onFocusChange });
  const drag = useDrag({
    disabled: false,
    readOnly: false,
    pointerLock: false,
    onStart: () => {
      log.push('start');
    },
    onMove: ({ deltaX, deltaY, shiftKey }) => {
      log.push(`move ${deltaX} ${deltaY}${shiftKey ? ' shift' : ''}`);
    },
    onEnd: (reason) => {
      log.push(`end ${reason}`);
    },
    onDoublePress: () => {
      log.push('double');
    },
    ...options,
  });
  return (
    <div data-testid="pad" style={{ padding: '120px 48px', width: 'max-content' }}>
      <Primitive.div
        {...mergeProps(drag.props, interaction.props, SLIDER, {
          style: { width: 40, height: 40 },
          onPointerDown,
        })}
      />
    </div>
  );
}

/** A dial that locks the pointer, and a button that removes it. */
function Removable({ log }: { readonly log: Log }): ReactElement {
  const [shown, setShown] = useState(true);
  return (
    <>
      {shown && <Dial log={log} pointerLock />}
      <button
        type="button"
        onClick={() => {
          setShown(false);
        }}
      >
        Remove
      </button>
    </>
  );
}

const dial = () => page.getByRole('slider', { name: 'Dial' });

/**
 * Drag the dial `dy` pixels down (up for a negative `dy`) with the mouse, in real input: down at
 * its center, four moves, up. The pointer leaves the dial on the way, so the moves reach it
 * through the pointer capture.
 */
async function dragBy(dy: number): Promise<void> {
  const box = dial().element().getBoundingClientRect();
  const pad = page.getByTestId('pad');
  const padBox = pad.element().getBoundingClientRect();
  await userEvent.dragAndDrop(dial(), pad, {
    sourcePosition: { x: box.width / 2, y: box.height / 2 },
    targetPosition: {
      x: box.left - padBox.left + box.width / 2,
      y: box.top - padBox.top + box.height / 2 + dy,
    },
    steps: 4,
  });
}

interface PressInit {
  readonly pointerType?: 'mouse' | 'touch' | 'pen';
  readonly pointerId?: number;
  readonly x?: number;
  readonly y?: number;
  /** The click count of a mouse press, the `detail` of its `mousedown`. */
  readonly clicks?: number;
}

/**
 * A press of the primary button in synthetic events, as the browser sends it: `pointerdown`,
 * then, for a mouse, the `mousedown` that carries the click count.
 */
function press(
  element: Element,
  { pointerType = 'mouse', pointerId = 1, x = 10, y = 10, clicks = 1 }: PressInit = {},
): void {
  const position = { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true };
  element.dispatchEvent(new PointerEvent('pointerdown', { ...position, pointerId, pointerType }));
  if (pointerType === 'mouse') {
    element.dispatchEvent(new MouseEvent('mousedown', { ...position, detail: clicks }));
  }
}

/** Another pointer event on the element: a mouse at `(10, 10)` unless `init` says otherwise. */
function send(element: Element, type: string, init: PointerEventInit = {}): void {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 10,
      clientY: 10,
      ...init,
    }),
  );
}

/** Wait a task, as for what the browser does after the events of one input. */
const nextTask = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve);
  });

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
});

/**
 * Stand in for the browser's pointer lock, which a test frame cannot take: `requestPointerLock`
 * and `exitPointerLock` change `pointerLockElement` and fire `pointerlockchange`, a task later.
 */
function fakePointerLock(element: Element) {
  let locked: Element | null = null;
  const change = (next: Element | null): void => {
    setTimeout(() => {
      locked = next;
      document.dispatchEvent(new Event('pointerlockchange'));
    });
  };
  Object.defineProperty(document, 'pointerLockElement', {
    configurable: true,
    get: () => locked,
  });
  const request = vi.spyOn(element, 'requestPointerLock').mockImplementation(() => {
    change(element);
    return Promise.resolve();
  });
  const exit = vi.spyOn(document, 'exitPointerLock').mockImplementation(() => {
    change(null);
  });
  cleanups.push(() => {
    Reflect.deleteProperty(document, 'pointerLockElement');
    request.mockRestore();
    exit.mockRestore();
  });
  return {
    request,
    exit,
    isLocked: () => locked === element,
    unlock: () => {
      change(null);
    },
  };
}

describe('useDrag', () => {
  it('drags through the pointer capture, in the client pixels of each move', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);

    await dragBy(-100);

    expect(log).toStrictEqual([
      'start',
      'move 0 -25',
      'move 0 -25',
      'move 0 -25',
      'move 0 -25',
      'end release',
    ]);
    // The press focused the dial, as a mouse press does.
    await expect.element(dial()).toHaveFocus();
  });

  it('keeps the page still under a touch drag and selects no text', async () => {
    await render(<Dial log={[]} />);

    const { style } = dial().element();
    const values = ['touch-action', 'user-select', '-webkit-user-select'].map((name) =>
      style.getPropertyValue(name),
    );

    expect(values).toStrictEqual(['none', 'none', 'none']);
  });

  it('passes Shift with the moves', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);

    await userEvent.keyboard('{Shift>}');
    await dragBy(50);
    await userEvent.keyboard('{/Shift}');

    expect(log.filter((entry) => entry.startsWith('move'))).toStrictEqual([
      'move 0 12.5 shift',
      'move 0 12.5 shift',
      'move 0 12.5 shift',
      'move 0 12.5 shift',
    ]);
  });

  it('takes the second press of a double click as a double press, which drags nothing', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);

    await userEvent.dblClick(dial());

    // One drag for the first press; the second resets, at its press.
    expect(log).toStrictEqual(['start', 'end release', 'double']);

    // The press after a double press begins anew.
    await userEvent.dblClick(dial());
    expect(log).toStrictEqual(['start', 'end release', 'double', 'start', 'end release', 'double']);
  });

  it('takes a press that moved 4 px or less as still, and one that moved more, sideways too, as a drag', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);
    const element = dial().element();

    // 2 px to the right and 2 down: 4 in all, still the first half of a double press.
    press(element);
    send(element, 'pointermove', { clientX: 12, clientY: 12 });
    send(element, 'pointerup', { clientX: 12, clientY: 12 });
    press(element, { x: 12, y: 12, clicks: 2 });
    send(element, 'pointerup', { clientX: 12, clientY: 12 });
    expect(log).toStrictEqual(['start', 'move 2 2', 'end release', 'double']);

    // 5 px to the right: the second click of the system is a press of its own.
    log.length = 0;
    press(element);
    send(element, 'pointermove', { clientX: 15 });
    send(element, 'pointerup', { clientX: 15 });
    press(element, { x: 15, clicks: 2 });
    send(element, 'pointerup', { clientX: 15 });
    expect(log).toStrictEqual(['start', 'move 5 0', 'end release', 'start', 'end release']);
  });

  it('takes a quick click after a drag as no double press', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);
    const element = dial().element();

    // The release of a drag is a click to the browser, so the next click counts as a second.
    press(element);
    send(element, 'pointermove', { clientY: -30 });
    send(element, 'pointerup', { clientY: -30 });
    press(element, { y: -30, clicks: 2 });
    send(element, 'pointerup', { clientY: -30 });

    expect(log).toStrictEqual(['start', 'move 0 -40', 'end release', 'start', 'end release']);
  });

  it('tells a double press of a touch or a pen by time and place, at its pointerdown', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);
    const element = dial().element();

    // Two quick taps a pixel apart.
    press(element, { pointerType: 'touch', pointerId: 2 });
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 2 });
    press(element, { pointerType: 'touch', pointerId: 3, x: 11 });
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 3, clientX: 11 });
    expect(log).toStrictEqual(['start', 'end release', 'double']);

    // Two taps 10 px apart are two presses.
    log.length = 0;
    press(element, { pointerType: 'pen', pointerId: 4 });
    send(element, 'pointerup', { pointerType: 'pen', pointerId: 4 });
    press(element, { pointerType: 'pen', pointerId: 4, x: 20 });
    send(element, 'pointerup', { pointerType: 'pen', pointerId: 4, clientX: 20 });
    expect(log).toStrictEqual(['start', 'end release', 'start', 'end release']);

    // A tap after a touch drag is a press of its own too.
    log.length = 0;
    press(element, { pointerType: 'touch', pointerId: 5 });
    send(element, 'pointermove', { pointerType: 'touch', pointerId: 5, clientY: 15 });
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 5, clientY: 15 });
    press(element, { pointerType: 'touch', pointerId: 6 });
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 6 });
    expect(log).toStrictEqual(['start', 'move 0 5', 'end release', 'start', 'end release']);
  });

  it('focuses the element for a touch or a pen press, with no focus ring', async () => {
    const onFocusChange = vi.fn<(focused: boolean, focusVisible: boolean) => void>();
    await render(
      <>
        <button type="button">Before</button>
        <Dial log={[]} onFocusChange={onFocusChange} />
      </>,
    );
    page.getByRole('button', { name: 'Before' }).element().focus();

    press(dial().element(), { pointerType: 'touch', pointerId: 2 });
    send(dial().element(), 'pointerup', { pointerType: 'touch', pointerId: 2 });
    await expect.element(dial()).toHaveFocus();
    // A key shows the focus a press gave.
    await userEvent.keyboard('{ArrowUp}');

    expect(onFocusChange.mock.calls).toStrictEqual([
      [true, false],
      [true, true],
    ]);
  });

  it('ends the drag at a cancel, a lost capture and a context menu', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);
    const element = dial().element();

    press(element);
    send(element, 'pointercancel');
    press(element);
    send(element, 'lostpointercapture');
    press(element);
    element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    expect(log).toStrictEqual([
      'start',
      'end cancel',
      'start',
      'end lost',
      'start',
      'end contextmenu',
    ]);
  });

  it('takes a press after one that ended other than by its release as no double press', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);
    const element = dial().element();

    // A touch the platform cancelled, and a tap at once: it drags, as the cancel was no tap.
    press(element, { pointerType: 'touch', pointerId: 2 });
    send(element, 'pointercancel', { pointerType: 'touch', pointerId: 2 });
    press(element, { pointerType: 'touch', pointerId: 3 });
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 3 });
    expect(log).toStrictEqual(['start', 'end cancel', 'start', 'end release']);

    // A context menu took a press of the mouse: the next click is a press of its own.
    log.length = 0;
    press(element, { clicks: 3 });
    element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    press(element, { clicks: 2 });
    send(element, 'pointerup');
    expect(log).toStrictEqual(['start', 'end contextmenu', 'start', 'end release']);
  });

  it('lets the first pointer drag, and ends a drag whose release went astray', async () => {
    const log: Log = [];
    await render(<Dial log={log} />);
    const element = dial().element();

    press(element, { pointerType: 'touch', pointerId: 2 });
    // Another finger: it moves nothing.
    press(element, { pointerType: 'touch', pointerId: 3, x: 30 });
    send(element, 'pointermove', { pointerType: 'touch', pointerId: 3, clientY: 30 });
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 3 });
    expect(log).toStrictEqual(['start']);

    // The first finger presses again: its release never came.
    press(element, { pointerType: 'touch', pointerId: 2, x: 60 });
    expect(log).toStrictEqual(['start', 'end lost', 'start']);
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 2 });
  });

  it('keeps still when the owner prevents the default of the press', async () => {
    const log: Log = [];
    await render(
      <Dial
        log={log}
        onPointerDown={(event) => {
          event.preventDefault();
        }}
      />,
    );

    press(dial().element());
    press(dial().element(), { pointerType: 'touch', pointerId: 2 });
    await nextTask();

    expect(log).toStrictEqual([]);
  });

  it('drags a mouse press whose pointerdown an ancestor cancelled, from the next task', async () => {
    const log: Log = [];
    await render(
      <div
        onPointerDown={(event) => {
          event.preventDefault();
        }}
      >
        <Dial log={log} />
      </div>,
    );
    const element = dial().element();

    // No `mousedown` follows a cancelled `pointerdown`.
    send(element, 'pointerdown');
    expect(log).toStrictEqual([]);
    await nextTask();
    send(element, 'pointermove', { clientY: 20 });
    send(element, 'pointerup', { clientY: 20 });

    expect(log).toStrictEqual(['start', 'move 0 10', 'end release']);
  });

  it('starts nothing while disabled, and ends a drag as it turns disabled', async () => {
    const log: Log = [];
    const screen = await render(<Dial log={log} disabled />);
    const element = dial().element();

    press(element);
    press(element, { pointerType: 'touch', pointerId: 2 });
    await nextTask();
    expect(log).toStrictEqual([]);
    // A disabled element takes no focus from a press.
    await expect.element(dial()).not.toHaveFocus();

    await screen.rerender(<Dial log={log} />);
    press(element);
    send(element, 'pointermove', { clientY: 15 });
    await screen.rerender(<Dial log={log} disabled />);
    send(element, 'pointermove', { clientY: 20 });
    send(element, 'pointerup', { clientY: 20 });

    expect(log).toStrictEqual(['start', 'move 0 5', 'end disabled']);
  });

  it('starts nothing while read-only, but a touch still focuses the element', async () => {
    const log: Log = [];
    await render(<Dial log={log} readOnly />);
    const element = dial().element();

    press(element);
    press(element, { pointerType: 'touch', pointerId: 2 });
    await nextTask();

    expect(log).toStrictEqual([]);
    await expect.element(dial()).toHaveFocus();
  });

  it('stops without onEnd when the element unmounts during a drag', async () => {
    const log: Log = [];
    await render(<Removable log={log} />);
    const lock = fakePointerLock(dial().element());

    press(dial().element());
    await expect.poll(lock.isLocked).toBe(true);
    await userEvent.click(page.getByRole('button', { name: 'Remove' }));

    await expect.poll(lock.isLocked).toBe(false);
    expect(lock.exit).toHaveBeenCalledOnce();
    expect(log).toStrictEqual(['start']);
  });
});

describe('useDrag pointer lock', () => {
  it('locks the pointer for a drag and takes the movement of the locked pointer', async () => {
    const log: Log = [];
    await render(<Dial log={log} pointerLock />);
    const element = dial().element();
    const lock = fakePointerLock(element);

    press(element);
    expect(lock.request).toHaveBeenCalledOnce();
    await expect.poll(lock.isLocked).toBe(true);
    // The locked pointer stays at (10, 10) and reports its movement.
    send(element, 'pointermove', { movementX: 3, movementY: -40 });
    send(element, 'pointerup');

    expect(lock.exit).toHaveBeenCalledOnce();
    await expect.poll(lock.isLocked).toBe(false);
    expect(log).toStrictEqual(['start', 'move 3 -40', 'end release']);
  });

  it('ends the drag when the user leaves the lock, and gives back a lock granted late', async () => {
    const log: Log = [];
    await render(<Dial log={log} pointerLock />);
    const element = dial().element();
    const lock = fakePointerLock(element);

    press(element);
    await expect.poll(lock.isLocked).toBe(true);
    // Escape: the browser gives the lock back.
    lock.unlock();
    await expect.poll(() => log).toStrictEqual(['start', 'end lost']);

    // A click: released before the lock comes, which then goes back at once.
    press(element);
    send(element, 'pointerup');
    await expect.poll(() => lock.exit.mock.calls.length).toBe(1);
    await expect.poll(lock.isLocked).toBe(false);
    expect(log).toStrictEqual(['start', 'end lost', 'start', 'end release']);
  });

  it('drags with the pointer capture when the browser refuses the lock', async () => {
    const log: Log = [];
    await render(<Dial log={log} pointerLock />);
    const element = dial().element();
    // Refused as Chromium refuses a frame it will not lock: `pointerlockerror` and a rejected
    // promise. Faked, since whether a test frame gets the lock depends on the platform.
    const request = vi.spyOn(element, 'requestPointerLock').mockImplementation(() => {
      setTimeout(() => {
        document.dispatchEvent(new Event('pointerlockerror'));
      });
      return Promise.reject(new DOMException('The frame may not lock.', 'WrongDocumentError'));
    });
    cleanups.push(() => {
      request.mockRestore();
    });

    await dragBy(-100);

    expect(request).toHaveBeenCalledOnce();
    expect(log).toStrictEqual([
      'start',
      'move 0 -25',
      'move 0 -25',
      'move 0 -25',
      'move 0 -25',
      'end release',
    ]);
  });

  it('keeps a drag going when the lock takes the capture', async () => {
    const log: Log = [];
    await render(<Dial log={log} pointerLock />);
    const element = dial().element();
    const lock = fakePointerLock(element);

    press(element);
    await expect.poll(lock.isLocked).toBe(true);
    send(element, 'lostpointercapture');
    send(element, 'pointermove', { movementY: 8 });
    send(element, 'pointerup');

    expect(log).toStrictEqual(['start', 'move 0 8', 'end release']);
  });
});
