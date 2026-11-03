/*
 * The look of `Knob`: on the web the classes of `knob.css` and the size of the root as
 * `data-size` (the stylesheet reads the state from the data attributes of the headless parts and
 * from `:hover`); on native platforms the same column, dial and colors as style objects and
 * shape colors from the token values of the theme.
 */
import type { NativeStyle } from '@contour-ui/primitive';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';

import { focusRingStyle } from '../utils/look.ts';
import type { Look } from '../utils/look.ts';

/** The diameter of the dial: the `size.knob-*` tokens. */
export type KnobSize = 'sm' | 'md' | 'lg';

/** What the look of a knob depends on besides its state: the size of its root. */
export interface KnobLookOptions {
  readonly size: KnobSize;
}

/** The state of the knob its look follows, from the context of its root. */
export interface KnobLookState {
  readonly disabled: boolean;
  readonly readOnly: boolean;
  /** The user drags the dial: from the press to the release, wherever the pointer goes. */
  readonly dragging: boolean;
  /** A mouse or a pen is over the dial; never while disabled. */
  readonly hovered: boolean;
  /** The dial has the focus and shows it (a keyboard focus). */
  readonly focusVisible: boolean;
}

/** The parts of a knob. */
export type KnobPart =
  | 'root'
  | 'label'
  | 'control'
  | 'track'
  | 'range'
  | 'thumb'
  | 'valueText'
  | 'hiddenInput';

const DIAMETER = { sm: 'knob-sm', md: 'knob-md', lg: 'knob-lg' } as const;

/** The dial: as wide as its size token, round, and the resize pointer while it can turn. */
function controlStyle(
  tokens: SoundorTokens,
  { size }: KnobLookOptions,
  { disabled, readOnly, focusVisible }: KnobLookState,
): NativeStyle {
  const diameter = tokens.size[DIAMETER[size]];
  return {
    width: diameter,
    height: diameter,
    flexShrink: 0,
    // Round, so the focus ring is a circle around the dial.
    borderRadius: tokens.radius.round,
    // Nothing to turn: a disabled or a read-only knob takes the default pointer.
    cursor: disabled || readOnly ? 'default' : 'ns-resize',
    // As `:focus-visible` on the web: a key gave the focus, or was pressed since a press did.
    ...(focusVisible ? focusRingStyle(tokens) : undefined),
  };
}

/** The range: the accent fill, brighter while the dial is hovered or dragged. */
function rangeColor({ color }: SoundorTokens, state: KnobLookState): string {
  if (state.disabled) {
    return color.fg.disabled;
  }
  // Nothing to turn while read-only: it keeps its color under the pointer, as on the web.
  const active = state.dragging || (state.hovered && !state.readOnly);
  return active ? color.accent['fill-hover'] : color.accent.fill;
}

/**
 * The look of `Knob`. On the web: the class of each part (`contour-knob`,
 * `contour-knob__control`…) and the resolved size of the root as `data-size`. On native
 * platforms: a column of the label, the dial and the readout, a control gap apart; the dial as
 * wide as its size, with the focus ring from its state; the track, the range and the thumb in
 * their colors (the range brighter while hovered or dragged); the label and the readout in the
 * `label` and `value` text styles; the disabled colors while disabled. The hidden input has no
 * look: native platforms render none.
 */
export const knobLook: Look<KnobPart, KnobLookOptions, KnobLookState> = {
  web: ({ size }) => ({
    root: { className: 'contour-knob', 'data-size': size },
    label: { className: 'contour-knob__label' },
    control: { className: 'contour-knob__control' },
    track: { className: 'contour-knob__track' },
    range: { className: 'contour-knob__range' },
    thumb: { className: 'contour-knob__thumb' },
    valueText: { className: 'contour-knob__value-text' },
    hiddenInput: { className: 'contour-knob__hidden-input' },
  }),
  native: (tokens, options, state) => {
    const { color } = tokens;
    const { disabled } = state;
    return {
      root: {
        style: { flexDirection: 'column', alignItems: 'center', gap: tokens.space['control-gap'] },
      },
      label: {
        style: { ...tokens.text.label, color: disabled ? color.fg.disabled : color.fg.muted },
      },
      control: { style: controlStyle(tokens, options, state) },
      track: { color: disabled ? color.border.subtle : color.border.default },
      range: { color: rangeColor(tokens, state) },
      thumb: { color: disabled ? color.fg.disabled : color.fg.default },
      valueText: {
        style: { ...tokens.text.value, color: disabled ? color.fg.disabled : color.fg.default },
      },
      hiddenInput: {},
    };
  },
};
