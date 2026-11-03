'use client';

import { createContext } from 'react';
import type { Context } from 'react';

import type { KnobSize } from './knob.look.ts';

/**
 * The size of the nearest `Knob.Root`, for the look of its parts: on native platforms the dial
 * takes the diameter of its size itself, since no stylesheet reads the size from the root.
 */
export const KnobSizeContext: Context<KnobSize> = createContext<KnobSize>('md');
