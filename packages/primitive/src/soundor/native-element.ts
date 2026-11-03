import type { UiNode } from 'soundor:ui';
import { Children, useLayoutEffect, useRef } from 'react';
import type { ReactNode, Ref, RefObject } from 'react';

import { useIdTexts } from '../native/id-registry.ts';
import { translateProps } from '../native/translate.ts';
import { useComposedRefs } from '../shared/compose-refs.ts';
import { idRegistry } from './id-registry.ts';
import type { NodeElement } from './types.ts';

/** What the shared implementation reads of the props of an element with a node. */
export interface NodeInput {
  readonly id?: string | undefined;
  readonly 'aria-labelledby'?: string | undefined;
  readonly 'aria-describedby'?: string | undefined;
  readonly tabIndex?: number | undefined;
  readonly children?: ReactNode;
  readonly ref?: Ref<UiNode> | undefined;
}

/** An element with a node, translated: the props of its Soundor component, and whether it hides. */
export interface NativeElement {
  /** The props of the Soundor component, `ref` included; the children are the host's to add. */
  readonly props: Readonly<Record<string, unknown>>;
  /** Hidden from assistive technology: the runs of text it wraps are, too. */
  readonly hidden: boolean;
}

/** The text of a node as accname reads its content: a text's, or the texts inside it. */
function textOfNode(node: UiNode): string {
  if (node.type === 'text') {
    return node.text;
  }
  return node.children
    .map((child) => textOfNode(child).trim())
    .filter((text) => text !== '')
    .join(' ');
}

/** The text of an element with an id, for the elements that point at it. */
function readText(node: UiNode | null, children: ReactNode): string {
  if (node !== null) {
    return textOfNode(node);
  }
  // A `Text` inside another one is a span of it, with no node of its own: its strings.
  const strings: string[] = [];
  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      strings.push(String(child));
    }
  });
  return strings.join('');
}

/**
 * The focus fixup of the DOM: an element that stops taking focus while it has it gives it up.
 * Soundor keeps the focus of a node that turns unfocusable.
 */
function useFocusFixup(node: RefObject<UiNode | null>, focusable: boolean): void {
  useLayoutEffect(() => {
    const current = node.current;
    if (!focusable && current?.focused === true) {
      current.blur();
    }
  }, [node, focusable]);
}

/**
 * Translate an element with a node: its id references, its props (`translateProps`), its ref
 * composed with the node's own, and the focus fixup for `focusable`. `own` are the props the host
 * gives explicitly on top (`focusable`, `disabled`, a merged `style`), `undefined` ones left out.
 */
export function useNativeElement(
  element: NodeElement,
  props: NodeInput,
  focusable: boolean,
  own: Readonly<Record<string, unknown>>,
): NativeElement {
  const node = useRef<UiNode | null>(null);
  const ref = useComposedRefs<UiNode>(node, props.ref);
  const ids = useIdTexts(
    idRegistry,
    node,
    { id: props.id, labelledBy: props['aria-labelledby'], describedBy: props['aria-describedby'] },
    () => readText(node.current, props.children),
  );
  useFocusFixup(node, focusable);
  const out: Record<string, unknown> = {};
  const hidden = translateProps(element, props, ids, out);
  for (const key in own) {
    const value = own[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  out['ref'] = ref;
  return { props: out, hidden };
}
