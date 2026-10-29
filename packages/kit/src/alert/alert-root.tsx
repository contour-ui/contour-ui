'use client';

import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { AlertStatusContext } from './alert-context.ts';
import type { AlertStatus } from './alert-context.ts';

/** How an alert stands out: a tinted background, or the border alone. */
export type AlertVariant = 'subtle' | 'outline';

export interface AlertRootProps extends PrimitiveProps<'div'> {
  /**
   * What the alert is about. Sets its colors and the icon of `Alert.Indicator`;
   * `neutral` is for tips and notes.
   *
   * @defaultValue 'info'
   */
  status?: AlertStatus | undefined;
  /**
   * `subtle`: a background tinted with the status color. `outline`: the status
   * border and icon on a transparent background.
   *
   * @defaultValue 'subtle'
   */
  variant?: AlertVariant | undefined;
}

/**
 * The alert: a `div` that lays out the indicator next to the content and
 * shares its status with the parts. It has no role, so assistive technology
 * reads it as part of the page; give a message that appears while the page is
 * open `role="status"`, or `role="alert"` if it is urgent.
 *
 * @example
 * <Alert.Root status="warning">
 *   <Alert.Indicator />
 *   <Alert.Content>
 *     <Alert.Title>Pre-release</Alert.Title>
 *     <Alert.Description>The packages are not on npm yet.</Alert.Description>
 *   </Alert.Content>
 * </Alert.Root>
 */
export function AlertRoot({
  status = 'info',
  variant = 'subtle',
  className,
  ...props
}: AlertRootProps): ReactElement {
  const ownProps = {
    className: cx('contour-alert', className),
    'data-scope': 'alert',
    'data-part': 'root',
    'data-status': status,
    'data-variant': variant,
  } as const;

  return (
    <AlertStatusContext value={status}>
      <Primitive.div {...mergeProps(ownProps, props)} />
    </AlertStatusContext>
  );
}
