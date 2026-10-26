import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useDialogContext } from './dialog-context.ts';

export type DialogDescriptionProps = PrimitiveProps<'p'>;

/**
 * Dialog description: a `p` that describes the dialog (`aria-describedby` of the content),
 * read after its name. For block content, pass a `div` with `asChild`.
 *
 * @example
 * <Dialog.Description>The take is gone for good.</Dialog.Description>
 */
export function DialogDescription({ ref, ...props }: DialogDescriptionProps): ReactElement {
  const api = useDialogContext();
  const ownProps = api.getDescriptionProps();
  const composedRef = useComposedRefs<HTMLParagraphElement>(ownProps.ref, ref);
  return <Primitive.p {...mergeProps(ownProps, props)} ref={composedRef} />;
}
