'use client';

import { Dialog as Headless, mergeProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useDialogStyle } from './dialog-context.ts';

export type DialogPositionerProps = Headless.PositionerProps;

/**
 * Dialog positioner: covers the viewport and places the content in its middle, or near its
 * top (`placement` of the root), with a margin all round. Presses around the content go
 * through it to the backdrop.
 */
export function DialogPositioner({
  className,
  ...props
}: DialogPositionerProps): ReactElement | null {
  const { placement } = useDialogStyle();
  const ownProps = {
    className: cx('contour-dialog__positioner', className),
    'data-placement': placement,
  };
  return <Headless.Positioner {...mergeProps(ownProps, props)} />;
}
