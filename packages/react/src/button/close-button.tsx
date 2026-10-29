import { mergeProps } from '@contour-ui/headless-react';
import { xIcon } from '@contour-ui/icons';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { IconButton } from './icon-button.tsx';
import type { IconButtonProps } from './icon-button.tsx';

export interface CloseButtonProps extends Omit<IconButtonProps, 'icon' | 'label' | 'variant'> {
  /**
   * Accessible name (`aria-label`). Name what closes when several things can,
   * e.g. `"Close search"`.
   *
   * @defaultValue 'Close'
   */
  label?: string | undefined;
  /**
   * How much the button stands out, as on {@link IconButton}.
   *
   * @defaultValue 'ghost'
   */
  variant?: IconButtonProps['variant'];
}

/**
 * An {@link IconButton} with an x icon that closes a dialog, a drawer or an
 * alert. Handle the closing in `onClick`.
 *
 * @example
 * <CloseButton onClick={() => setOpen(false)} />
 */
export function CloseButton({
  label = 'Close',
  variant = 'ghost',
  className,
  ...props
}: CloseButtonProps): ReactElement {
  const ownProps = {
    icon: xIcon,
    label,
    variant,
    className: cx('contour-close-button', className),
    'data-scope': 'close-button',
  };

  return <IconButton {...mergeProps(ownProps, props)} />;
}
