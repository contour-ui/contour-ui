import type { SoundorTokens } from '@contour-ui/tokens/soundor';
import { Pressable, Text } from '@soundor/react';
import type { PressableProps, PressableState, Style, StyleProp } from '@soundor/react';
import { Children } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';
import { focusRingStyle } from '../utils/focus-ring.ts';
import { useInteractionState } from '../utils/interaction-state.ts';

/** What the style function of a {@link Button} receives: Pressable's state, at rest while disabled. */
export interface ButtonState extends PressableState {
  /**
   * The button shows its focus, as `:focus-visible` on the web: a key gave it the focus, or a key
   * was pressed since a press did. It draws its focus ring then.
   */
  readonly focusVisible: boolean;
}

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children' | 'disabled'> {
  /**
   * How much the button stands out: `solid` (accent fill, for the main action), `subtle`
   * (neutral fill), `outline` (border only) or `ghost` (no fill until hovered).
   *
   * @defaultValue 'solid'
   */
  readonly variant?: 'solid' | 'subtle' | 'outline' | 'ghost' | undefined;
  /**
   * Height: `sm`, `md` or `lg`, the `size.control-*` tokens. In `lg`, the label is larger too,
   * with wider sides and a wider gap to its icon: the `label-lg` text style,
   * `space.control-inset-lg` and `space.control-gap-lg`.
   *
   * @defaultValue 'md'
   */
  readonly size?: 'sm' | 'md' | 'lg' | undefined;
  /**
   * Turn the button off: no presses, no focus, and disabled to assistive technology.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
  /** Styles after the button's own, or a function of its state that returns them. */
  readonly style?: StyleProp | ((state: ButtonState) => StyleProp) | undefined;
  /** The label: strings and numbers are set in the button's text style; elements as they are. */
  readonly children?: ReactNode;
}

type Variant = NonNullable<ButtonProps['variant']>;
type Size = NonNullable<ButtonProps['size']>;

const HEIGHT = { sm: 'control-sm', md: 'control-md', lg: 'control-lg' } as const;

function rootStyle(
  tokens: SoundorTokens,
  variant: Variant,
  size: Size,
  disabled: boolean,
  { hovered }: ButtonState,
): Style {
  const { color } = tokens;
  // Transparent unless a variant colors it; keeps every variant the same size.
  let borderColor = 'transparent';
  let backgroundColor = 'transparent';
  // The state is at rest while disabled, so a disabled button is never hovered.
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

function labelStyle(tokens: SoundorTokens, variant: Variant, size: Size, disabled: boolean): Style {
  const { color } = tokens;
  let textColor = variant === 'solid' ? color.accent['on-fill'] : color.fg.default;
  if (disabled) {
    textColor = color.fg.disabled;
  }
  return { ...tokens.text[size === 'lg' ? 'label-lg' : 'label'], color: textColor };
}

/**
 * A button in one of four variants and three sizes, on Soundor's `Pressable`: a click, Enter or
 * Space, or assistive technology's "activate" calls `onPress`. The same variants and sizes as the
 * `Button` of `@contour-ui/react`, drawn with the token values of the theme.
 *
 * @example
 * <Button onPress={save}>Save</Button>
 * <Button variant="outline" size="lg" onPress={reset}>Reset</Button>
 */
export function Button({
  variant = 'solid',
  size = 'md',
  disabled = false,
  style,
  children,
  ...props
}: ButtonProps): ReactElement {
  const tokens = useTokens();
  const { state, props: pressable } = useInteractionState({ ...props, disabled });
  const label = labelStyle(tokens, variant, size, disabled);
  const content = Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <Text style={label}>{child}</Text>
    ) : (
      child
    ),
  );
  return (
    <Pressable
      {...pressable}
      style={[
        rootStyle(tokens, variant, size, disabled, state),
        // As `:focus-visible` on the web: a key gave the focus, or was pressed since a press did.
        state.focusVisible && focusRingStyle(tokens),
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {content}
    </Pressable>
  );
}
