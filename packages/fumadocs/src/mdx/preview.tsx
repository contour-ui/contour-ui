import type { ComponentProps, ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PreviewProps = ComponentProps<'div'>;

/**
 * Frame for live examples (`preview.css`): outside the prose styles (`contour-docs-not-prose`),
 * so components render with their own CSS. Like `Prose`, it renders on the server too.
 */
export function Preview({ className, ...props }: PreviewProps): ReactElement {
  return (
    <div {...props} className={cx('contour-docs-preview contour-docs-not-prose', className)} />
  );
}
