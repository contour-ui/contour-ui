import { Listbox as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type ListboxContentProps = Headless.ContentProps;

/**
 * Listbox content: the list. It has no frame of its own, and scrolls once a height is set on it
 * (`max-block-size`): the highlighted item then scrolls into view inside it.
 */
export function ListboxContent({ className, ...props }: ListboxContentProps): ReactElement {
  return <Headless.Content className={cx('contour-listbox__content', className)} {...props} />;
}
