'use client';

import { Clipboard as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { ClipboardSizeContext } from './clipboard-context.ts';

export interface ClipboardRootProps extends Headless.RootProps {
  /**
   * Height of the control, and the size of the trigger unless it has one of its own: `sm`, `md`
   * or `lg`, the `--ct-size-control-*` tokens. In `lg`, the value and the label are larger too,
   * with wider sides: the `code` and `label-lg` text styles and `--ct-space-control-inset-lg`.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg' | undefined;
}

/**
 * Clipboard root: runs the clipboard of `@contour-ui/headless-react` and stacks a label above the
 * control. A click on the trigger writes `value` to the clipboard; the trigger shows the copied
 * state for `timeout` milliseconds, and a visually hidden status element announces
 * `copiedMessage`. While a `Clipboard.Label` is mounted, the root is a `group` named by it.
 *
 * @example
 * <Clipboard.Root value="pnpm add @contour-ui/react">
 *   <Clipboard.Control>
 *     <Clipboard.ValueText prompt="$" />
 *     <Clipboard.Trigger>
 *       <Clipboard.Indicator />
 *       Copy
 *     </Clipboard.Trigger>
 *   </Clipboard.Control>
 * </Clipboard.Root>
 */
export function ClipboardRoot({
  size = 'md',
  className,
  ...props
}: ClipboardRootProps): ReactElement {
  return (
    <ClipboardSizeContext value={size}>
      <Headless.Root className={cx('contour-clipboard', className)} data-size={size} {...props} />
    </ClipboardSizeContext>
  );
}
