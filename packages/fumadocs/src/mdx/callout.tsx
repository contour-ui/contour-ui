import { Alert } from '@contour-ui/react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

/** The callout types of Fumadocs, whose MDX API the pages keep. */
type CalloutType = 'info' | 'warn' | 'warning' | 'error' | 'success' | 'idea';

const STATUS: Readonly<Record<CalloutType, NonNullable<Alert.RootProps['status']>>> = {
  info: 'info',
  warn: 'warning',
  warning: 'warning',
  error: 'danger',
  success: 'success',
  idea: 'neutral',
};

export interface CalloutProps extends Omit<ComponentProps<'div'>, 'title'> {
  /**
   * The alert status: `warn` and `warning` are `warning`, `error` is `danger`, `idea` is
   * `neutral`. An unknown type falls back to the alert's default, `info`.
   *
   * @defaultValue 'info'
   */
  type?: CalloutType | undefined;
  title?: ReactNode;
  /** Replaces the status icon. */
  icon?: ReactNode;
}

/**
 * MDX `<Callout>` as the styled `Alert`: the title, then the content, which may hold paragraphs.
 */
export function Callout({
  type = 'info',
  title,
  icon,
  children,
  ...props
}: CalloutProps): ReactElement {
  return (
    <Alert.Root {...props} status={STATUS[type]}>
      <Alert.Indicator>{icon}</Alert.Indicator>
      <Alert.Content>
        {title === undefined ? null : <Alert.Title>{title}</Alert.Title>}
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}
