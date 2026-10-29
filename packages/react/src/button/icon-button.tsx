import { mergeProps } from '@contour-ui/headless-react';
import type { IconData } from '@contour-ui/icons';
import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { Icon } from '../icon/index.ts';
import { cx } from '../utils/cx.ts';
import { Button } from './button.tsx';
import type { ButtonProps } from './button.tsx';

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** Accessible name (`aria-label`): what the button does, since only its icon is visible. */
  label: string;
  /** The icon: one of the `<camelName>Icon` exports of `@contour-ui/icons`. */
  icon: IconData;
  /**
   * With `asChild`, the element to render in place of `<button>`, e.g. a link;
   * the icon becomes its content. Not used without `asChild`.
   */
  children?: ReactElement | undefined;
}

/** The icon, or, with `asChild`, the child element with the icon as its content. */
function content(icon: ReactElement, asChild: boolean, children: ReactNode): ReactNode {
  if (!asChild) {
    return icon;
  }
  // Anything but one element goes on as is, for `Primitive` to reject.
  return isValidElement(children) ? cloneElement(children, undefined, icon) : children;
}

/**
 * A square button that shows only an icon, with a required `label` as its
 * accessible name. Same variants and sizes as {@link Button}.
 *
 * @example
 * <IconButton label="Open menu" icon={menuIcon} variant="ghost" />
 * <IconButton asChild label="GitHub" icon={githubIcon} variant="ghost">
 *   <a href="https://github.com/contour-ui/contour-ui" />
 * </IconButton>
 */
export function IconButton({
  label,
  icon,
  asChild = false,
  children,
  className,
  ...props
}: IconButtonProps): ReactElement {
  const ownProps = {
    asChild,
    className: cx('contour-icon-button', className),
    'aria-label': label,
    'data-scope': 'icon-button',
  };

  return (
    <Button {...mergeProps(ownProps, props)}>
      {content(<Icon icon={icon} />, asChild, children)}
    </Button>
  );
}
