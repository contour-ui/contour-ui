import { Clipboard as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface ClipboardValueTextProps extends Headless.ValueTextProps {
  /**
   * A mark before the value, such as `$` before a shell command, in the muted color. CSS draws
   * it: it is not part of the value, a selection of the text leaves it out, and screen readers
   * skip it.
   */
  prompt?: string | undefined;
}

/**
 * Clipboard value text: the value the trigger copies, in mono, on one line that ends in an
 * ellipsis when the row is too narrow for it. It takes the free width of the control, so the
 * trigger sits at the end.
 *
 * @example
 * <Clipboard.ValueText prompt="$" />
 */
export function ClipboardValueText({
  prompt,
  className,
  ...props
}: ClipboardValueTextProps): ReactElement {
  return (
    <Headless.ValueText
      className={cx('contour-clipboard__value-text', className)}
      // No attribute for an empty prompt, so no space is drawn before the value.
      data-prompt={prompt === '' ? undefined : prompt}
      {...props}
    />
  );
}
