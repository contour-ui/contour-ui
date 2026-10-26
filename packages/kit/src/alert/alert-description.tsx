import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type AlertDescriptionProps = PrimitiveProps<'div'>;

/** The alert's message, a `div`: text, or paragraphs and lists. */
export function AlertDescription({ className, ...props }: AlertDescriptionProps): ReactElement {
  const ownProps = {
    className: cx('contour-alert__description', className),
    'data-scope': 'alert',
    'data-part': 'description',
  } as const;

  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
