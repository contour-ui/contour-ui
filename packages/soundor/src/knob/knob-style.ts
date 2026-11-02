import type { UseKnobReturn } from '@contour-ui/soundor-headless';
import type { StyleProp } from '@soundor/react';
import { createContext } from 'react';
import type { Context } from 'react';

/** The diameter of the dial: the `size.knob-*` tokens. */
export type KnobSize = 'sm' | 'md' | 'lg';

/** The size of the nearest `Knob.Root`, for its control. */
export const KnobSizeContext: Context<KnobSize> = createContext<KnobSize>('md');

/**
 * The `style` of a part of a `Knob`: styles after the part's own, or a function of the state of
 * the knob (`useKnobContext()` of `@contour-ui/soundor-headless`) that returns them.
 */
export type KnobStyleProp = StyleProp | ((knob: UseKnobReturn) => StyleProp);

/** The styles a {@link KnobStyleProp} gives for the knob as it is. */
export function resolveStyle(style: KnobStyleProp | undefined, knob: UseKnobReturn): StyleProp {
  return typeof style === 'function' ? style(knob) : style;
}
