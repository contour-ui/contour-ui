import { Popover as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PopoverAnchorProps = Headless.AnchorProps;

/**
 * Popover anchor: a `div` the content is placed next to instead of the trigger, such as a field
 * with the trigger at its end. It has no look of its own.
 */
export function PopoverAnchor({ className, ...props }: PopoverAnchorProps): ReactElement {
  return <Headless.Anchor className={cx('contour-popover__anchor', className)} {...props} />;
}
