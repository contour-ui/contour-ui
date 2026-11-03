import { fireEvent, render, screen } from '@soundor/testing-library/react';
import type { WheelEvent } from 'soundor:ui';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import type { WheelOptions, WheelTurn } from '../shared/services.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';
import type { PrimitiveProps } from './types.ts';
import { useWheel } from './use-wheel.ts';

interface ProbeProps extends WheelOptions {
  /** The owner's handler, which runs before the service's. */
  readonly onOwnWheel?: (event: WheelEvent) => void;
}

const CONTROL: PrimitiveProps<'svg'> = { role: 'slider', tabIndex: 0, 'aria-label': 'Probe' };

function Probe({ onOwnWheel, ...options }: ProbeProps): ReactElement {
  const wheel = useWheel(options);
  return <Primitive.svg {...mergeProps(wheel.props, CONTROL, { onWheel: onOwnWheel })} />;
}

/** A wheel event over the control, in pixels unless `deltaMode` says otherwise. */
const turn = (init: Record<string, unknown>) =>
  fireEvent(screen.getByRole('adjustable', { name: 'Probe' }), 'wheel', {
    deltaX: 0,
    deltaY: 0,
    deltaMode: 0,
    ...init,
  });

describe('useWheel on Soundor', () => {
  it('hands the turn over, and keeps the scroll views around the control still', async () => {
    const onWheel = vi.fn<(turn: WheelTurn) => void>();
    await render(<Probe disabled={false} onWheel={onWheel} />);
    expect(turn({ deltaY: -100 }).defaultPrevented).toBe(true);
    turn({ deltaX: -40, deltaY: 0, deltaMode: 1, shiftKey: true });
    expect(onWheel.mock.calls).toEqual([
      [{ deltaX: 0, deltaY: -100, deltaMode: 0, shiftKey: false }],
      [{ deltaX: -40, deltaY: 0, deltaMode: 1, shiftKey: true }],
    ]);
  });

  it('leaves the wheel to the scroll views while disabled', async () => {
    const onWheel = vi.fn<(turn: WheelTurn) => void>();
    const { rerender } = await render(<Probe disabled onWheel={onWheel} />);
    expect(turn({ deltaY: -100 }).defaultPrevented).toBe(false);
    expect(onWheel).not.toHaveBeenCalled();
    await rerender(<Probe disabled={false} onWheel={onWheel} />);
    expect(turn({ deltaY: -100 }).defaultPrevented).toBe(true);
    expect(onWheel).toHaveBeenCalledOnce();
  });

  it('stays still when the owner prevents the wheel', async () => {
    const onWheel = vi.fn<(turn: WheelTurn) => void>();
    await render(
      <Probe
        disabled={false}
        onWheel={onWheel}
        onOwnWheel={(event) => {
          event.preventDefault();
        }}
      />,
    );
    turn({ deltaY: -100 });
    expect(onWheel).not.toHaveBeenCalled();
  });
});
