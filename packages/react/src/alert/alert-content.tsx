import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type AlertContentProps = PrimitiveProps<'div'>;

/** A `div` that stacks the title and the description next to the indicator. */
export function AlertContent({ className, ...props }: AlertContentProps): ReactElement {
  const ownProps = {
    className: cx('contour-alert__content', className),
    'data-scope': 'alert',
    'data-part': 'content',
  } as const;

  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
