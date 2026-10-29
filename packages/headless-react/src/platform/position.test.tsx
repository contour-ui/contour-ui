import type { Placement } from '@contour-ui/core';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { getPositionerStyle, trackPosition } from './position.ts';
import type { PositionReference, TrackPositionOptions } from './position.ts';

const OFF_SCREEN = 'translate(0px, calc(-100% - 100vh))';

/** The elements of a test: removed, and their tracking stopped, after it. */
let root: HTMLElement;
let stops: Array<() => void> = [];

/** Track, and stop after the test. */
function track(
  reference: PositionReference,
  floating: HTMLElement,
  options?: TrackPositionOptions,
): void {
  stops.push(trackPosition(reference, floating, options));
}

beforeEach(async () => {
  await page.viewport(800, 600);
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  for (const stop of stops) {
    stop();
  }
  stops = [];
  root.remove();
});

/** The box of an element in the viewport. */
function box(element: Element) {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height, bottom: top + height };
}

/** A positioner styled for `options`, around a content of `width` × `height` px. */
function positioner(options?: TrackPositionOptions, width = 200, height = 100): HTMLElement {
  const floating = document.createElement('div');
  Object.assign(floating.style, getPositionerStyle(options));
  const content = document.createElement('div');
  Object.assign(content.style, {
    width: `${width}px`,
    height: `${height}px`,
    // As a styled content does: it scrolls within the room the positioner has.
    maxHeight: 'var(--available-height)',
    overflow: 'auto',
  });
  floating.append(content);
  root.append(floating);
  return floating;
}

/** A 120×40 button at `left`, `top` of `parent`, positioned. */
function button(left: number, top: number, parent: HTMLElement = root): HTMLElement {
  const reference = document.createElement('button');
  reference.type = 'button';
  reference.textContent = 'Reference';
  Object.assign(reference.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: '120px',
    height: '40px',
    margin: '0',
    boxSizing: 'border-box',
  });
  parent.append(reference);
  return reference;
}

/** A 400×300 scroll container at the top left corner of the page, with 2000 px of content. */
function scrollContainer(): HTMLElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '400px',
    height: '300px',
    overflow: 'auto',
  });
  const content = document.createElement('div');
  content.style.height = '2000px';
  container.append(content);
  root.append(container);
  return container;
}

/** The positioning variables of an element. */
function variables(element: HTMLElement) {
  const read = (name: string) => element.style.getPropertyValue(name);
  return {
    '--reference-width': read('--reference-width'),
    '--reference-height': read('--reference-height'),
    '--available-width': read('--available-width'),
    '--available-height': read('--available-height'),
    '--transform-origin': read('--transform-origin'),
  };
}

const placementSpy = () => vi.fn<(placement: Placement) => void>();

/** A trigger and a panel in its positioner, as a popover renders them. */
function Popover({ label }: { readonly label: string }): ReactElement {
  return (
    <>
      <button type="button">Trigger</button>
      <div style={getPositionerStyle()}>
        <section aria-label={label} style={{ width: 200, height: 100 }} />
      </div>
    </>
  );
}

/** The element an element is in: the positioner of a panel. */
function parentOf(element: Element): HTMLElement {
  const parent = element.parentElement;
  if (parent === null) {
    throw new Error('The element has no parent element.');
  }
  return parent;
}

describe('trackPosition', () => {
  it('places the floating element next to its reference and writes the variables', async () => {
    const onPlacementChange = placementSpy();
    const options = { placement: 'bottom-start', offset: 8, onPlacementChange } as const;
    const reference = button(100, 100);
    const floating = positioner(options);
    track(reference, floating, options);

    await expect.poll(() => floating.dataset['placement']).toBe('bottom-start');
    expect(box(floating)).toMatchObject({ left: 100, top: 148, width: 200, height: 100 });
    const { clientWidth, clientHeight } = document.documentElement;
    expect(variables(floating)).toStrictEqual({
      '--reference-width': '120px',
      '--reference-height': '40px',
      '--available-width': `${clientWidth}px`,
      '--available-height': `${clientHeight - 148}px`,
      '--transform-origin': 'top left',
    });
    expect(onPlacementChange.mock.calls).toStrictEqual([['bottom-start']]);
  });

  it('keeps the floating element off screen until the first computation', async () => {
    const reference = button(100, 100);
    const floating = positioner();
    expect(box(floating).bottom).toBeLessThanOrEqual(0);

    track(reference, floating);
    // The computation is under way: nothing is written yet.
    expect(floating.style.transform).toBe(OFF_SCREEN);
    expect(box(floating).bottom).toBeLessThanOrEqual(0);
    expect(floating.dataset['placement']).toBeUndefined();

    await expect.poll(() => box(floating).top).toBe(140);
    expect(box(floating).left).toBe(60);
  });

  it('flips the floating element above its reference near the bottom edge', async () => {
    const onPlacementChange = placementSpy();
    const options = { placement: 'bottom-start', offset: 8, onPlacementChange } as const;
    const top = document.documentElement.clientHeight - 60;
    const reference = button(100, top);
    const floating = positioner(options);
    track(reference, floating, options);

    await expect.poll(() => floating.dataset['placement']).toBe('top-start');
    expect(box(floating)).toMatchObject({ left: 100, bottom: top - 8 });
    expect(floating.style.getPropertyValue('--transform-origin')).toBe('bottom left');
    expect(onPlacementChange.mock.calls).toStrictEqual([['top-start']]);
  });

  it('follows its reference as a container scrolls it', async () => {
    const container = scrollContainer();
    const reference = button(100, 100, container);
    const floating = positioner();
    track(reference, floating, { offset: 8 });
    await expect.poll(() => box(floating).top).toBe(148);

    container.scrollTop = 50;
    await expect.poll(() => box(floating).top).toBe(98);
    expect(box(floating).left).toBe(60);
  });

  it('follows its reference as it changes size', async () => {
    const options = { sameWidth: true } as const;
    const reference = button(100, 100);
    const floating = positioner(options);
    track(reference, floating, options);
    await expect.poll(() => box(floating)).toMatchObject({ left: 100, top: 140, width: 120 });

    reference.style.width = '160px';
    reference.style.height = '60px';
    await expect.poll(() => box(floating)).toMatchObject({ left: 100, top: 160, width: 160 });
    expect(floating.style.getPropertyValue('--reference-width')).toBe('160px');
  });

  it('follows its reference as the layout moves it', async () => {
    const spacer = document.createElement('div');
    spacer.style.height = '100px';
    const reference = document.createElement('button');
    reference.type = 'button';
    reference.textContent = 'Reference';
    root.append(spacer, reference);
    const floating = positioner();
    track(reference, floating, { placement: 'bottom-start' });
    await expect.poll(() => box(floating).top).toBe(box(reference).bottom);

    spacer.style.height = '150px';
    await expect.poll(() => box(floating).top).toBe(box(reference).bottom);
    expect(box(floating).left).toBe(box(reference).left);
  });

  it('follows the viewport as it changes size', async () => {
    const reference = button(100, 300);
    const floating = positioner();
    track(reference, floating, { offset: 8 });
    await expect.poll(() => floating.dataset['placement']).toBe('bottom');
    expect(floating.style.getPropertyValue('--available-height')).toBe(
      `${document.documentElement.clientHeight - 348}px`,
    );

    // 52 px below the reference: not enough, 292 above.
    await page.viewport(800, 400);
    await expect.poll(() => floating.dataset['placement']).toBe('top');
    expect(box(floating).bottom).toBe(292);
    expect(floating.style.getPropertyValue('--available-height')).toBe('292px');
  });

  it('caps the size of the floating element by the room it has, with fitViewport', async () => {
    const options = { offset: 8, shift: 8, fitViewport: true } as const;
    const reference = button(100, 100);
    const floating = positioner(options, 200, 2000);
    track(reference, floating, options);

    // Too tall for either side: below, where there is more room, down to 8 px from the edge.
    await expect.poll(() => floating.dataset['placement']).toBe('bottom');
    const room = document.documentElement.clientHeight - 148 - 8;
    await expect.poll(() => box(floating)).toMatchObject({ top: 148, height: room });
    expect(floating.style.getPropertyValue('--available-height')).toBe(`${room}px`);
  });

  it('places a fixed floating element in the coordinates of the viewport', async () => {
    const tall = document.createElement('div');
    tall.style.height = '3000px';
    root.append(tall);
    const options = { strategy: 'fixed', offset: 8 } as const;
    const reference = button(100, 300);
    const floating = positioner(options);
    track(reference, floating, options);
    await expect.poll(() => box(floating).top).toBe(348);
    expect(getComputedStyle(floating).position).toBe('fixed');

    window.scrollTo(0, 100);
    await expect.poll(() => box(floating).top).toBe(248);
  });

  it('places the floating element next to a virtual reference', async () => {
    const reference = { getBoundingClientRect: () => new DOMRect(300, 200, 0, 0) };
    const floating = positioner();
    track(reference, floating, { placement: 'bottom-start', offset: 8 });

    await expect.poll(() => box(floating)).toMatchObject({ left: 300, top: 208 });
    expect(floating.style.getPropertyValue('--reference-width')).toBe('0px');
  });

  it('rounds the coordinates to device pixels', async () => {
    const reference = button(100.4, 100.3);
    const floating = positioner();
    track(reference, floating, { placement: 'bottom-start' });

    const ratio = window.devicePixelRatio;
    const { left, bottom } = box(reference);
    const round = (value: number) => Math.round(value * ratio) / ratio;
    await expect
      .poll(() => floating.style.transform)
      .toBe(`translate(${round(left)}px, ${round(bottom)}px)`);
  });

  it('stops following once stopped, and leaves the floating element where it was', async () => {
    const container = scrollContainer();
    const reference = button(100, 100, container);
    const floating = positioner();
    // A second floating element, still tracked, tells when the scroll has been handled.
    const control = positioner();
    const stop = trackPosition(reference, floating, { offset: 8 });
    track(reference, control, { offset: 8 });
    await expect.poll(() => box(floating).top).toBe(148);

    stop();
    container.scrollTop = 50;
    await expect.poll(() => box(control).top).toBe(98);
    expect(box(floating).top).toBe(148);
    // Stopping again does nothing.
    stop();
  });

  it('writes nothing once stopped, not even the computation under way', async () => {
    const onPlacementChange = placementSpy();
    const reference = button(100, 100);
    const floating = positioner();
    const control = positioner();

    trackPosition(reference, floating, { onPlacementChange })();
    track(reference, control);
    await expect.poll(() => control.dataset['placement']).toBe('bottom');

    expect(floating.style.transform).toBe(OFF_SCREEN);
    expect(floating.dataset['placement']).toBeUndefined();
    expect(floating.style.getPropertyValue('--reference-width')).toBe('');
    expect(onPlacementChange).not.toHaveBeenCalled();
  });
});

describe('getPositionerStyle', () => {
  it('puts the positioner at the top left corner, off screen, sized by the options', () => {
    expect(getPositionerStyle()).toStrictEqual({
      position: 'absolute',
      top: 0,
      left: 0,
      width: 'max-content',
      transform: OFF_SCREEN,
    });
    expect(
      getPositionerStyle({ strategy: 'fixed', sameWidth: true, fitViewport: true }),
    ).toStrictEqual({
      position: 'fixed',
      top: 0,
      left: 0,
      width: 'var(--reference-width)',
      maxWidth: 'var(--available-width)',
      maxHeight: 'var(--available-height)',
      transform: OFF_SCREEN,
    });
  });

  it('renders on the server', () => {
    expect(renderToStaticMarkup(<div style={getPositionerStyle()} />)).toBe(
      `<div style="position:absolute;top:0;left:0;width:max-content;transform:${OFF_SCREEN}"></div>`,
    );
  });

  it('leaves what tracking wrote when React renders the positioner again', async () => {
    const screen = await render(<Popover label="Panel" />);
    const trigger = screen.getByRole('button', { name: 'Trigger' }).element();
    const floating = parentOf(screen.getByRole('region', { name: 'Panel' }).element());
    track(trigger, floating);
    await expect.poll(() => floating.dataset['placement']).toBe('bottom');
    const { transform } = floating.style;
    expect(transform).not.toBe(OFF_SCREEN);

    await screen.rerender(<Popover label="Settings" />);
    await expect.element(screen.getByRole('region', { name: 'Settings' })).toBeInTheDocument();
    expect(floating.style.transform).toBe(transform);
  });
});
