'use client';

import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { CloseButton } from '../button/index.ts';
import type { CloseButtonProps } from '../button/index.ts';
import { cx } from '../utils/cx.ts';

export interface DrawerCloseTriggerProps extends Omit<CloseButtonProps, 'asChild' | 'children'> {
  /**
   * Render the only child as the close trigger instead of the x: a `Button` that reads "Cancel",
   * say. It keeps its own look and its place in the layout; `label`, `variant` and `size` are
   * for the x only.
   *
   * @defaultValue false
   */
  asChild?: boolean | undefined;
  /** With `asChild`, the element that closes the drawer. */
  children?: ReactElement | undefined;
}

/**
 * Drawer close trigger: a small ghost x button, labeled "Close", in the top end corner of the
 * content; the header makes room for it. With `asChild`, the child closes the drawer instead,
 * such as a "Cancel" button in the footer.
 *
 * @example
 * <Drawer.Content>
 *   <Drawer.CloseTrigger />
 *   …
 *   <Drawer.Footer>
 *     <Drawer.CloseTrigger asChild>
 *       <Button variant="outline">Cancel</Button>
 *     </Drawer.CloseTrigger>
 *   </Drawer.Footer>
 * </Drawer.Content>
 */
export function DrawerCloseTrigger({
  asChild = false,
  children,
  className,
  label,
  variant,
  size = 'sm',
  ...props
}: DrawerCloseTriggerProps): ReactElement {
  if (asChild) {
    return (
      <Headless.CloseTrigger asChild className={className} {...props}>
        {children}
      </Headless.CloseTrigger>
    );
  }
  return (
    <Headless.CloseTrigger asChild>
      <CloseButton
        label={label}
        variant={variant}
        size={size}
        className={cx('contour-drawer__close-trigger', className)}
        {...props}
      />
    </Headless.CloseTrigger>
  );
}
