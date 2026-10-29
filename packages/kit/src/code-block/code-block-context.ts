'use client';

import { createContext } from 'react';
import type { Context, RefObject } from 'react';

/** What `CodeBlock.Root` shares with its parts. */
export interface CodeBlockContextValue {
  /** The text the copy trigger copies: the root's `value`, when it has one. */
  readonly value: string | undefined;
  /** The element of `CodeBlock.Content`, whose text the copy trigger reads when clicked. */
  readonly contentRef: RefObject<HTMLDivElement | null>;
  /** The id `CodeBlock.Title` takes unless it is given one. */
  readonly titleId: string;
  /** Called by a mounted title with its id, so the root is named by it; returns the undo. */
  readonly registerTitle: (id: string) => () => void;
}

/** The nearest `CodeBlock.Root`, or `null`: each part also works on its own. */
export const CodeBlockContext: Context<CodeBlockContextValue | null> =
  createContext<CodeBlockContextValue | null>(null);
