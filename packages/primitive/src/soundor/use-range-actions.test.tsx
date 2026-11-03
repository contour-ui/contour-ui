import { fireEvent, render, screen } from '@soundor/testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import type { RangeActionsOptions } from '../shared/services.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';
import type { PrimitiveProps } from './types.ts';
import { useRangeActions } from './use-range-actions.ts';

const CONTROL: PrimitiveProps<'svg'> = { role: 'slider', tabIndex: 0, 'aria-label': 'Probe' };

function Probe(options: RangeActionsOptions): ReactElement {
  const actions = useRangeActions(options);
  return <Primitive.svg {...mergeProps(actions.props, CONTROL)} />;
}

async function setup(disabled: boolean) {
  const onStep = vi.fn<(direction: 1 | -1) => void>();
  const onSetValue = vi.fn<(value: number) => void>();
  const view = (next: boolean): ReactElement => (
    <Probe disabled={next} onStep={onStep} onSetValue={onSetValue} />
  );
  const { rerender } = await render(view(disabled));
  const control = screen.getByRole('adjustable', { name: 'Probe' });
  return {
    control,
    onStep,
    onSetValue,
    act: (actionName: string, value?: number | string) =>
      fireEvent.accessibilityAction(
        control,
        value === undefined ? { actionName } : { actionName, value },
      ),
    setDisabled: (next: boolean) => rerender(view(next)),
  };
}

describe('useRangeActions on Soundor', () => {
  it('offers increment, decrement and setValue to assistive technology', async () => {
    const { control } = await setup(false);
    expect(control.accessibility.actions).toEqual([
      { name: 'increment' },
      { name: 'decrement' },
      { name: 'setValue' },
    ]);
  });

  it('steps on increment and decrement, and takes the value it is given', async () => {
    const { act, onStep, onSetValue } = await setup(false);
    expect(act('increment').defaultPrevented).toBe(true);
    act('decrement');
    expect(onStep.mock.calls).toEqual([[1], [-1]]);
    expect(act('setValue', 75).defaultPrevented).toBe(true);
    act('setValue', ' 20 ');
    expect(onSetValue.mock.calls).toEqual([[75], [20]]);
  });

  it('leaves the actions it does not handle, and a value that is no number, to the runtime', async () => {
    const { act, onStep, onSetValue } = await setup(false);
    expect(act('setValue', 'x').defaultPrevented).toBe(false);
    expect(act('setValue', '').defaultPrevented).toBe(false);
    expect(act('activate').defaultPrevented).toBe(false);
    expect(onStep).not.toHaveBeenCalled();
    expect(onSetValue).not.toHaveBeenCalled();
  });

  it('offers nothing and takes nothing while disabled', async () => {
    const { control, act, onStep, setDisabled } = await setup(true);
    expect(control.accessibility.actions).toEqual([]);
    expect(act('increment').defaultPrevented).toBe(false);
    expect(onStep).not.toHaveBeenCalled();
    await setDisabled(false);
    expect(control.accessibility.actions).toHaveLength(3);
    act('increment');
    expect(onStep).toHaveBeenCalledOnce();
  });
});
