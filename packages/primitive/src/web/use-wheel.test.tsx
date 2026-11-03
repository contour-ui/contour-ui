import { useRef } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { useComposedRefs } from '../shared/compose-refs.ts';
import type { WheelOptions, WheelTurn } from '../shared/services.ts';
import { Primitive } from './primitive.ts';
import type { PrimitiveNode } from './types.ts';
import { useWheel } from './use-wheel.ts';

type TurnSpy = ReturnType<typeof turnSpy>;

const turnSpy = () => vi.fn<(turn: WheelTurn) => void>();

interface DialProps extends Partial<WheelOptions> {
  readonly onWheel: TurnSpy;
  /** Receives the node of the dial, besides the wheel service. */
  readonly nodeRef?: { current: PrimitiveNode<'div'> | null };
}

/** What makes the dial a slider, in a spread as a part writes it. */
const SLIDER = { role: 'slider', 'aria-label': 'Dial', 'aria-valuenow': 0 } as const;

/** Takes a turn first: another listener on the way of the event. */
const takeTurn = (event: Event): void => {
  event.preventDefault();
};

/** A 40 px dial that the wheel turns, on a page three screens tall. */
function Dial({ disabled = false, onWheel, nodeRef }: DialProps): ReactElement {
  const wheel = useWheel({ disabled, onWheel });
  const ownRef = useRef<PrimitiveNode<'div'>>(null);
  const ref = useComposedRefs<PrimitiveNode<'div'>>(wheel.ref, nodeRef ?? ownRef);
  return (
    <div style={{ blockSize: '300vh' }}>
      <Primitive.div ref={ref} style={{ width: 40, height: 40 }} {...SLIDER} {...wheel.props}>
        <Primitive.span data-testid="inner" style={{ display: 'block', width: 20, height: 20 }} />
      </Primitive.div>
    </div>
  );
}

const dial = () => page.getByRole('slider', { name: 'Dial' });

/** The turns a spy received, as plain objects. */
const turnsOf = (spy: TurnSpy): WheelTurn[] => spy.mock.calls.map(([turn]) => turn);

/** Wait for the browser to paint, after which a scroll the wheel started shows. */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

afterEach(() => {
  window.scrollTo(0, 0);
});

describe('useWheel', () => {
  it('hands each turn over and keeps the page still', async () => {
    const onWheel = turnSpy();
    await render(<Dial onWheel={onWheel} />);

    await userEvent.wheel(dial(), { delta: { y: -100 } });
    await userEvent.wheel(dial(), { delta: { y: 100 }, times: 2 });
    await nextFrame();

    expect(turnsOf(onWheel)).toStrictEqual([
      { deltaX: 0, deltaY: -100, deltaMode: 0, shiftKey: false },
      { deltaX: 0, deltaY: 100, deltaMode: 0, shiftKey: false },
      { deltaX: 0, deltaY: 100, deltaMode: 0, shiftKey: false },
    ]);
    expect(document.scrollingElement?.scrollTop).toBe(0);
  });

  it('hands over the sideways turn and Shift, as macOS sends a turn under Shift', async () => {
    const onWheel = turnSpy();
    await render(<Dial onWheel={onWheel} />);

    await userEvent.keyboard('{Shift>}');
    await userEvent.wheel(dial(), { delta: { x: -100 } });
    await userEvent.keyboard('{/Shift}');

    expect(turnsOf(onWheel)).toStrictEqual([
      { deltaX: -100, deltaY: 0, deltaMode: 0, shiftKey: true },
    ]);
  });

  it('lets the page scroll while disabled', async () => {
    const onWheel = turnSpy();
    await render(<Dial disabled onWheel={onWheel} />);

    await userEvent.wheel(dial(), { delta: { y: 200 } });

    await expect.poll(() => document.scrollingElement?.scrollTop).toBeGreaterThan(0);
    expect(onWheel).not.toHaveBeenCalled();
  });

  it('leaves a turn another listener took first to it', async () => {
    const onWheel = turnSpy();
    await render(<Dial onWheel={onWheel} />);
    const inner = page.getByTestId('inner').element();
    inner.addEventListener('wheel', takeTurn, { passive: false });

    await userEvent.wheel(page.getByTestId('inner'), { delta: { y: 100 } });
    inner.removeEventListener('wheel', takeTurn);

    expect(onWheel).not.toHaveBeenCalled();
  });

  it('follows the latest options with the same listener', async () => {
    const first = turnSpy();
    const second = turnSpy();
    const screen = await render(<Dial onWheel={first} />);

    await screen.rerender(<Dial onWheel={second} />);
    await userEvent.wheel(dial(), { delta: { y: 100 } });
    await screen.rerender(<Dial onWheel={second} disabled />);
    await userEvent.wheel(dial(), { delta: { y: 100 } });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('stops listening when the element unmounts', async () => {
    const onWheel = turnSpy();
    const nodeRef: { current: PrimitiveNode<'div'> | null } = { current: null };
    const screen = await render(<Dial onWheel={onWheel} nodeRef={nodeRef} />);
    const node = nodeRef.current;

    await screen.unmount();
    node?.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));

    expect(node).not.toBeNull();
    expect(onWheel).not.toHaveBeenCalled();
  });
});
