import { Svg } from '@soundor/react/svg';
import type { SvgProps } from '@soundor/react/svg';
import type { ReactElement } from 'react';

import { useComposedRefs } from '../utils/compose-refs.ts';
import { mergeProps } from '../utils/merge-props.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobControlProps = SvgProps;

/**
 * Knob control: the `Svg` of the dial, an adjustable element to assistive technology, with the
 * `viewBox` of the geometry (`0 0 100 100`). It takes focus (not while disabled) and the input:
 * a vertical drag (up raises the value, Shift slows it down), the wheel, the arrow keys, Page Up
 * and Page Down, Home and End, a double press, which resets the value, and the actions of
 * assistive technology. Size it with `width` and `height` (or `style`), and put `Knob.Track`,
 * `Knob.Range` and `Knob.Thumb` inside it, or shapes of your own. Name it with `Knob.Label` or
 * `accessibilityLabel`.
 *
 * @example
 * <Knob.Control width={40} height={40}>
 *   <Knob.Track />
 *   <Knob.Range />
 *   <Knob.Thumb />
 * </Knob.Control>
 */
export function KnobControl({ ref, ...props }: KnobControlProps): ReactElement {
  const api = useKnobContext();
  const own = api.getControlProps();
  const composedRef = useComposedRefs(own.ref, ref);
  return <Svg {...mergeProps(own, props)} ref={composedRef} />;
}
