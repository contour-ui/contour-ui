'use client';

import { createContext } from 'react';
import type { Context } from 'react';

/** The size of a clipboard: `sm`, `md` or `lg`, the heights of the control tokens. */
export type ClipboardSize = 'sm' | 'md' | 'lg';

/** The size of the nearest `Clipboard.Root`, which its trigger takes unless it is given one. */
export const ClipboardSizeContext: Context<ClipboardSize> = createContext<ClipboardSize>('md');
