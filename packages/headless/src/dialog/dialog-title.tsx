'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useDialogContext } from './dialog-context.ts';

export type DialogTitleProps = PrimitiveProps<'h2'>;

/**
 * Dialog title: an `h2` that names the dialog (`aria-labelledby` of the content). For another
 * heading level, pass that heading with `asChild`.
 *
 * @example
 * <Dialog.Title>Delete the take?</Dialog.Title>
 */
export function DialogTitle({ ref, ...props }: DialogTitleProps): ReactElement {
  const api = useDialogContext();
  const ownProps = api.getTitleProps();
  const composedRef = useComposedRefs<HTMLHeadingElement>(ownProps.ref, ref);
  return <Primitive.h2 {...mergeProps(ownProps, props)} ref={composedRef} />;
}
