'use client';

import { Dialog as Headless, mergeProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useDialogStyle } from './dialog-context.ts';

export type DialogContentProps = Headless.ContentProps;

/**
 * Dialog content: the dialog itself, a raised panel with a border, a shadow and the corners of
 * a panel, as wide as `size` allows and no higher than the viewport. It stacks its parts; a
 * long `Dialog.Body` scrolls between the header and the footer. It grows in when it opens and
 * fades out when it closes, without the movement under reduced motion.
 *
 * @example
 * <Dialog.Content>
 *   <Dialog.CloseTrigger />
 *   <Dialog.Header>
 *     <Dialog.Title>Settings</Dialog.Title>
 *   </Dialog.Header>
 *   <Dialog.Body>…</Dialog.Body>
 * </Dialog.Content>
 */
export function DialogContent({ className, ...props }: DialogContentProps): ReactElement | null {
  const { placement, size } = useDialogStyle();
  const ownProps = {
    className: cx('contour-dialog__content', className),
    'data-placement': placement,
    'data-size': size,
  };
  return <Headless.Content {...mergeProps(ownProps, props)} />;
}
