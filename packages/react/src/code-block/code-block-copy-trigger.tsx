'use client';

import { mergeProps, useClipboard } from '@contour-ui/headless-react';
import type { UseClipboardProps } from '@contour-ui/headless-react';
import { checkIcon, copyIcon } from '@contour-ui/icons';
import { use } from 'react';
import type { MouseEvent, ReactElement } from 'react';

import { IconButton } from '../button/index.ts';
import type { IconButtonProps } from '../button/index.ts';
import { cx } from '../utils/cx.ts';
import { CodeBlockContext } from './code-block-context.ts';

export interface CodeBlockCopyTriggerProps extends Omit<
  IconButtonProps,
  'icon' | 'label' | 'value'
> {
  /**
   * The text to copy. Without it, the trigger copies the `value` of `CodeBlock.Root`, or else the
   * text of `CodeBlock.Content` as it is when clicked.
   */
  value?: string | undefined;
  /**
   * The accessible name of the button. It stays the same while the code is copied.
   *
   * @defaultValue 'Copy code'
   */
  label?: string | undefined;
  /**
   * What screen readers announce once the browser has written the code to the clipboard.
   *
   * @defaultValue 'Copied to clipboard'
   */
  copiedMessage?: string | undefined;
  /**
   * How long the check mark shows after a copy, in milliseconds.
   *
   * @defaultValue 3000
   */
  timeout?: UseClipboardProps['timeout'];
  /**
   * Called with `{ copied: true }` once the browser has written the code, and with
   * `{ copied: false }` when the check mark goes back to the copy icon.
   */
  onStatusChange?: UseClipboardProps['onStatusChange'];
}

/**
 * A small ghost icon button that copies the code, on the clipboard of
 * `@contour-ui/headless-react`. Its copy icon turns into a check mark once the browser
 * has written the code, and a visually hidden `role="status"` element next to
 * it announces the copy; the button keeps its name meanwhile.
 *
 * Put it in `CodeBlock.Header`, after the title. In a block without a title, put
 * it in `CodeBlock.Root` itself: it sits at the top end of the block, and the
 * code makes room for it, so it never covers a line.
 *
 * @example
 * <CodeBlock.Root>
 *   <CodeBlock.CopyTrigger />
 *   <CodeBlock.Content>{highlighted}</CodeBlock.Content>
 * </CodeBlock.Root>
 */
export function CodeBlockCopyTrigger({
  value,
  label = 'Copy code',
  copiedMessage = 'Copied to clipboard',
  timeout,
  onStatusChange,
  className,
  ...props
}: CodeBlockCopyTriggerProps): ReactElement {
  const context = use(CodeBlockContext);
  const api = useClipboard({ timeout, onStatusChange });
  const ownProps = {
    variant: 'ghost',
    size: 'sm',
    label,
    icon: api.copied ? checkIcon : copyIcon,
    className: cx('contour-code-block__copy-trigger', className),
    'data-scope': 'code-block',
    'data-part': 'copy-trigger',
    // `mergeProps` skips `undefined`.
    'data-copied': api.copied ? '' : undefined,
    onClick: (event: MouseEvent) => {
      // The owner's handler runs first: `event.preventDefault()` there cancels the copy.
      if (event.defaultPrevented) {
        return;
      }
      // Read when clicked, so the copy is the code as it is shown now.
      api.setValue(value ?? context?.value ?? context?.contentRef.current?.textContent ?? '');
      api.copy();
    },
  } as const;
  const statusProps = mergeProps(api.getStatusProps(), {
    'data-scope': 'code-block',
    'data-part': 'copy-status',
  });

  return (
    <>
      <IconButton {...mergeProps(ownProps, props)} />
      <span {...statusProps}>{api.copied ? copiedMessage : null}</span>
    </>
  );
}
