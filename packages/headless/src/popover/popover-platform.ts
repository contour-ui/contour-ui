import type { popover, Platform } from '@contour-ui/core';
import type { RefCallback } from 'react';

import { schedule } from '../platform/clock.ts';
import { hideOutside } from '../platform/hide-outside.ts';
import { trackLayer } from '../platform/layer-stack.ts';
import { trackPosition } from '../platform/position.ts';
import { lockScroll } from '../platform/scroll-lock.ts';
import { whenRendered } from '../platform/when-rendered.ts';
import { createPopoverFocus, keepTabOrder } from './popover-focus.ts';
import type { FocusTarget } from './popover-focus.ts';

/** What the DOM platform reads besides the props of the machine: the options of the DOM. */
export interface PopoverDomOptions {
  readonly initialFocusEl: FocusTarget | undefined;
  readonly finalFocusEl: FocusTarget | undefined;
}

/** The parts whose elements the platform works on. */
export type PopoverElement = 'trigger' | 'anchor' | 'positioner' | 'content';

/** The DOM platform of one popover, with the options and the elements it reads. */
export interface PopoverDomPlatform {
  readonly platform: Platform<popover.Schema>;
  /** Give the platform the options of the latest commit. */
  readonly setOptions: (options: PopoverDomOptions) => void;
  /** The ref callbacks that give the platform the element of each part. */
  readonly refs: Readonly<Record<PopoverElement, RefCallback<HTMLElement>>>;
}

/**
 * The DOM platform of one popover: the `setTimeout` clock, and the effects and focus moves of the
 * open popover, on the overlay modules of `platform/`. The elements of the parts come from their
 * ref callbacks, and the options of the DOM (`initialFocusEl`, `finalFocusEl`) from the hook
 * after each commit; both are read when the platform runs. Created once per hook, since
 * `useMachine` reads the platform once.
 *
 * - `position`: tracks the positioner next to the anchor, or the trigger, once it is rendered,
 *   and writes the placement it finds to the machine's context.
 * - `dismiss`: a layer on the content, the trigger excluded, with `--layer-index` on the
 *   positioner. Escape sends `ESCAPE` (and is marked as used when `closeOnEscape` is set), a
 *   press or focus outside sends `INTERACT_OUTSIDE`, a layer around it that closes sends `CLOSE`.
 * - `trapFocus` starts in every open popover: it moves focus in if the popover has just opened,
 *   and traps it when `modal` (see `createPopoverFocus`). `setInitialFocus` only remembers where
 *   focus was and leaves the move to it, so the move stops with the effects: on close, and when
 *   the service stops before the content is rendered. `restoreFocus` sends focus back.
 * - `preventScroll` and `hideOutside` (the trigger stays reachable) when `modal`;
 *   `keepTabOrder` when `portalled` and not `modal`.
 *
 * @example
 * const [dom] = useState(() => createDomPlatform({ initialFocusEl, finalFocusEl }));
 * const service = useMachine(popover.machine, input, dom.platform);
 */
export function createDomPlatform(initial: PopoverDomOptions): PopoverDomPlatform {
  let options = initial;
  const elements: Record<PopoverElement, HTMLElement | null> = {
    trigger: null,
    anchor: null,
    positioner: null,
    content: null,
  };
  const getTrigger = (): HTMLElement | null => elements.trigger;
  const getPositioner = (): HTMLElement | null => elements.positioner;
  const getContent = (): HTMLElement | null => elements.content;
  const focus = createPopoverFocus({ trigger: getTrigger, content: getContent });

  const platform: Platform<popover.Schema> = {
    schedule,
    actions: {
      setInitialFocus: ({ prop }) => {
        focus.open(prop('autoFocus'));
      },
      restoreFocus: ({ prop }) => {
        focus.close(prop('restoreFocus'), () => options.finalFocusEl?.());
      },
    },
    effects: {
      position: ({ prop, context }) =>
        whenRendered(getPositioner, 'layer', (positioner) => {
          const reference = elements.anchor ?? elements.trigger;
          if (reference === null) {
            return () => undefined;
          }
          return trackPosition(reference, positioner, {
            ...prop('positioning'),
            onPlacementChange: (placement) => {
              context.set('placement', placement);
            },
          });
        }),
      dismiss: ({ prop, send }) =>
        trackLayer(getContent, {
          exclude: () => [elements.trigger],
          styleTargets: () => [elements.positioner],
          onEscapeKeyDown: (event) => {
            // The key is used: listeners further up leave it alone.
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
      trapFocus: ({ prop }) => focus.start(() => options.initialFocusEl?.(), prop('modal')),
      preventScroll: ({ prop }) =>
        prop('modal')
          ? lockScroll((elements.trigger ?? elements.content)?.ownerDocument)
          : undefined,
      hideOutside: ({ prop }) =>
        prop('modal') ? hideOutside(getContent, { exclude: () => [elements.trigger] }) : undefined,
      keepTabOrder: ({ prop }) =>
        prop('portalled') && !prop('modal') ? keepTabOrder(getTrigger, getContent) : undefined,
    },
  };

  const register =
    (part: PopoverElement): RefCallback<HTMLElement> =>
    (element) => {
      elements[part] = element;
    };

  return {
    platform,
    setOptions: (next) => {
      options = next;
    },
    refs: {
      trigger: register('trigger'),
      anchor: register('anchor'),
      positioner: register('positioner'),
      content: register('content'),
    },
  };
}
