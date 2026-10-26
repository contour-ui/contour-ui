import { clipboard } from '@contour-ui/core';
import type { Platform } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import type { CSSProperties, MouseEvent } from 'react';

import { schedule } from '../platform/clock.ts';
import { visuallyHidden } from '../utils/visually-hidden.ts';

/** Props of {@link useClipboard}: the input of the clipboard machine of `@contour-ui/core`. */
export type UseClipboardProps = clipboard.Input;

/** What every part of a clipboard carries. */
export interface ClipboardPartAttributes<Part extends string> {
  readonly 'data-scope': 'clipboard';
  readonly 'data-part': Part;
  /** Present, empty, while the value is copied. */
  readonly 'data-copied': '' | undefined;
}

/** Props of the trigger: a button that copies the value on click. */
export interface ClipboardTriggerAttributes extends ClipboardPartAttributes<'trigger'> {
  readonly type: 'button';
  readonly 'aria-label': string;
  readonly onClick: (event: MouseEvent) => void;
}

/**
 * Props of the status element: a visually hidden live region. Render it empty, and put the
 * message in it while copied, so that screen readers announce it.
 */
export interface ClipboardStatusAttributes {
  readonly 'data-scope': 'clipboard';
  readonly 'data-part': 'status';
  readonly role: 'status';
  readonly 'aria-live': 'polite';
  readonly style: Readonly<CSSProperties>;
}

/** What {@link useClipboard} returns: the clipboard API and the props of each element. */
export interface UseClipboardReturn extends clipboard.Api {
  readonly getRootProps: () => ClipboardPartAttributes<'root'>;
  readonly getTriggerProps: () => ClipboardTriggerAttributes;
  readonly getIndicatorProps: () => ClipboardPartAttributes<'indicator'>;
  readonly getStatusProps: () => ClipboardStatusAttributes;
}

/**
 * The DOM platform of the clipboard machine: the `setTimeout` clock, and `writeText` through the
 * asynchronous Clipboard API, answered with `COPY.DONE` or `COPY.FAILED`. A module-level
 * constant, since `useMachine` reads it once.
 */
const platform: Platform<clipboard.Schema> = {
  schedule,
  actions: {
    writeText: ({ context, send }) => {
      const written = (): void => {
        send({ type: 'COPY.DONE' });
      };
      const failed = (): void => {
        send({ type: 'COPY.FAILED' });
      };
      // Browsers leave it out of insecure contexts (pages served over plain http), whatever
      // the DOM types say.
      const api: Clipboard | undefined = navigator.clipboard;
      if (api === undefined) {
        failed();
        return;
      }
      // Both handlers in `then`, not a `catch` after it: an error thrown while the machine
      // handles `COPY.DONE` (in a callback of the owner) is not a failed write.
      api.writeText(context.get('value')).then(written, failed);
    },
  },
  effects: {},
};

/**
 * Run the clipboard machine of `@contour-ui/core` in a component, on the DOM platform: its API
 * (`copied`, `value`, `copy()`, `setValue()`) and the props of the root, the trigger, the
 * indicator and the status element. `Clipboard.Root` calls it; call it yourself to build the
 * parts from your own elements.
 *
 * @example
 * const api = useClipboard({ value: 'pnpm add @contour-ui/headless' });
 * <div {...api.getRootProps()}>
 *   <button {...api.getTriggerProps()}>{api.copied ? 'Copied' : 'Copy'}</button>
 *   <span {...api.getStatusProps()}>{api.copied ? 'Copied to clipboard' : null}</span>
 * </div>;
 */
export function useClipboard(props: UseClipboardProps = {}): UseClipboardReturn {
  const service = useMachine(clipboard.machine, props, platform);
  const api = clipboard.connect(service);
  const copied = api.copied ? '' : undefined;
  return {
    ...api,
    getRootProps: () => ({ 'data-scope': 'clipboard', 'data-part': 'root', 'data-copied': copied }),
    getTriggerProps: () => ({
      'data-scope': 'clipboard',
      'data-part': 'trigger',
      'data-copied': copied,
      type: 'button',
      'aria-label': 'Copy to clipboard',
      onClick: (event) => {
        // The owner's handler runs first: `event.preventDefault()` there cancels the copy.
        if (!event.defaultPrevented) {
          api.copy();
        }
      },
    }),
    getIndicatorProps: () => ({
      'data-scope': 'clipboard',
      'data-part': 'indicator',
      'data-copied': copied,
    }),
    getStatusProps: () => ({
      'data-scope': 'clipboard',
      'data-part': 'status',
      role: 'status',
      'aria-live': 'polite',
      style: visuallyHidden,
    }),
  };
}
