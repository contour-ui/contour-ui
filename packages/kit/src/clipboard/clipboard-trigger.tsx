'use client';

import { Clipboard as Headless } from '@contour-ui/headless-react';
import { use } from 'react';
import type { ReactElement } from 'react';

import { Button } from '../button/index.ts';
import type { ButtonProps } from '../button/index.ts';
import { cx } from '../utils/cx.ts';
import { ClipboardSizeContext } from './clipboard-context.ts';
import { ClipboardIndicator } from './clipboard-indicator.tsx';

export interface ClipboardTriggerProps extends Omit<ButtonProps, 'asChild'> {
  /**
   * How much the trigger stands out, as on `Button`. In the control, `ghost` is muted until
   * hovered.
   *
   * @defaultValue 'ghost'
   */
  variant?: ButtonProps['variant'];
  /**
   * Size, as on `Button`.
   *
   * @defaultValue the `size` of `Clipboard.Root`
   */
  size?: ButtonProps['size'];
}

/**
 * Clipboard trigger: a Kit button that copies the value. Without children, it is a square icon
 * button whose copy icon turns into a check mark while copied; with children, such as an
 * indicator and "Copy", a text button. At the end of `Clipboard.Control` it fills the row up to
 * its border.
 *
 * Its accessible name is "Copy to clipboard" unless you pass another `aria-label`, and it keeps
 * the name while copied. Your `onClick` runs before the copy: `event.preventDefault()` there
 * cancels it.
 *
 * @example
 * <Clipboard.Trigger>
 *   <Clipboard.Indicator />
 *   Copy
 * </Clipboard.Trigger>
 * <Clipboard.Trigger aria-label="Copy the link" />
 */
export function ClipboardTrigger({
  variant = 'ghost',
  size,
  className,
  children,
  ...props
}: ClipboardTriggerProps): ReactElement {
  const rootSize = use(ClipboardSizeContext);
  const iconOnly = children === undefined;
  return (
    <Headless.Trigger asChild>
      <Button
        variant={variant}
        size={size ?? rootSize}
        className={cx(iconOnly && 'contour-icon-button', 'contour-clipboard__trigger', className)}
        {...props}
      >
        {iconOnly ? <ClipboardIndicator /> : children}
      </Button>
    </Headless.Trigger>
  );
}
