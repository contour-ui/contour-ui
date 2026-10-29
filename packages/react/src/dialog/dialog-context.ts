'use client';

import { createContext, use } from 'react';
import type { Context } from 'react';

/** Where the dialog sits in the viewport: in the middle, or near the top. */
export type DialogPlacement = 'center' | 'top';

/** How wide the dialog can grow. */
export type DialogSize = 'sm' | 'md' | 'lg';

/** The look of the nearest `Dialog.Root`, for the parts that render it. */
export interface DialogStyle {
  readonly placement: DialogPlacement;
  readonly size: DialogSize;
}

/** The look of the nearest `Dialog.Root`. */
export const DialogStyleContext: Context<DialogStyle> = createContext<DialogStyle>({
  placement: 'center',
  size: 'md',
});

/** The look of the nearest `Dialog.Root`: the defaults outside of one. */
export function useDialogStyle(): DialogStyle {
  return use(DialogStyleContext);
}
