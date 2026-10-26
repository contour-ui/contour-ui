import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { MouseEvent, ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface ButtonProps extends PrimitiveProps<'button'> {
  /**
   * How much the button stands out: `solid` (accent fill, for the main action),
   * `subtle` (neutral fill), `outline` (border only) or `ghost` (no fill until
   * hovered).
   *
   * @defaultValue 'solid'
   */
  variant?: 'solid' | 'subtle' | 'outline' | 'ghost' | undefined;
  /**
   * Height: `sm`, `md` or `lg`, the `--ct-size-control-*` tokens.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg' | undefined;
  /**
   * Turn the button off. A `<button>` gets the `disabled` attribute. An
   * `asChild` element, such as a link, gets `aria-disabled="true"` and ignores
   * clicks, so a link does not navigate. Both get `data-disabled`.
   *
   * @defaultValue false
   */
  disabled?: boolean | undefined;
}

/**
 * Click on a disabled `asChild` element: no default action (a link does not
 * navigate) and no click handlers, like a click on a disabled `<button>`.
 * Stopped in the capture phase, so the handlers of the element never run.
 */
function ignoreClick(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * A button in one of four variants and three sizes. Renders
 * `<button type="button">`; with `asChild`, its only child, e.g. a link.
 *
 * @example
 * <Button onClick={save}>Save</Button>
 * <Button asChild variant="outline">
 *   <a href="/docs">Docs</a>
 * </Button>
 */
export function Button({
  variant = 'solid',
  size = 'md',
  disabled = false,
  asChild = false,
  className,
  ...props
}: ButtonProps): ReactElement {
  const ownProps = {
    type: asChild ? undefined : 'button',
    disabled: asChild ? undefined : disabled,
    'aria-disabled': asChild && disabled ? true : undefined,
    onClickCapture: asChild && disabled ? ignoreClick : undefined,
    className: cx('contour-button', className),
    'data-scope': 'button',
    'data-part': 'root',
    'data-variant': variant,
    'data-size': size,
    'data-disabled': disabled ? '' : undefined,
  } as const;

  return <Primitive.button asChild={asChild} {...mergeProps(ownProps, props)} />;
}
