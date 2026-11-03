'use client';

import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import {
  circleCheckIcon,
  circleXIcon,
  infoIcon,
  lightbulbIcon,
  triangleAlertIcon,
} from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { use } from 'react';
import type { ReactElement } from 'react';

import { Icon } from '../icon/index.ts';
import { cx } from '../utils/cx.ts';
import { AlertStatusContext } from './alert-context.ts';
import type { AlertStatus } from './alert-context.ts';

/** The icon an indicator without children shows for each status. */
const STATUS_ICONS: Readonly<Record<AlertStatus, IconData>> = {
  info: infoIcon,
  success: circleCheckIcon,
  warning: triangleAlertIcon,
  danger: circleXIcon,
  neutral: lightbulbIcon,
};

export type AlertIndicatorProps = PrimitiveProps<'span'>;

/**
 * A `span` with the icon of the alert's status, in the status color. The icon
 * is decorative; children replace it, e.g. `<Icon icon={moonIcon} />`.
 */
export function AlertIndicator({
  className,
  children,
  ...props
}: AlertIndicatorProps): ReactElement {
  const status = use(AlertStatusContext);
  const ownProps = {
    className: cx('contour-alert__indicator', className),
    'data-scope': 'alert',
    'data-part': 'indicator',
  } as const;

  return (
    <Primitive.span {...mergeProps(ownProps, props)}>
      {children ?? <Icon icon={STATUS_ICONS[status]} />}
    </Primitive.span>
  );
}
