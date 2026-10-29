'use client';

import { Popover as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { CloseButton } from '../button/index.ts';
import type { CloseButtonProps } from '../button/index.ts';
import { cx } from '../utils/cx.ts';

export interface PopoverCloseTriggerProps extends Omit<CloseButtonProps, 'asChild' | 'children'> {
  /**
   * Render the only child as the close trigger instead of the x: a `Button` that reads "Done",
   * say. It keeps its own look and its place in the layout; `label`, `variant` and `size` are
   * for the x only.
   *
   * @defaultValue false
   */
  asChild?: boolean | undefined;
  /** With `asChild`, the element that closes the popover. */
  children?: ReactElement | undefined;
}

/**
 * Popover close trigger: a small ghost x button, labeled "Close", in the top end corner of the
 * content; the title makes room for it. Put it after the rest of the content, so that focus
 * moves to the content first when the popover opens. With `asChild`, the child closes the
 * popover instead, such as a "Done" button.
 *
 * @example
 * <Popover.Content>
 *   <Popover.Title>Share this page</Popover.Title>
 *   <Popover.CloseTrigger />
 * </Popover.Content>
 */
export function PopoverCloseTrigger({
  asChild = false,
  children,
  className,
  label,
  variant,
  size = 'sm',
  ...props
}: PopoverCloseTriggerProps): ReactElement {
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
        className={cx('contour-popover__close-trigger', className)}
        {...props}
      />
    </Headless.CloseTrigger>
  );
}
