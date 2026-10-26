import { dialog } from '@contour-ui/core';
import type { Platform } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useId, useInsertionEffect, useState } from 'react';
import type { MouseEvent, RefCallback } from 'react';

import { schedule } from '../platform/clock.ts';
import { getActiveElement } from '../platform/dom.ts';
import { moveFocusIn, returnFocus, trapFocus } from '../platform/focus-trap.ts';
import { hideOutside } from '../platform/hide-outside.ts';
import { trackLayer } from '../platform/layer-stack.ts';
import { lockScroll } from '../platform/scroll-lock.ts';
import { isFocusable } from '../platform/tabbable.ts';

/**
 * Props of {@link useDialog}: the input of the dialog machine of `@contour-ui/core`, and the
 * options of the DOM.
 */
export interface UseDialogProps extends dialog.Input {
  /**
   * The element to focus when the dialog opens. Without it, or when it gives nothing that takes
   * focus: an element inside the content that already has focus keeps it (one with
   * `autoFocus`); otherwise focus goes to the first close trigger of an `alertdialog`, the first
   * element of the content that Tab reaches, or the content itself.
   */
  readonly initialFocusEl?: (() => HTMLElement | null | undefined) | undefined;
  /**
   * The element to focus when the dialog closes, with `restoreFocus`. Without it, or when it
   * gives nothing that takes focus: the element that had focus when the dialog opened, or the
   * trigger.
   */
  readonly finalFocusEl?: (() => HTMLElement | null | undefined) | undefined;
}

/** What every part of a dialog carries. */
export interface DialogPartAttributes<Part extends string> {
  readonly 'data-scope': 'dialog';
  readonly 'data-part': Part;
}

/** The state of the dialog, as the parts that show it carry it. */
export type DialogDataState = 'open' | 'closed';

/** Props of the trigger: a button that opens the dialog, and closes it if it is open. */
export interface DialogTriggerAttributes extends DialogPartAttributes<'trigger'> {
  readonly type: 'button';
  readonly 'aria-haspopup': 'dialog';
  readonly 'aria-expanded': boolean;
  /** The id of the content, while it is mounted. */
  readonly 'aria-controls': string | undefined;
  readonly 'data-state': DialogDataState;
  readonly onClick: (event: MouseEvent) => void;
  /** Tells the dialog its trigger: an interaction with it is not outside the dialog. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the backdrop and of the positioner. */
export interface DialogLayerAttributes<Part extends string> extends DialogPartAttributes<Part> {
  readonly 'data-state': DialogDataState;
  /** Tells the dialog the element, which gets `--layer-index` while the dialog is open. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the content: the element with the `dialog` (or `alertdialog`) role. */
export interface DialogContentAttributes extends DialogPartAttributes<'content'> {
  /** A generated id; pass another one to the element, and the triggers follow it. */
  readonly id: string;
  readonly role: dialog.Role;
  /** Out of the tab order, but focusable: focus goes to it when nothing inside takes focus. */
  readonly tabIndex: -1;
  readonly 'aria-modal': true | undefined;
  /** The id of the title, while one is mounted. */
  readonly 'aria-labelledby': string | undefined;
  /** The id of the description, while one is mounted. */
  readonly 'aria-describedby': string | undefined;
  readonly 'data-state': DialogDataState;
  /** Tells the dialog its content: the layer, the focus trap and what stays reachable. */
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of the title and of the description: an id the content points to while mounted. */
export interface DialogLabelAttributes<Part extends string> extends DialogPartAttributes<Part> {
  /** A generated id; pass another one to the element, and the content follows it. */
  readonly id: string;
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of a close trigger: a button that closes the dialog. */
export interface DialogCloseTriggerAttributes extends DialogPartAttributes<'close-trigger'> {
  readonly type: 'button';
  readonly onClick: (event: MouseEvent) => void;
  /** Tells the dialog its close triggers: an `alertdialog` focuses the first one. */
  readonly ref: RefCallback<HTMLElement>;
}

/** What {@link useDialog} returns: the dialog API and the props of each element. */
export interface UseDialogReturn extends dialog.Api {
  readonly getTriggerProps: () => DialogTriggerAttributes;
  readonly getBackdropProps: () => DialogLayerAttributes<'backdrop'>;
  readonly getPositionerProps: () => DialogLayerAttributes<'positioner'>;
  readonly getContentProps: () => DialogContentAttributes;
  readonly getTitleProps: () => DialogLabelAttributes<'title'>;
  readonly getDescriptionProps: () => DialogLabelAttributes<'description'>;
  readonly getCloseTriggerProps: () => DialogCloseTriggerAttributes;
}

/** What the DOM platform reads besides the props of the machine: the options of the DOM. */
interface DialogDomOptions {
  readonly initialFocusEl: UseDialogProps['initialFocusEl'];
  readonly finalFocusEl: UseDialogProps['finalFocusEl'];
}

/** Attach an element; returns what detaches it. */
type Attach = (element: HTMLElement) => () => void;

/** The DOM platform of one dialog, and the elements its parts attach. */
interface DialogDomPlatform {
  readonly platform: Platform<dialog.Schema>;
  /** Give the platform the options of the latest commit. */
  readonly setOptions: (options: DialogDomOptions) => void;
  readonly attachTrigger: Attach;
  readonly attachBackdrop: Attach;
  readonly attachPositioner: Attach;
  readonly attachContent: Attach;
  readonly attachCloseTrigger: Attach;
}

/** The first of `elements` in document order, or `null`. */
function firstInDocument(elements: ReadonlySet<HTMLElement>): HTMLElement | null {
  let first: HTMLElement | null = null;
  for (const element of elements) {
    if (
      first === null ||
      (element.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    ) {
      first = element;
    }
  }
  return first;
}

/** An `Attach` that keeps the attached elements in `set`, such as the triggers of a dialog. */
function attachTo(set: Set<HTMLElement>): Attach {
  return (element) => {
    set.add(element);
    return () => {
      set.delete(element);
    };
  };
}

/** The first candidate that can take focus now, or `null`. */
function firstFocusable(
  candidates: ReadonlyArray<Element | null | undefined>,
): HTMLElement | SVGElement | null {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && isFocusable(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * The DOM platform of one dialog, on the overlay helpers of the platform folder:
 *
 * - `dismiss`: a layer on the stack (`trackLayer`) whose Escape, presses and focus outside send
 *   `ESCAPE` and `INTERACT_OUTSIDE`; the triggers count as inside, and the positioner and the
 *   backdrop get `--layer-index`.
 * - `trapFocus`: moves focus in once the content is rendered, if the dialog has just opened,
 *   and traps it there while `trapFocus` is set.
 * - `preventScroll`: `lockScroll` while `preventScroll` is set. `hideOutside`: everything but
 *   the content and the backdrop inert while `modal` is set.
 * - `setInitialFocus` remembers where focus was and leaves the move to the `trapFocus` effect,
 *   which starts over with the effects (as in React's Strict Mode) and stops with them, so an
 *   unmounted dialog leaves nothing waiting for its content. `restoreFocus` sends focus back
 *   (`returnFocus`) when it is still inside the content or nowhere.
 *
 * The elements come from the parts, through the `attach*` functions their refs call; the DOM
 * options from the hook, after each commit. Created once per hook, since `useMachine` reads the
 * platform once.
 */
function createDomPlatform(initial: DialogDomOptions): DialogDomPlatform {
  let options = initial;
  let content: HTMLElement | null = null;
  let positioner: HTMLElement | null = null;
  let backdrop: HTMLElement | null = null;
  const triggers = new Set<HTMLElement>();
  const closeTriggers = new Set<HTMLElement>();
  /** Set when the dialog opens, until it closes: the open dialog still moves focus in. */
  let focusPending = false;
  /** The element that had focus when the dialog opened. */
  let focusedBefore: Element | null = null;

  const getContent = (): HTMLElement | null => content;
  const ownerDocument = (): Document =>
    content?.ownerDocument ?? firstInDocument(triggers)?.ownerDocument ?? document;

  const platform: Platform<dialog.Schema> = {
    schedule,
    actions: {
      setInitialFocus: () => {
        focusedBefore = getActiveElement(ownerDocument());
        focusPending = true;
      },
      restoreFocus: ({ prop }) => {
        const before = focusedBefore;
        focusPending = false;
        focusedBefore = null;
        if (!prop('restoreFocus')) {
          return;
        }
        // The candidates are read on the frame the focus goes back in.
        returnFocus(
          () => firstFocusable([options.finalFocusEl?.(), before, firstInDocument(triggers)]),
          { from: content },
        );
      },
    },
    effects: {
      dismiss: ({ prop, send }) =>
        trackLayer(getContent, {
          exclude: () => [...triggers],
          styleTargets: () => [positioner, backdrop],
          onEscapeKeyDown: (event) => {
            // The key closes the dialog: listeners further up should leave it alone.
            if (prop('closeOnEscape')) {
              event.preventDefault();
            }
            send({ type: 'ESCAPE' });
          },
          onPointerDownOutside: () => {
            send({ type: 'INTERACT_OUTSIDE' });
          },
          onFocusOutside: () => {
            send({ type: 'INTERACT_OUTSIDE' });
          },
          onParentClose: () => {
            send({ type: 'CLOSE' });
          },
        }),
      trapFocus: ({ prop }) => {
        const stops: Array<() => void> = [];
        if (focusPending) {
          const alert = prop('role') === 'alertdialog';
          stops.push(
            moveFocusIn(getContent, {
              initialFocus: () =>
                options.initialFocusEl?.() ?? (alert ? firstInDocument(closeTriggers) : null),
            }),
          );
        }
        if (prop('trapFocus')) {
          // Focus moves in above and goes back with `restoreFocus`: the trap only keeps it in.
          stops.push(trapFocus(getContent, { autoFocus: false, restoreFocus: false }));
        }
        return () => {
          for (const stop of stops.toReversed()) {
            stop();
          }
        };
      },
      preventScroll: ({ prop }) =>
        prop('preventScroll') ? lockScroll(ownerDocument()) : undefined,
      // The backdrop stays reachable, so a press on it lands on it: it holds nothing to reach.
      hideOutside: ({ prop }) =>
        prop('modal') ? hideOutside(getContent, { exclude: () => [backdrop] }) : undefined,
    },
  };

  return {
    platform,
    setOptions: (next) => {
      options = next;
    },
    attachTrigger: attachTo(triggers),
    attachCloseTrigger: attachTo(closeTriggers),
    attachBackdrop: (element) => {
      backdrop = element;
      return () => {
        if (backdrop === element) {
          backdrop = null;
        }
      };
    },
    attachPositioner: (element) => {
      positioner = element;
      return () => {
        if (positioner === element) {
          positioner = null;
        }
      };
    },
    attachContent: (element) => {
      content = element;
      return () => {
        if (content === element) {
          content = null;
        }
      };
    },
  };
}

/**
 * A stable ref callback that attaches its element, and reports the element's id to `setId`
 * while it is attached, when given.
 */
function usePartRef(
  attach: Attach | null,
  setId?: (id: string | undefined) => void,
): RefCallback<HTMLElement> {
  return useCallback<RefCallback<HTMLElement>>(
    (element) => {
      if (element === null) {
        return undefined;
      }
      const detach = attach?.(element);
      setId?.(element.id);
      return () => {
        detach?.();
        setId?.(undefined);
      };
    },
    [attach, setId],
  );
}

const dataState = (open: boolean): DialogDataState => (open ? 'open' : 'closed');

/**
 * Run the dialog machine of `@contour-ui/core` in a component, on the DOM platform: its API
 * (`open`, `modal`, `role`, `setOpen()`, `toggle()`) and the props of the trigger, the
 * backdrop, the positioner, the content, the title, the description and the close triggers.
 * While the dialog is open, Escape and interactions outside it are reported to the machine,
 * focus moves in (and stays there with `trapFocus`), the page stops scrolling
 * (`preventScroll`) and the rest of it is inert (`modal`); focus goes back when it closes.
 * `Dialog.Root` calls it; call it yourself to build the parts from your own elements, with
 * `usePresence` for the elements that show and hide.
 *
 * @example
 * const api = useDialog({ role: 'alertdialog' });
 * <>
 *   <button {...api.getTriggerProps()}>Delete</button>
 *   <div {...api.getContentProps()} hidden={!api.open}>
 *     <h2 {...api.getTitleProps()}>Delete the take?</h2>
 *     <button {...api.getCloseTriggerProps()}>Cancel</button>
 *   </div>
 * </>;
 */
export function useDialog(props: UseDialogProps = {}): UseDialogReturn {
  const { initialFocusEl, finalFocusEl, ...input } = props;
  // The options of the DOM go to the platform after each commit, before it runs: they are not
  // props of the machine.
  const [dom] = useState(() => createDomPlatform({ initialFocusEl, finalFocusEl }));
  useInsertionEffect(() => {
    dom.setOptions({ initialFocusEl, finalFocusEl });
  });
  const service = useMachine(dialog.machine, input, dom.platform);
  const api = dialog.connect(service);

  const baseId = useId();
  // The ids of the mounted parts: the generated ones, or the owner's.
  const [contentId, setContentId] = useState<string | undefined>(undefined);
  const [titleId, setTitleId] = useState<string | undefined>(undefined);
  const [descriptionId, setDescriptionId] = useState<string | undefined>(undefined);
  const triggerRef = usePartRef(dom.attachTrigger);
  const backdropRef = usePartRef(dom.attachBackdrop);
  const positionerRef = usePartRef(dom.attachPositioner);
  const contentRef = usePartRef(dom.attachContent, setContentId);
  const titleRef = usePartRef(null, setTitleId);
  const descriptionRef = usePartRef(null, setDescriptionId);
  const closeTriggerRef = usePartRef(dom.attachCloseTrigger);
  const state = dataState(api.open);

  return {
    ...api,
    getTriggerProps: () => ({
      'data-scope': 'dialog',
      'data-part': 'trigger',
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': api.open,
      'aria-controls': contentId,
      'data-state': state,
      onClick: (event) => {
        // The owner's handler runs first: `event.preventDefault()` there keeps the dialog as is.
        if (!event.defaultPrevented) {
          api.toggle();
        }
      },
      ref: triggerRef,
    }),
    getBackdropProps: () => ({
      'data-scope': 'dialog',
      'data-part': 'backdrop',
      'data-state': state,
      ref: backdropRef,
    }),
    getPositionerProps: () => ({
      'data-scope': 'dialog',
      'data-part': 'positioner',
      'data-state': state,
      ref: positionerRef,
    }),
    getContentProps: () => ({
      'data-scope': 'dialog',
      'data-part': 'content',
      id: `${baseId}content`,
      role: api.role,
      tabIndex: -1,
      'aria-modal': api.modal ? true : undefined,
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
      'data-state': state,
      ref: contentRef,
    }),
    getTitleProps: () => ({
      'data-scope': 'dialog',
      'data-part': 'title',
      id: `${baseId}title`,
      ref: titleRef,
    }),
    getDescriptionProps: () => ({
      'data-scope': 'dialog',
      'data-part': 'description',
      id: `${baseId}description`,
      ref: descriptionRef,
    }),
    getCloseTriggerProps: () => ({
      'data-scope': 'dialog',
      'data-part': 'close-trigger',
      type: 'button',
      onClick: (event) => {
        // The owner's handler runs first: `event.preventDefault()` there keeps the dialog open.
        if (!event.defaultPrevented) {
          api.setOpen(false);
        }
      },
      ref: closeTriggerRef,
    }),
  };
}
