import { knob } from '@contour-ui/core';
import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { formatDecibels, Knob, useKnobContext } from '../index.ts';

type ChangeSpy = ReturnType<typeof changeSpy>;

const changeSpy = () => vi.fn<(details: knob.ValueChangeDetails) => void>();

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
 * pointer events: down at its center, `steps` moves, up. The pointer leaves the control on the
 * way, so the moves reach it through the pointer capture.
 */
async function dragBy(dy: number, name = 'Gain', steps = 4): Promise<void> {
  const control = slider(name).element();
  const pad = page.getByTestId('pad');
  const box = control.getBoundingClientRect();
  const padBox = pad.element().getBoundingClientRect();
  await userEvent.dragAndDrop(slider(name), pad, {
    sourcePosition: { x: box.width / 2, y: box.height / 2 },
    targetPosition: {
      x: box.left - padBox.left + box.width / 2,
      y: box.top - padBox.top + box.height / 2 + dy,
    },
    steps,
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

/** The arguments of each call of a spy. */
const valuesOf = (spy: ChangeSpy): number[] => spy.mock.calls.map(([{ value }]) => value);

/** Whether the default of a key went, as seen after every handler. */
function watchKeyDefaults(): boolean[] {
  const prevented: boolean[] = [];
  const listener = (event: KeyboardEvent): void => {
    prevented.push(event.defaultPrevented);
  };
  document.addEventListener('keydown', listener);
  cleanups.push(() => {
    document.removeEventListener('keydown', listener);
  });
  return prevented;
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

/** A knob whose owner keeps the value, with a button that sets it. */
function Controlled({ onValueChange }: { readonly onValueChange: ChangeSpy }): ReactElement {
  const [value, setValue] = useState(10);
  return (
    <>
      <Gain
        value={value}
        onValueChange={(details) => {
          onValueChange(details);
          setValue(details.value);
        }}
      />
      <button
        type="button"
        onClick={() => {
          setValue(75);
        }}
      >
        Seventy-five
      </button>
    </>
  );
}

/** A button of its own that sets the value through the context. */
function HalfButton(): ReactElement {
  const api = useKnobContext();
  return (
    <button
      type="button"
      onClick={() => {
        api.setValue(50);
      }}
    >
      Half
    </button>
  );
}

describe('Knob', () => {
  it('renders a labelled vertical slider with the value for assistive technology', async () => {
    const screen = await render(
      <Gain min={-60} max={12} defaultValue={-6} step={0.5} formatValue={formatDecibels} />,
    );
    const control = slider();

    await expect.element(control).toHaveAttribute('aria-valuemin', '-60');
    await expect.element(control).toHaveAttribute('aria-valuemax', '12');
    await expect.element(control).toHaveAttribute('aria-valuenow', '-6');
    await expect.element(control).toHaveAttribute('aria-valuetext', '−6.0 dB');
    await expect.element(control).toHaveAttribute('aria-orientation', 'vertical');
    await expect.element(control).toHaveAttribute('tabindex', '0');
    await expect.element(control).not.toHaveAttribute('aria-disabled');
    await expect.element(control).not.toHaveAttribute('aria-readonly');
    expect(control.element().tagName).toBe('svg');
    await expect.element(control).toHaveAttribute('viewBox', '0 0 100 100');
    expect(part(screen.container, 'value-text')).toHaveTextContent('−6.0 dB');
    for (const name of PARTS) {
      expect(part(screen.container, name)).not.toHaveAttribute('data-disabled');
    }
    expect(part(screen.container, 'root')).not.toHaveAttribute('aria-disabled');
    const label = part(screen.container, 'label');
    expect(control.element()).toHaveAttribute('aria-labelledby', label.id);
  });

  it('draws the dial of the value, from the geometry of core, in currentColor', async () => {
    const screen = await render(<Gain min={-1} max={1} origin={0} defaultValue={0.5} />);
    const position = 0.75;
    const geometry = knob.getGeometry(position, 0.5);
    const track = part(screen.container, 'track');
    const range = part(screen.container, 'range');
    const thumb = part(screen.container, 'thumb');

    expect(track.tagName).toBe('path');
    expect(track).toHaveAttribute('d', geometry.track.d);
    expect(range).toHaveAttribute('d', geometry.range.d);
    expect(thumb.tagName).toBe('line');
    expect(thumb).toHaveAttribute('x2', String(geometry.thumb.x2));
    expect(thumb).toHaveAttribute('y2', String(geometry.thumb.y2));
    for (const shape of [track, range, thumb]) {
      expect(shape).toHaveAttribute('stroke', 'currentColor');
      expect(shape).toHaveAttribute('stroke-linecap', 'round');
      expect(shape).toHaveAttribute('fill', 'none');
    }
    expect(track).toHaveAttribute('stroke-width', String(geometry.track.strokeWidth));
    const root = part(screen.container, 'root');
    expect(customProperties(root)).toStrictEqual([String(position), '67.5deg']);

    // At the origin, the range has no length.
    await screen.rerender(<Gain min={-1} max={1} origin={0} value={0} />);
    await expect.poll(() => currentValue()).toBe(0);
    expect(range).toHaveAttribute('d', '');
    expect(customProperties(root)).toStrictEqual(['0.5', '0deg']);
  });

  it('turns with a vertical drag through the pointer capture: up raises the value', async () => {
    const onValueChange = changeSpy();
    const onValueChangeStart = changeSpy();
    const onValueChangeEnd = changeSpy();
    await render(
      <Gain
        onValueChange={onValueChange}
        onValueChangeStart={onValueChangeStart}
        onValueChangeEnd={onValueChangeEnd}
      />,
    );
    const dragging = watchDragging(slider().element());

    // 100 of the 200 pixels of the travel.
    await dragBy(-100);
    await expect.poll(() => currentValue()).toBe(50);
    expect(valuesOf(onValueChange)).toStrictEqual([12.5, 25, 37.5, 50]);
    expect(valuesOf(onValueChangeStart)).toStrictEqual([0]);
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([50]);
    expect(dragging).toStrictEqual([true, false]);
    // The press focused the control, without a ring.
    await expect.element(slider()).toHaveFocus();
    await expect.element(slider()).not.toHaveAttribute('data-focus-visible');

    await dragBy(150);
    await expect.poll(() => currentValue()).toBe(0);
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([50, 0]);
  });

  it('drags ten times slower with Shift', async () => {
    await render(<Gain defaultValue={20} />);

    await userEvent.keyboard('{Shift>}');
    await dragBy(-100);
    await userEvent.keyboard('{/Shift}');

    await expect.poll(() => currentValue()).toBe(25);
  });

  it('turns with the wheel and keeps the page still', async () => {
    const onValueChangeStart = changeSpy();
    const onValueChangeEnd = changeSpy();
    await render(
      <div style={{ blockSize: '300vh' }}>
        <Gain onValueChangeStart={onValueChangeStart} onValueChangeEnd={onValueChangeEnd} />
      </div>,
    );

    // A notch of a mouse wheel up, then two down: a twentieth of the travel each.
    await userEvent.wheel(slider(), { delta: { y: -100 } });
    await expect.poll(() => currentValue()).toBe(5);
    await userEvent.wheel(slider(), { delta: { y: -100 }, times: 2 });
    await expect.poll(() => currentValue()).toBe(15);
    await userEvent.wheel(slider(), { delta: { y: 100 } });
    await expect.poll(() => currentValue()).toBe(10);
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
    expect(document.scrollingElement?.scrollTop).toBe(0);

    // One change for the run of wheel events, which ends once the wheel rests.
    expect(valuesOf(onValueChangeStart)).toStrictEqual([0]);
    await expect.poll(() => valuesOf(onValueChangeEnd)).toStrictEqual([10]);
  });

  it('takes the sideways wheel of Shift on macOS as a fine turn', async () => {
    await render(<Gain defaultValue={50} />);

    await userEvent.keyboard('{Shift>}');
    await userEvent.wheel(slider(), { delta: { x: -100 } });
    await userEvent.wheel(slider(), { delta: { y: -100 } });
    await userEvent.keyboard('{/Shift}');

    await expect.poll(() => currentValue()).toBe(51);
  });

  it('steps with the keys of a slider and keeps their defaults', async () => {
    const onValueChangeStart = changeSpy();
    const onValueChangeEnd = changeSpy();
    await render(
      <Gain
        defaultValue={50}
        onValueChangeStart={onValueChangeStart}
        onValueChangeEnd={onValueChangeEnd}
      />,
    );
    const defaults = watchKeyDefaults();
    slider().element().focus();

    const steps: ReadonlyArray<readonly [string, number]> = [
      ['{ArrowUp}', 51],
      ['{ArrowRight}', 52],
      ['{ArrowDown}', 51],
      ['{ArrowLeft}', 50],
      ['{Shift>}{ArrowUp}{/Shift}', 50.1],
      ['{Shift>}{ArrowDown}{/Shift}', 50],
      ['{PageUp}', 60],
      ['{PageDown}', 50],
      ['{End}', 100],
      ['{Home}', 0],
    ];
    for (const [keys, value] of steps) {
      // oxlint-disable-next-line no-await-in-loop -- one key after the other.
      await userEvent.keyboard(keys);
      expect(currentValue()).toBe(value);
    }
    // Each key is a change of its own.
    expect(valuesOf(onValueChangeStart)).toStrictEqual([50, 51, 52, 51, 50, 50.1, 50, 60, 50, 100]);
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([51, 52, 51, 50, 50.1, 50, 60, 50, 100, 0]);
    // Shift presses go through; the keys of the slider do not scroll the page.
    expect(defaults.filter(Boolean)).toHaveLength(steps.length);

    // Other keys and shortcuts are the page's.
    await userEvent.keyboard('{a}{Control>}{ArrowUp}{/Control}');
    await expect.poll(() => currentValue()).toBe(0);
  });

  it('takes a step at least on a coarse step', async () => {
    await render(<Gain min={0} max={10} step={2.5} defaultValue={5} />);
    slider().element().focus();

    await userEvent.keyboard('{ArrowUp}');
    await expect.poll(() => currentValue()).toBe(7.5);
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await expect.poll(() => currentValue()).toBe(5);
  });

  it('resets to the default value on a double click of two still presses', async () => {
    const onValueChangeEnd = changeSpy();
    await render(<Gain defaultValue={25} onValueChangeEnd={onValueChangeEnd} />);
    slider().element().focus();
    await userEvent.keyboard('{End}');

    await userEvent.dblClick(slider());

    await expect.poll(() => currentValue()).toBe(25);
    expect(valuesOf(onValueChangeEnd).at(-1)).toBe(25);
  });

  it('shows the focus ring after a key and not after a press', async () => {
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

  it('ignores the user and takes no focus while disabled; the wheel scrolls the page', async () => {
    const onValueChange = changeSpy();
    const screen = await render(
      <div style={{ blockSize: '300vh' }}>
        <Gain disabled defaultValue={40} onValueChange={onValueChange} />
      </div>,
    );
    const control = slider();

    await expect.element(control).toHaveAttribute('aria-disabled', 'true');
    await expect.element(control).not.toHaveAttribute('tabindex');
    // The whole knob is inactive, its readout too.
    expect(part(screen.container, 'root')).toHaveAttribute('aria-disabled', 'true');
    for (const name of PARTS) {
      expect(part(screen.container, name)).toHaveAttribute('data-disabled', '');
    }
    await dragBy(-100);
    // Playwright waits for an `aria-disabled` element to turn enabled before it clicks.
    await userEvent.dblClick(control, { force: true });
    await expect.element(control).not.toHaveFocus();
    await userEvent.wheel(control, { delta: { y: 200 } });

    await expect.poll(() => currentValue()).toBe(40);
    expect(onValueChange).not.toHaveBeenCalled();
    await expect.poll(() => document.scrollingElement?.scrollTop).toBeGreaterThan(0);
  });

  it('shows the value but ignores the user while read-only, and still takes focus', async () => {
    const onValueChange = changeSpy();
    const onValueChangeStart = changeSpy();
    const screen = await render(
      <Gain
        readOnly
        defaultValue={40}
        onValueChange={onValueChange}
        onValueChangeStart={onValueChangeStart}
      />,
    );
    const control = slider();

    await expect.element(control).toHaveAttribute('aria-readonly', 'true');
    expect(part(screen.container, 'root')).toHaveAttribute('data-readonly', '');
    await dragBy(-100);
    await expect.element(control).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{End}');
    await userEvent.wheel(control, { delta: { y: -100 } });
    await userEvent.dblClick(control);

    await expect.poll(() => currentValue()).toBe(40);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueChangeStart).not.toHaveBeenCalled();
  });

  it('follows a controlled value', async () => {
    const onValueChange = changeSpy();
    await render(<Controlled onValueChange={onValueChange} />);
    slider().element().focus();

    await userEvent.keyboard('{ArrowUp}');
    await expect.poll(() => currentValue()).toBe(11);
    await userEvent.click(page.getByRole('button', { name: 'Seventy-five' }));
    await expect.poll(() => currentValue()).toBe(75);
    // A new value from the owner is no change of the user's.
    expect(valuesOf(onValueChange)).toStrictEqual([11]);
  });

  it('reports a controlled change and waits for the owner to take it', async () => {
    const onValueChange = changeSpy();
    await render(<Gain value={30} onValueChange={onValueChange} />);

    await dragBy(-40);

    await expect.poll(() => currentValue()).toBe(30);
    expect(valuesOf(onValueChange).at(-1)).toBe(50);
  });

  it('sets the value from code through the context, read-only or not', async () => {
    await render(
      <Knob.Root readOnly>
        <Knob.Control aria-label="Mix" />
        <HalfButton />
      </Knob.Root>,
    );

    await userEvent.click(page.getByRole('button', { name: 'Half' }));
    await expect.poll(() => currentValue('Mix')).toBe(50);
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

  it('follows a label id of the owner, and takes aria-label without a label', async () => {
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

    control.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse' }),
    );
    await expect.element(slider()).toHaveAttribute('data-dragging', '');
    control.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    await expect.element(slider()).not.toHaveAttribute('data-dragging');
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([0]);
  });

  it('throws for parts outside of a root', () => {
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

/**
 * A pointer event of the mouse on the control, with the primary button: at `(10, 10)` unless
 * `init` says otherwise, as a locked pointer stays, with the movement of `init`.
 */
function send(control: Element, type: string, init: PointerEventInit = {}): void {
  control.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 10,
      clientY: 10,
      ...init,
    }),
  );
}

/**
 * The `dblclick` the browser fires for a second click soon after the first one. Each click of
 * Playwright counts one, so a test that clicks after a drag fires it itself.
 */
function doubleClick(control: Element): void {
  control.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 }));
}

describe('Knob pointer lock', () => {
  it('locks the pointer for a drag and takes the movement of the locked pointer', async () => {
    const onValueChangeEnd = changeSpy();
    await render(<Gain pointerLock onValueChangeEnd={onValueChangeEnd} />);
    const control = slider().element();
    const lock = fakePointerLock(control);

    send(control, 'pointerdown');
    expect(lock.request).toHaveBeenCalledOnce();
    await expect.poll(lock.isLocked).toBe(true);
    send(control, 'pointermove', { movementY: -40 });
    send(control, 'pointermove', { movementY: -40 });
    await expect.poll(() => currentValue()).toBe(40);

    send(control, 'pointerup');
    expect(lock.exit).toHaveBeenCalledOnce();
    await expect.poll(lock.isLocked).toBe(false);
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([40]);
  });

  it('ends the drag when the user leaves the lock, and gives back a lock granted late', async () => {
    const onValueChangeEnd = changeSpy();
    await render(<Gain pointerLock onValueChangeEnd={onValueChangeEnd} />);
    const control = slider().element();
    const lock = fakePointerLock(control);

    send(control, 'pointerdown');
    await expect.poll(lock.isLocked).toBe(true);
    send(control, 'pointermove', { movementY: -20 });
    // Escape: the browser gives the lock back.
    lock.unlock();
    await expect.element(slider()).not.toHaveAttribute('data-dragging');
    expect(valuesOf(onValueChangeEnd)).toStrictEqual([10]);

    // A click: released before the lock comes, which then goes back at once.
    send(control, 'pointerdown');
    send(control, 'pointerup');
    await expect.poll(() => lock.exit.mock.calls.length).toBe(1);
    await expect.poll(lock.isLocked).toBe(false);
  });

  it('drags with the pointer capture when the browser refuses the lock', async () => {
    await render(<Gain pointerLock />);

    // A test frame may not lock the pointer: Chromium refuses.
    await dragBy(-100);

    await expect.poll(() => currentValue()).toBe(50);
  });
});

describe('Knob double click after a drag', () => {
  it('does not reset when a quick click after a drag makes a double click', async () => {
    await render(<Gain defaultValue={20} />);

    // The release of the drag is a click, on the control: the next click makes a double click.
    await dragBy(-100);
    await userEvent.click(slider());
    doubleClick(slider().element());
    await expect.poll(() => currentValue()).toBe(70);

    // Two still clicks later, a double click resets as before.
    await userEvent.dblClick(slider());
    await expect.poll(() => currentValue()).toBe(20);
  });

  it('does not reset when a quick click after a locked drag makes a double click', async () => {
    await render(<Gain pointerLock defaultValue={20} />);
    const control = slider().element();
    const lock = fakePointerLock(control);

    // Under the lock, the pointer stays at (10, 10): only its movement tells the drag.
    send(control, 'pointerdown');
    await expect.poll(lock.isLocked).toBe(true);
    send(control, 'pointermove', { movementY: -40 });
    send(control, 'pointerup');
    await expect.poll(lock.isLocked).toBe(false);
    send(control, 'pointerdown');
    send(control, 'pointerup');
    // The lock of the click comes after its release, and goes back at once.
    await expect.poll(() => lock.exit.mock.calls.length).toBe(2);
    doubleClick(control);

    await expect.poll(() => currentValue()).toBe(40);
  });

  it('takes a press that moved 4 pixels or less as still, and one that moved more, sideways too, as a drag', async () => {
    await render(<Gain defaultValue={20} />);
    const control = slider().element();
    control.focus();
    await userEvent.keyboard('{End}');

    // 2 pixels to the right and 2 down: 4 in all, still half of a double click.
    send(control, 'pointerdown');
    send(control, 'pointermove', { clientX: 12, clientY: 12 });
    send(control, 'pointerup', { clientX: 12, clientY: 12 });
    send(control, 'pointerdown', { clientX: 12, clientY: 12 });
    send(control, 'pointerup', { clientX: 12, clientY: 12 });
    doubleClick(control);
    await expect.poll(() => currentValue()).toBe(20);

    // 5 pixels to the right: the value stays, but the press was a drag.
    await userEvent.keyboard('{End}');
    send(control, 'pointerdown');
    send(control, 'pointermove', { clientX: 15 });
    send(control, 'pointerup', { clientX: 15 });
    send(control, 'pointerdown', { clientX: 15 });
    send(control, 'pointerup', { clientX: 15 });
    doubleClick(control);
    await expect.poll(() => currentValue()).toBe(100);
  });
});

describe('Knob accessibility', () => {
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
