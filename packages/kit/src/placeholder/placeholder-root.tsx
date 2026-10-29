import { Placeholder as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PlaceholderRootProps = Headless.RootProps;

/** Placeholder styled part: the headless root plus the `contour-placeholder` class from `styles.css`. */
export function PlaceholderRoot({ className, ...props }: PlaceholderRootProps): ReactElement {
  return <Headless.Root className={cx('contour-placeholder', className)} {...props} />;
}
