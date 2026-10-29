'use client';

import { popover } from '@contour-ui/core';
import type { Placement } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useId, useInsertionEffect, useMemo, useState } from 'react';
import type { CSSProperties, MouseEvent, RefCallback } from 'react';

import { getPositionerStyle } from '../platform/position.ts';
import { composeRefs } from '../primitive/index.ts';
import { createDomPlatform } from './popover-platform.ts';

/**
 * Props of {@link usePopover}: the input of the popover machine of `@contour-ui/core`, and the
 * options of the DOM.
 */
export interface UsePopoverProps extends popover.Input {
  /**
   * The element to focus when the popover opens, instead of the first one that takes focus in
   * the content. Called on the frame after the popover opens, so the element may be rendered
   * with the content. Ignored without `autoFocus`.
   */
  readonly initialFocusEl?: (() => HTMLElement | null | undefined) | undefined;
  /**
   * The element to focus when the popover closes, with `restoreFocus`. Without it, or when it
   * gives nothing that takes focus: the element that had focus when the popover opened, or the
   * trigger.
   */
  readonly finalFocusEl?: (() => HTMLElement | null | undefined) | undefined;
}

/** What every part of a popover carries. */
export interface PopoverPartAttributes<Part extends string> {
  readonly 'data-scope': 'popover';
  readonly 'data-part': Part;
}

/** The state of the popover, as the parts that show it carry it. */
export type PopoverDataState = 'open' | 'closed';

/** Props of the trigger: a button that opens and closes the popover. */
export interface PopoverTriggerAttributes extends PopoverPartAttributes<'trigger'> {
  readonly type: 'button';
  readonly 'aria-haspopup': 'dialog';
  readonly 'aria-expanded': boolean;
  /** The id of the content, while it is mounted. */
  readonly 'aria-controls': string | undefined;
  readonly 'data-state': PopoverDataState;
  readonly onClick: (event: MouseEvent) => void;
  /** Tells the popover its trigger: the element focus goes back to, and the default anchor. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the anchor: the element the content is placed next to, instead of the trigger. */
export interface PopoverAnchorAttributes extends PopoverPartAttributes<'anchor'> {
  readonly ref: RefCallback<HTMLElement>;
}

/**
 * Props of the positioner: the element that the platform moves next to the anchor. Its style
 * keeps it off screen until the first position; then the platform writes its `transform`, the
 * positioning variables and `data-placement` straight into it, and `--layer-index` too.
 */
export interface PopoverPositionerAttributes extends PopoverPartAttributes<'positioner'> {
  readonly 'data-state': PopoverDataState;
  readonly style: CSSProperties;
  /** Tells the popover its positioner: the element it places. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the content: the dialog itself, named by its title and described by its description. */
export interface PopoverContentAttributes extends PopoverPartAttributes<'content'> {
  /** A generated id; pass another one to the element, and the trigger follows it. */
  readonly id: string;
  readonly role: 'dialog';
  /** Focusable by script, for a content with nothing else to focus. */
  readonly tabIndex: -1;
  readonly 'aria-modal': true | undefined;
  /** The id of the title, while one is mounted. */
  readonly 'aria-labelledby': string | undefined;
  /** The id of the description, while one is mounted. */
  readonly 'aria-describedby': string | undefined;
  readonly 'data-state': PopoverDataState;
  /** The placement the content ended up with, after any flip. */
  readonly 'data-placement': Placement;
  /** Tells the popover its content: the layer, focus moves and what stays reachable. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the title or the description: an id the content points to, while it is mounted. */
export interface PopoverLabelAttributes<
  Part extends 'title' | 'description',
> extends PopoverPartAttributes<Part> {
  /** A generated id; pass another one to the element, and the content follows it. */
  readonly id: string;
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the close trigger: a button that closes the popover. */
export interface PopoverCloseTriggerAttributes extends PopoverPartAttributes<'close-trigger'> {
  readonly type: 'button';
  readonly onClick: (event: MouseEvent) => void;
}

/** What {@link usePopover} returns: the popover API and the props of each element. */
export interface UsePopoverReturn extends popover.Api {
  readonly getTriggerProps: () => PopoverTriggerAttributes;
  readonly getAnchorProps: () => PopoverAnchorAttributes;
  readonly getPositionerProps: () => PopoverPositionerAttributes;
  readonly getContentProps: () => PopoverContentAttributes;
  readonly getTitleProps: () => PopoverLabelAttributes<'title'>;
  readonly getDescriptionProps: () => PopoverLabelAttributes<'description'>;
  readonly getCloseTriggerProps: () => PopoverCloseTriggerAttributes;
}

/**
 * A stable ref callback that tells `setId` the id of the element it is attached to, and
 * `undefined` once it is detached: the parts point to one another only while both are mounted,
 * and follow an `id` of the owner's.
 */
function usePartId(setId: (id: string | undefined) => void): RefCallback<HTMLElement> {
  return useCallback(
    (element) => {
      if (element === null) {
        return undefined;
      }
      setId(element.id === '' ? undefined : element.id);
      return () => {
        setId(undefined);
      };
    },
    [setId],
  );
}

/**
 * Run the popover machine of `@contour-ui/core` in a component, on the DOM platform: its API
 * (`open`, `modal`, `portalled`, `placement`, `setOpen()`, `toggle()`) and the props of each
 * element. `Popover.Root` calls it, and adds the presence that mounts the positioner and the
 * content and waits for their exit animation; call it yourself to build the parts from your own
 * elements.
 *
 * While open, the platform places the content next to the trigger (or the anchor), closes it on
 * Escape and on an interaction outside, keeps it in the Tab order after the trigger, and, when
 * `modal`, traps focus, locks the scroll and makes the rest of the page inert. Focus moves into
 * the content as it opens and back as it closes.
 *
 * @example
 * const api = usePopover({ positioning: { placement: 'top' } });
 * <>
 *   <button {...api.getTriggerProps()}>Share</button>
 *   <Portal>
 *     <div {...api.getPositionerProps()} hidden={!api.open}>
 *       <div {...api.getContentProps()}>
 *         <p {...api.getTitleProps()}>Share this page</p>
 *       </div>
 *     </div>
 *   </Portal>
 * </>;
 */
export function usePopover(props: UsePopoverProps = {}): UsePopoverReturn {
  const { initialFocusEl, finalFocusEl, ...input } = props;
  // The options of the DOM go to the platform after each commit, before it runs.
  const [dom] = useState(() => createDomPlatform({ initialFocusEl, finalFocusEl }));
  useInsertionEffect(() => {
    dom.setOptions({ initialFocusEl, finalFocusEl });
  });
  const service = useMachine(popover.machine, input, dom.platform);
  const api = popover.connect(service);
  const { open, modal, placement } = api;

  const baseId = useId();
  // The ids of the mounted parts, which may be the generated ones or the owner's.
  const [contentId, setContentId] = useState<string | undefined>(undefined);
  const [titleId, setTitleId] = useState<string | undefined>(undefined);
  const [descriptionId, setDescriptionId] = useState<string | undefined>(undefined);
  const contentIdRef = usePartId(setContentId);
  const titleRef = usePartId(setTitleId);
  const descriptionRef = usePartId(setDescriptionId);
  const contentRef = useMemo(
    () => composeRefs(dom.refs.content, contentIdRef),
    [dom, contentIdRef],
  );

  const state: PopoverDataState = open ? 'open' : 'closed';
  const positioning = service.prop('positioning');

  return {
    ...api,
    getTriggerProps: () => ({
      'data-scope': 'popover',
      'data-part': 'trigger',
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      'aria-controls': contentId,
      'data-state': state,
      onClick: (event) => {
        // The owner's handler runs first: `event.preventDefault()` there keeps the state.
        if (!event.defaultPrevented) {
          api.toggle();
        }
      },
      ref: dom.refs.trigger,
    }),
    getAnchorProps: () => ({
      'data-scope': 'popover',
      'data-part': 'anchor',
      ref: dom.refs.anchor,
    }),
    getPositionerProps: () => ({
      'data-scope': 'popover',
      'data-part': 'positioner',
      'data-state': state,
      style: getPositionerStyle(positioning),
      ref: dom.refs.positioner,
    }),
    getContentProps: () => ({
      'data-scope': 'popover',
      'data-part': 'content',
      id: `${baseId}content`,
      role: 'dialog',
      tabIndex: -1,
      'aria-modal': modal ? true : undefined,
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
      'data-state': state,
      'data-placement': placement,
      ref: contentRef,
    }),
    getTitleProps: () => ({
      'data-scope': 'popover',
      'data-part': 'title',
      id: `${baseId}title`,
      ref: titleRef,
    }),
    getDescriptionProps: () => ({
      'data-scope': 'popover',
      'data-part': 'description',
      id: `${baseId}description`,
      ref: descriptionRef,
    }),
    getCloseTriggerProps: () => ({
      'data-scope': 'popover',
      'data-part': 'close-trigger',
      type: 'button',
      onClick: (event) => {
        if (!event.defaultPrevented) {
          api.setOpen(false);
        }
      },
    }),
  };
}
