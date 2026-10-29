import { Collapsible as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CollapsibleContentProps = Headless.ContentProps;

/**
 * Collapsible content: what the trigger shows and hides. It grows to its height as it opens and
 * shrinks back as it closes (it only fades under reduced motion), and shows at once when the
 * collapsible starts open. It adds no spacing: put your own around what it holds.
 *
 * @example
 * <Collapsible.Content>Orders ship within two business days.</Collapsible.Content>
 */
export function CollapsibleContent({ className, ...props }: CollapsibleContentProps): ReactElement {
  return <Headless.Content className={cx('contour-collapsible__content', className)} {...props} />;
}
