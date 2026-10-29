import { Collapsible as Headless } from '@contour-ui/headless-react';
import { chevronRightIcon } from '@contour-ui/icons';
import type { ReactElement } from 'react';

import { Icon } from '../icon/index.ts';
import { cx } from '../utils/cx.ts';

export type CollapsibleIndicatorProps = Headless.IndicatorProps;

/**
 * Collapsible indicator: a chevron that points to the end while the collapsible is closed and
 * turns down as it opens. Pass children to draw something else; they turn the same way.
 *
 * @example
 * <Collapsible.Trigger>
 *   <Collapsible.Indicator />
 *   Shipping
 * </Collapsible.Trigger>
 */
export function CollapsibleIndicator({
  className,
  children,
  ...props
}: CollapsibleIndicatorProps): ReactElement {
  return (
    <Headless.Indicator className={cx('contour-collapsible__indicator', className)} {...props}>
      {children ?? <Icon icon={chevronRightIcon} />}
    </Headless.Indicator>
  );
}
