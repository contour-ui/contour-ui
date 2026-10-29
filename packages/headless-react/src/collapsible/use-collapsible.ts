'use client';

import { collapsible } from '@contour-ui/core';
import type { Platform } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useId, useState } from 'react';
import type { MouseEvent, RefCallback } from 'react';

import { schedule } from '../platform/clock.ts';

/** Props of {@link useCollapsible}: the input of the collapsible machine of `@contour-ui/core`. */
export type UseCollapsibleProps = collapsible.Input;

/** The state of the collapsible, as its parts carry it. */
export type CollapsibleDataState = 'open' | 'closed';

/** What every part of a collapsible carries: its name, the state, and whether it is disabled. */
export interface CollapsiblePartAttributes<Part extends string> {
  readonly 'data-scope': 'collapsible';
  readonly 'data-part': Part;
  readonly 'data-state': CollapsibleDataState;
  /** Present, empty, while the collapsible is disabled. */
  readonly 'data-disabled': '' | undefined;
}

/** Props of the trigger: a button that opens and closes the collapsible. */
export interface CollapsibleTriggerAttributes extends CollapsiblePartAttributes<'trigger'> {
  readonly type: 'button';
  readonly 'aria-expanded': boolean;
  /** The id of the content, while it is mounted. */
  readonly 'aria-controls': string | undefined;
  readonly disabled: boolean;
  readonly onClick: (event: MouseEvent) => void;
}

/** Props of the content: the region the trigger shows and hides. */
export interface CollapsibleContentAttributes extends CollapsiblePartAttributes<'content'> {
  /** A generated id; pass another one to the element, and the trigger follows it. */
  readonly id: string;
  /** Tells the collapsible the id of its content, for the trigger's `aria-controls`. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the indicator: a decoration that shows the state, such as a chevron. */
export interface CollapsibleIndicatorAttributes extends CollapsiblePartAttributes<'indicator'> {
  readonly 'aria-hidden': true;
}

/** What {@link useCollapsible} returns: the collapsible API and the props of each element. */
export interface UseCollapsibleReturn extends collapsible.Api {
  readonly getRootProps: () => CollapsiblePartAttributes<'root'>;
  readonly getTriggerProps: () => CollapsibleTriggerAttributes;
  readonly getContentProps: () => CollapsibleContentAttributes;
  readonly getIndicatorProps: () => CollapsibleIndicatorAttributes;
}

/**
 * The DOM platform of the collapsible machine, which asks for nothing but a clock. A module-level
 * constant, since `useMachine` reads it once.
 */
const platform: Platform<collapsible.Schema> = { schedule, actions: {}, effects: {} };

/**
 * Run the collapsible machine of `@contour-ui/core` in a component: its API (`open`,
 * `disabled`, `setOpen()`, `toggle()`) and the props of each element. `Collapsible.Root` calls
 * it, and adds the presence that shows and hides the content after its exit animation and the
 * size variables of the content; call it yourself to build the parts from your own elements.
 *
 * @example
 * const api = useCollapsible({ defaultOpen: true });
 * <div {...api.getRootProps()}>
 *   <button {...api.getTriggerProps()}>Details</button>
 *   <div {...api.getContentProps()} hidden={!api.open}>
 *     Ships in two days.
 *   </div>
 * </div>;
 */
export function useCollapsible(props: UseCollapsibleProps = {}): UseCollapsibleReturn {
  const service = useMachine(collapsible.machine, props, platform);
  const api = collapsible.connect(service);
  const { open, disabled } = api;

  const baseId = useId();
  // The id of the mounted content, which may be the generated one or the owner's.
  const [contentId, setContentId] = useState<string | undefined>(undefined);
  const contentRef = useCallback((element: HTMLElement | null) => {
    if (element === null) {
      return undefined;
    }
    setContentId(element.id === '' ? undefined : element.id);
    return () => {
      setContentId(undefined);
    };
  }, []);

  const part = <Part extends string>(name: Part): CollapsiblePartAttributes<Part> => ({
    'data-scope': 'collapsible',
    'data-part': name,
    'data-state': open ? 'open' : 'closed',
    'data-disabled': disabled ? '' : undefined,
  });

  return {
    ...api,
    getRootProps: () => part('root'),
    getTriggerProps: () => ({
      ...part('trigger'),
      type: 'button',
      'aria-expanded': open,
      'aria-controls': contentId,
      disabled,
      onClick: (event) => {
        // The owner's handler runs first: `event.preventDefault()` there keeps the state.
        if (!event.defaultPrevented) {
          api.toggle();
        }
      },
    }),
    getContentProps: () => ({
      ...part('content'),
      id: `${baseId}content`,
      ref: contentRef,
    }),
    getIndicatorProps: () => ({ ...part('indicator'), 'aria-hidden': true }),
  };
}
