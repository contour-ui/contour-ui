import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type AlertTitleProps = PrimitiveProps<'div'>;

/**
 * The alert's title, a `div`. To make it a heading of the page outline, render
 * one with `asChild`: `<Alert.Title asChild><h3>…</h3></Alert.Title>`.
 */
export function AlertTitle({ className, ...props }: AlertTitleProps): ReactElement {
  const ownProps = {
    className: cx('contour-alert__title', className),
    'data-scope': 'alert',
    'data-part': 'title',
  } as const;

  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
