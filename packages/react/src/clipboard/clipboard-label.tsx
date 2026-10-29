import { Clipboard as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ClipboardLabelProps = Headless.LabelProps;

/**
 * Clipboard label: a caption above the control that says what the value is. While it is
 * mounted, it names the root, a `group`.
 *
 * @example
 * <Clipboard.Label>Install command</Clipboard.Label>
 */
export function ClipboardLabel({ className, ...props }: ClipboardLabelProps): ReactElement {
  return <Headless.Label className={cx('contour-clipboard__label', className)} {...props} />;
}
