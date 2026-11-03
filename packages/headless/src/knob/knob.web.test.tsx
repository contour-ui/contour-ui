/*
 * The Knob on the web only: its DOM (attributes, the custom properties of the root, `asChild`),
 * forms, the pointer lock of the browser, the click count of a mouse and axe. The behavior both
 * platforms share is in `knob.test.tsx`.
 */
import { formatDecibels, knob } from '@contour-ui/core';
import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import * as Knob from './index.ts';

type ChangeSpy = ReturnType<typeof changeSpy>;

const changeSpy = () => vi.fn<(details: knob.ValueChangeDetails) => void>();

/** The values a spy was called with, in order. */
const valuesOf = (spy: ChangeSpy): number[] => spy.mock.calls.map(([{ value }]) => value);

/** A labelled knob with every part, in a pad of room around it for drags. */
function Gain(props: Knob.RootProps): ReactElement {
  return (
    <div data-testid="pad" style={{ padding: '160px 48px', width: 'max-content' }}>
      <Knob.Root style={{ display: 'grid', justifyItems: 'center', gap: 4 }} {...props}>
        <Knob.Label>Gain</Knob.Label>
        <Knob.Control style={{ display: 'block', width: 40, height: 40 }}>
          <Knob.Track />
          <Knob.Range />
          <Knob.Thumb />
        </Knob.Control>
        <Knob.ValueText />
        <Knob.HiddenInput />
      </Knob.Root>
    </div>
  );
}

/** The element of a part. */
function part(container: HTMLElement, name: string): Element {
  const element = container.querySelector(`[data-scope="knob"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No knob ${name}.`);
  }
  return element;
}

const PARTS = [
  'root',
  'label',
  'control',
  'track',
  'range',
  'thumb',
  'value-text',
  'hidden-input',
] as const;

/** The slider of a render, by its name. */
const slider = (name = 'Gain') => page.getByRole('slider', { name });

/** The value of the slider, as `aria-valuenow` gives it. */
function currentValue(name = 'Gain'): number {
  return Number(slider(name).element().getAttribute('aria-valuenow'));
}

/**
 * Drag the control `dy` pixels down (up for a negative `dy`) with the primary button, in real
 * pointer events: down at its center, four moves, up. The pointer leaves the control on the way,
 * so the moves reach it through the pointer capture.
 */
async function dragBy(dy: number): Promise<void> {
  const control = slider().element();
  const pad = page.getByTestId('pad');
  const box = control.getBoundingClientRect();
  const padBox = pad.element().getBoundingClientRect();
  await userEvent.dragAndDrop(slider(), pad, {
    sourcePosition: { x: box.width / 2, y: box.height / 2 },
    targetPosition: {
      x: box.left - padBox.left + box.width / 2,
      y: box.top - padBox.top + box.height / 2 + dy,
    },
    steps: 4,
  });
}

/** `--knob-position` and `--knob-angle` of the root. */
function customProperties(root: Element): string[] {
  const style = getComputedStyle(root);
  return ['--knob-position', '--knob-angle'].map((name) => style.getPropertyValue(name));
}

/** Whether the control carries `data-dragging`, each time that changes. */
function watchDragging(element: Element): boolean[] {
  const seen: boolean[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      seen.push(record.oldValue === null);
    }
  });
  observer.observe(element, {
    attributes: true,
    attributeFilter: ['data-dragging'],
    attributeOldValue: true,
  });
  cleanups.push(() => {
    observer.disconnect();
  });
  return seen;
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
  window.scrollTo(0, 0);
});

/** The form of a render. */
function formOf(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form');
  if (form === null) {
    throw new Error('No form.');
  }
  return form;
}

/** Where a test's mouse is: `(10, 10)` unless an event says otherwise. */
const AT: PointerEventInit = { clientX: 10, clientY: 10 };

/**
 * A press of the mouse's primary button on the control, as the browser sends it: `pointerdown`,
 * then, unless a handler cancelled that, `mousedown` with the click count (`detail`: 2 for the
 * second click of a double click).
 */
function pressMouse(control: Element, init: PointerEventInit = {}, detail = 1): void {
  const pointer = { ...AT, ...init };
  const down = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons: 1,
    ...pointer,
  });
  if (control.dispatchEvent(down)) {
    control.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        detail,
        ...pointer,
      }),
    );
  }
}

/** A move of the mouse with the button held: at `(10, 10)` unless `init` says otherwise. */
function moveMouse(control: Element, init: PointerEventInit = {}): void {
  control.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      buttons: 1,
      ...AT,
      ...init,
    }),
  );
}

/** The release of the mouse's primary button: `pointerup`, then `mouseup`. */
function releaseMouse(control: Element, init: PointerEventInit = {}): void {
  const pointer = { ...AT, ...init };
  control.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      ...pointer,
    }),
  );
  control.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, ...pointer }));
}

/** A tap of a touch or a pen, which sends no click count: `pointerdown`, then `pointerup`. */
function tap(control: Element, pointerType: 'touch' | 'pen'): void {
  const init = {
    bubbles: true,
    cancelable: true,
    pointerId: 2,
    pointerType,
    isPrimary: true,
    button: 0,
    ...AT,
  };
  control.dispatchEvent(new PointerEvent('pointerdown', { ...init, buttons: 1 }));
  control.dispatchEvent(new PointerEvent('pointerup', init));
}

describe('Knob on the web', () => {
  it('renders an svg slider, vertical, with the attributes of its parts', async () => {
    const screen = await render(
      <Gain min={-60} max={12} defaultValue={-6} step={0.5} formatValue={formatDecibels} />,
    );
    const control = slider();

    expect(control.element().tagName).toBe('svg');
    await expect.element(control).toHaveAttribute('viewBox', '0 0 100 100');
    await expect.element(control).toHaveAttribute('aria-valuemin', '-60');
    await expect.element(control).toHaveAttribute('aria-valuemax', '12');
    await expect.element(control).toHaveAttribute('aria-valuenow', '-6');
    await expect.element(control).toHaveAttribute('aria-valuetext', '−6.0 dB');
    await expect.element(control).toHaveAttribute('aria-orientation', 'vertical');
    await expect.element(control).toHaveAttribute('tabindex', '0');
    await expect.element(control).not.toHaveAttribute('aria-disabled');
    await expect.element(control).not.toHaveAttribute('aria-readonly');
    // Input, not looks: a touch drag turns the knob instead of scrolling, and selects no text.
    await expect.element(control).toHaveStyle('touch-action: none; user-select: none');
    const label = part(screen.container, 'label');
    expect(label.tagName).toBe('SPAN');
    expect(control.element()).toHaveAttribute('aria-labelledby', label.id);
    // The readout shows the value, which the control carries for assistive technology.
    const valueText = part(screen.container, 'value-text');
    expect(valueText).toHaveTextContent('−6.0 dB');
    expect(valueText).toHaveAttribute('aria-hidden', 'true');
    for (const name of PARTS) {
      expect(part(screen.container, name)).not.toHaveAttribute('data-disabled');
    }
    expect(part(screen.container, 'root')).not.toHaveAttribute('aria-disabled');
    expect(part(screen.container, 'hidden-input')).toHaveAttribute('type', 'hidden');
  });

  it('draws with svg shapes and carries the position and angle as custom properties', async () => {
    const screen = await render(<Gain min={-1} max={1} origin={0} defaultValue={0.5} />);
    const root = part(screen.container, 'root');
    expect(part(screen.container, 'track').tagName).toBe('path');
    expect(part(screen.container, 'range').tagName).toBe('path');
    expect(part(screen.container, 'thumb').tagName).toBe('line');
    expect(customProperties(root)).toStrictEqual(['0.75', '67.5deg']);

    // At the origin, the range has no length.
    await screen.rerender(<Gain min={-1} max={1} origin={0} value={0} />);
    await expect.poll(() => currentValue()).toBe(0);
    expect(part(screen.container, 'range')).toHaveAttribute('d', '');
    expect(customProperties(root)).toStrictEqual(['0.5', '0deg']);
  });

  it('marks a drag with data-dragging, and shows no ring for the focus of the press', async () => {
    await render(<Gain />);
    const dragging = watchDragging(slider().element());

    await dragBy(-100);
    await expect.poll(() => currentValue()).toBe(50);
    expect(dragging).toStrictEqual([true, false]);
    await expect.element(slider()).toHaveFocus();
    await expect.element(slider()).not.toHaveAttribute('data-focus-visible');
  });

  it('keeps the page still under the wheel, and leaves it to the page while disabled', async () => {
    const screen = await render(
      <div style={{ blockSize: '300vh' }}>
        <Gain />
      </div>,
    );
    await userEvent.wheel(slider(), { delta: { y: -100 } });
    await expect.poll(() => currentValue()).toBe(5);
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
    expect(document.scrollingElement?.scrollTop).toBe(0);

    await screen.rerender(
      <div style={{ blockSize: '300vh' }}>
        <Gain disabled />
      </div>,
    );
    await userEvent.wheel(slider(), { delta: { y: 200 } });
    await expect.poll(() => document.scrollingElement?.scrollTop).toBeGreaterThan(0);
    expect(currentValue()).toBe(5);
  });

  it('marks the focus to show with data-focus-visible: after a key, not after a press', async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Gain />
      </>,
    );
    const control = slider();

    await userEvent.click(control);
    await expect.element(control).toHaveFocus();
    await expect.element(control).not.toHaveAttribute('data-focus-visible');
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(control).toHaveAttribute('data-focus-visible', '');

    await userEvent.click(page.getByRole('button', { name: 'Before' }));
    await expect.element(control).not.toHaveAttribute('data-focus-visible');
    await userEvent.keyboard('{Tab}');
    await expect.element(control).toHaveFocus();
    await expect.element(control).toHaveAttribute('data-focus-visible', '');
  });

  it('marks every part disabled, and takes the control out of the tab order', async () => {
    const screen = await render(<Gain disabled defaultValue={40} />);
    const control = slider();

    await expect.element(control).toHaveAttribute('aria-disabled', 'true');
    await expect.element(control).not.toHaveAttribute('tabindex');
    // The whole knob is inactive, its readout too.
    expect(part(screen.container, 'root')).toHaveAttribute('aria-disabled', 'true');
    for (const name of PARTS) {
      expect(part(screen.container, name)).toHaveAttribute('data-disabled', '');
    }
  });

  it('marks a read-only knob, which keeps its focus', async () => {
    const screen = await render(<Gain readOnly defaultValue={40} />);
    await expect.element(slider()).toHaveAttribute('aria-readonly', 'true');
    expect(part(screen.container, 'root')).toHaveAttribute('data-readonly', '');
    await expect.element(slider()).toHaveAttribute('tabindex', '0');
  });

  it('submits the value under its name with the form, unless disabled', async () => {
    const screen = await render(
      <form>
        <Gain name="gain" defaultValue={12.5} />
      </form>,
    );
    const form = formOf(screen.container);
    expect(new FormData(form).get('gain')).toBe('12.5');

    slider().element().focus();
    await userEvent.keyboard('{End}');
    expect(new FormData(form).get('gain')).toBe('100');

    await screen.rerender(
      <form>
        <Gain name="gain" defaultValue={12.5} disabled />
      </form>,
    );
    expect(new FormData(form).has('gain')).toBe(false);
  });

  it('belongs to the form it names', async () => {
    const screen = await render(
      <>
        <form id="preset" />
        <Gain name="gain" form="preset" defaultValue={3} />
      </>,
    );
    expect(new FormData(formOf(screen.container)).get('gain')).toBe('3');
  });

  it('points at a label id of the owner, and at no label without one', async () => {
    await render(
      <>
        <Knob.Root>
          <Knob.Label id="own-label">Drive</Knob.Label>
          <Knob.Control />
        </Knob.Root>
        <Knob.Root>
          <Knob.Control aria-label="Tone" />
        </Knob.Root>
      </>,
    );

    await expect.element(slider('Drive')).toHaveAttribute('aria-labelledby', 'own-label');
    await expect.element(slider('Tone')).not.toHaveAttribute('aria-labelledby');
  });

  it('renders its own SVG shapes with asChild', async () => {
    const screen = await render(
      <Knob.Root defaultValue={100}>
        <Knob.Control aria-label="Level">
          <Knob.Thumb asChild className="part">
            <line className="needle" strokeWidth={10} />
          </Knob.Thumb>
        </Knob.Control>
      </Knob.Root>,
    );
    const thumb = part(screen.container, 'thumb');
    const { x2, y2 } = knob.getGeometry(1, 0).thumb;

    expect(thumb).toHaveAttribute('class', 'part needle');
    expect(thumb).toHaveAttribute('x2', String(x2));
    expect(thumb).toHaveAttribute('y2', String(y2));
    // The child's own attributes win.
    expect(thumb).toHaveAttribute('stroke-width', '10');
  });

  it('ends a drag when a context menu takes the release', async () => {
    const onValueChangeEnd = changeSpy();
    await render(<Gain onValueChangeEnd={onValueChangeEnd} />);
    const control = slider().element();

    pressMouse(control);
    await expect.element(slider()).toHaveAttribute('data-dragging', '');
    control.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    await expect.element(slider()).not.toHaveAttribute('data-dragging');
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([0]);
  });

  it('ends a drag when it turns disabled, and its release ends nothing more', async () => {
    const onValueChangeEnd = changeSpy();
    const screen = await render(<Gain defaultValue={50} onValueChangeEnd={onValueChangeEnd} />);
    const control = slider().element();

    pressMouse(control);
    moveMouse(control, { clientY: -30 });
    await expect.poll(() => currentValue()).toBe(70);
    await screen.rerender(<Gain defaultValue={50} onValueChangeEnd={onValueChangeEnd} disabled />);
    await expect.element(slider()).not.toHaveAttribute('data-dragging');
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([70]);
    releaseMouse(control, { clientY: -30 });
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([70]);
  });

  it('throws for parts outside of a root, on the server too', () => {
    expect(() => renderToStaticMarkup(<Knob.Label>Lost</Knob.Label>)).toThrow(/Knob\.Root/u);
  });
});

/**
 * Stand in for the browser's pointer lock, which a test frame cannot take: `requestPointerLock`
 * and `exitPointerLock` change `pointerLockElement` and fire `pointerlockchange`, a task later.
 */
function fakePointerLock(control: Element) {
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
  const request = vi.spyOn(control, 'requestPointerLock').mockImplementation(() => {
    change(control);
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
    isLocked: () => locked === control,
    unlock: () => {
      change(null);
    },
  };
}

describe('Knob pointer lock on the web', () => {
  it('locks the pointer for a drag and takes the movement of the locked pointer', async () => {
    const onValueChangeEnd = changeSpy();
    await render(<Gain pointerLock onValueChangeEnd={onValueChangeEnd} />);
    const control = slider().element();
    const lock = fakePointerLock(control);

    pressMouse(control);
    expect(lock.request).toHaveBeenCalledOnce();
    await expect.poll(lock.isLocked).toBe(true);
    // Under the lock, the pointer stays at (10, 10) and reports its movement.
    moveMouse(control, { movementY: -40 });
    moveMouse(control, { movementY: -40 });
    await expect.poll(() => currentValue()).toBe(40);

    releaseMouse(control);
    expect(lock.exit).toHaveBeenCalledOnce();
    await expect.poll(lock.isLocked).toBe(false);
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([40]);
  });

  it('ends the drag when the user leaves the lock, and gives back a lock granted late', async () => {
    const onValueChangeEnd = changeSpy();
    await render(<Gain pointerLock onValueChangeEnd={onValueChangeEnd} />);
    const control = slider().element();
    const lock = fakePointerLock(control);

    pressMouse(control);
    await expect.poll(lock.isLocked).toBe(true);
    moveMouse(control, { movementY: -20 });
    // Escape: the browser gives the lock back.
    lock.unlock();
    await expect.element(slider()).not.toHaveAttribute('data-dragging');
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([10]);

    // A click: released before the lock comes, which then goes back at once.
    pressMouse(control);
    releaseMouse(control);
    await expect.poll(() => lock.exit.mock.calls.length).toBe(1);
    await expect.poll(lock.isLocked).toBe(false);
  });

  it('drags with the pointer capture when the browser refuses the lock', async () => {
    await render(<Gain pointerLock />);
    const control = slider().element();
    // Refused as Chromium refuses a frame it will not lock: `pointerlockerror` and a rejected
    // promise. Faked, since whether a test frame gets the lock depends on the platform (Linux
    // grants it, and then reports the moves of the test's mouse as one growing movement).
    const request = vi.spyOn(control, 'requestPointerLock').mockImplementation(() => {
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
    await expect.poll(() => currentValue()).toBe(50);
  });
});

describe('Knob double press on the web', () => {
  it('takes the second click of a mouse for a double press when the first went nowhere', async () => {
    await render(<Gain defaultValue={20} />);

    // The release of a drag is a click to the browser, and the next click is its second.
    await dragBy(-100);
    const control = slider().element();
    pressMouse(control, {}, 2);
    releaseMouse(control);
    await expect.poll(() => currentValue()).toBe(70);

    // A double click of two still clicks resets, at its second press.
    await userEvent.dblClick(slider());
    await expect.poll(() => currentValue()).toBe(20);
  });

  it('takes no second click after a locked drag for a double press', async () => {
    await render(<Gain pointerLock defaultValue={20} />);
    const control = slider().element();
    const lock = fakePointerLock(control);

    // Under the lock, the pointer stays at (10, 10): only its movement tells the drag.
    pressMouse(control);
    await expect.poll(lock.isLocked).toBe(true);
    moveMouse(control, { movementY: -40 });
    releaseMouse(control);
    await expect.poll(lock.isLocked).toBe(false);
    pressMouse(control, {}, 2);
    releaseMouse(control);

    await expect.poll(() => currentValue()).toBe(40);
  });

  it('takes a press that moved 4 pixels or less as still, and one that moved more, sideways too, as a drag', async () => {
    await render(<Gain defaultValue={20} />);
    const control = slider().element();
    control.focus();
    await userEvent.keyboard('{End}');

    // 2 pixels to the right and 2 down: 4 in all, still the first half of a double press.
    pressMouse(control);
    moveMouse(control, { clientX: 12, clientY: 12 });
    releaseMouse(control, { clientX: 12, clientY: 12 });
    pressMouse(control, { clientX: 12, clientY: 12 }, 2);
    releaseMouse(control, { clientX: 12, clientY: 12 });
    await expect.poll(() => currentValue()).toBe(20);

    // 5 pixels to the right: the value stays, but the press was a drag.
    await userEvent.keyboard('{End}');
    pressMouse(control);
    moveMouse(control, { clientX: 15 });
    releaseMouse(control, { clientX: 15 });
    pressMouse(control, { clientX: 15 }, 2);
    releaseMouse(control, { clientX: 15 });
    await expect.poll(() => currentValue()).toBe(100);
  });

  it('resets on two quick taps of a touch or a pen, which count no clicks', async () => {
    await render(<Gain defaultValue={20} />);
    const control = slider().element();
    control.focus();

    for (const pointerType of ['touch', 'pen'] as const) {
      // oxlint-disable-next-line no-await-in-loop -- one pointer after the other.
      await userEvent.keyboard('{End}');
      tap(control, pointerType);
      tap(control, pointerType);
      // oxlint-disable-next-line no-await-in-loop -- one pointer after the other.
      await expect.poll(() => currentValue()).toBe(20);
    }
  });
});

describe('Knob accessibility on the web', () => {
  it('has no axe violations: Default, focused from the keyboard', async () => {
    await render(<Gain defaultValue={30} />);
    slider().element().focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(slider()).toHaveAttribute('data-focus-visible', '');
    await expectNoAxeViolations();
  });

  it('has no axe violations: Disabled and read-only', async () => {
    await render(
      <>
        <Gain disabled />
        <Knob.Root readOnly defaultValue={0.25} min={-1} max={1} origin={0}>
          <Knob.Control aria-label="Pan">
            <Knob.Track />
            <Knob.Range />
            <Knob.Thumb />
          </Knob.Control>
          <Knob.ValueText />
        </Knob.Root>
      </>,
    );
    await expect.element(slider('Pan')).toHaveAttribute('aria-readonly', 'true');
    await expectNoAxeViolations();
  });
});
