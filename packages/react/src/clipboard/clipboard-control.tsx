import { Clipboard as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ClipboardControlProps = Headless.ControlProps;

/**
 * Clipboard control: the row that holds the value text and the trigger, with a border and the
 * height of a control of the root's size, as a text field. A trigger at its end fills it up to
 * the border.
 *
 * @example
 * <Clipboard.Control>
 *   <Clipboard.ValueText />
 *   <Clipboard.Trigger />
 * </Clipboard.Control>
 */
export function ClipboardControl({ className, ...props }: ClipboardControlProps): ReactElement {
  return <Headless.Control className={cx('contour-clipboard__control', className)} {...props} />;
}
