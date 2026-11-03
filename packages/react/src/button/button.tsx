import { useStyles } from '#platform/styles';
import { mergeProps, Primitive, resolveStyle, useStyleState } from '@contour-ui/primitive';
import type { InteractionState, PartStyle, PrimitiveProps } from '@contour-ui/primitive';
import type { ReactElement } from 'react';

import { buttonLook } from './button.look.ts';
import type { ButtonSize, ButtonVariant } from './button.look.ts';

/**
 * The state of a button, as a `style` function receives it on Soundor: hovered, pressed, focused,
 * and whether it shows its focus (`focusVisible`, as `:focus-visible` on the web: a key gave the
 * focus, or a key was pressed since a press did). At rest while disabled.
 */
export type ButtonState = InteractionState;

export interface ButtonProps extends Omit<PrimitiveProps<'button'>, 'style' | 'disabled'> {
  /**
   * How much the button stands out: `solid` (accent fill, for the main action), `subtle`
   * (neutral fill), `outline` (border only) or `ghost` (no fill until hovered).
   *
   * @defaultValue 'solid'
   */
  readonly variant?: ButtonVariant | undefined;
  /**
   * Height: `sm`, `md` or `lg`, the `size.control-*` tokens (`--ct-size-control-*` on the web).
   * In `lg`, the label is larger too, with wider sides and a wider gap to its icon: the
   * `label-lg` text style, `space.control-inset-lg` and `space.control-gap-lg`.
   *
   * @defaultValue 'md'
   */
  readonly size?: ButtonSize | undefined;
  /**
   * Turn the button off: no presses, and disabled to assistive technology. On the web a
   * `<button>` gets the `disabled` attribute, and an `asChild` element, such as a link,
   * `aria-disabled="true"` and no clicks, so a link does not navigate; both get
   * `data-disabled`. On Soundor it takes no focus either.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
  /**
   * Styles after the button's own: CSS properties on the web; on Soundor styles, or a function
   * of the {@link ButtonState} that returns them.
   */
  readonly style?: PartStyle<ButtonState> | undefined;
}

/**
 * A button in one of four variants and three sizes, the same on every platform: a click, Enter
 * or Space, or assistive technology's "activate" calls `onPress`. On the web it renders
 * `<button type="button">` (with `asChild`, its only child, e.g. a link) and takes `onClick`
 * too; on Soundor a `Pressable`, drawn with the token values of the theme, which sets strings
 * and numbers in its label's text style.
 *
 * @example
 * <Button onPress={save}>Save</Button>
 * <Button asChild variant="outline">
 *   <a href="/docs">Docs</a>
 * </Button>
 */
export function Button({
  variant = 'solid',
  size = 'md',
  disabled = false,
  children,
  ...props
}: ButtonProps): ReactElement {
  // On the web the state rests and CSS draws the hover and the focus ring: no hooks run, so a
  // server renders the button. On Soundor it follows the Pressable.
  const { state, props: stateProps } = useStyleState({ disabled });
  const look = useStyles(buttonLook, { variant, size, disabled }, state);
  // The user's styles after the look's, in their place among the user's props.
  const user = { ...props, style: resolveStyle(props.style, state) };
  return (
    <Primitive.button disabled={disabled} {...mergeProps(stateProps, look.root, user)}>
      {children}
    </Primitive.button>
  );
}
