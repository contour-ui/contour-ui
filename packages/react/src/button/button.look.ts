/*
 * The look of `Button`: on the web the classes and data attributes of `button.css`, on native
 * platforms the same variants and sizes as style objects from the token values of the theme.
 */
import type { InteractionState, NativeStyle } from '@contour-ui/primitive';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';

import { focusRingStyle } from '../utils/look.ts';
import type { Look } from '../utils/look.ts';

/**
 * How much a button stands out: `solid` (accent fill, for the main action), `subtle` (neutral
 * fill), `outline` (border only) or `ghost` (no fill until hovered).
 */
export type ButtonVariant = 'solid' | 'subtle' | 'outline' | 'ghost';

/** The height of a button: the `size.control-*` tokens. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** What the look of a button depends on besides its state. */
export interface ButtonLookOptions {
  readonly variant: ButtonVariant;
  readonly size: ButtonSize;
  readonly disabled: boolean;
}

const HEIGHT = { sm: 'control-sm', md: 'control-md', lg: 'control-lg' } as const;

/** The box of the button: its height, sides, border and fill. */
function rootStyle(
  tokens: SoundorTokens,
  { variant, size, disabled }: ButtonLookOptions,
  { hovered }: InteractionState,
): NativeStyle {
  const { color } = tokens;
  // Transparent unless a variant colors it; keeps every variant the same size.
  let borderColor = 'transparent';
  let backgroundColor = 'transparent';
  // The state rests while disabled, so a disabled button is never hovered.
  switch (variant) {
    case 'solid': {
      backgroundColor = hovered ? color.accent['fill-hover'] : color.accent.fill;
      break;
    }
    case 'subtle': {
      backgroundColor = color.bg.hover;
      // `bg-hover` is already the subtle fill, so its edge shows instead.
      borderColor = hovered ? color.border.strong : 'transparent';
      break;
    }
    case 'outline': {
      borderColor = hovered ? color.border.strong : color.border.default;
      break;
    }
    case 'ghost': {
      backgroundColor = hovered ? color.bg.hover : 'transparent';
      break;
    }
  }
  if (disabled && variant === 'solid') {
    backgroundColor = color.bg.hover;
  }
  const large = size === 'lg';
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[large ? 'control-gap-lg' : 'control-gap'],
    height: tokens.size[HEIGHT[size]],
    paddingHorizontal: tokens.space[large ? 'control-inset-lg' : 'control-inset'],
    borderWidth: tokens['border-width'].default,
    borderRadius: tokens.radius.control,
    borderColor,
    backgroundColor,
  };
}

/** The text of the label: the `label` text style, `label-lg` in `lg`. */
function labelStyle(
  tokens: SoundorTokens,
  { variant, size, disabled }: ButtonLookOptions,
): NativeStyle {
  const { color } = tokens;
  let textColor = variant === 'solid' ? color.accent['on-fill'] : color.fg.default;
  if (disabled) {
    textColor = color.fg.disabled;
  }
  return { ...tokens.text[size === 'lg' ? 'label-lg' : 'label'], color: textColor };
}

/**
 * The look of `Button`. On the web: the class `contour-button`, `data-scope` and `data-part`,
 * the resolved variant and size as `data-variant` and `data-size`, and `data-disabled`; the
 * stylesheet draws the hover and the focus ring. On native platforms: the box of the button, with
 * the hover colors and the focus ring from its state, and its label's text style, which the text
 * inside it takes.
 */
export const buttonLook: Look<'root', ButtonLookOptions, InteractionState> = {
  web: ({ variant, size, disabled }) => ({
    root: {
      className: 'contour-button',
      'data-scope': 'button',
      'data-part': 'root',
      'data-variant': variant,
      'data-size': size,
      'data-disabled': disabled ? '' : undefined,
    },
  }),
  native: (tokens, options, state) => ({
    root: {
      style: {
        ...rootStyle(tokens, options, state),
        // As `:focus-visible` on the web: a key gave the focus, or was pressed since a press did.
        ...(state.focusVisible ? focusRingStyle(tokens) : undefined),
      },
      textStyle: labelStyle(tokens, options),
    },
  }),
};
