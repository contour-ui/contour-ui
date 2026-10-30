import type { Tabs as StyledTabs } from '@contour-ui/react';
import type { ComponentProps, ReactElement } from 'react';

import { cx } from '../../utils/cx.ts';
import { DocsTabsContent, DocsTabsList, DocsTabsRoot, DocsTabsTrigger } from './tabs-parts.tsx';
import type { DocsTabsOptions } from './use-docs-tabs.ts';

export interface CodeBlockTabsProps
  extends DocsTabsOptions, Omit<ComponentProps<'div'>, 'defaultValue'> {
  /** The value of the tab selected at first. Without it, none is until the reader picks one. */
  readonly defaultValue?: string | undefined;
}

/**
 * Code blocks as the tabs of one block, with the props of Fumadocs' `CodeBlockTabs`, which its
 * `remarkCodeTab` and `remarkNpm` make: consecutive code blocks with a `tab` meta, and the
 * commands of an `npm` or `package-install` block for each package manager. One frame
 * (`code-block-tabs.css`): the triggers where a code block has its header, and the code of the
 * selected tab below, with its copy button at the end of the row of triggers.
 *
 * `groupId`, `persist` and `updateAnchor` work as in `Tabs`; Fumadocs' `tab-group` meta and the
 * `persist` option of `remarkNpm` set the first two.
 *
 * @example
 * <CodeBlockTabs defaultValue="npm">
 *   <CodeBlockTabsList>
 *     <CodeBlockTabsTrigger value="npm">npm</CodeBlockTabsTrigger>
 *     <CodeBlockTabsTrigger value="pnpm">pnpm</CodeBlockTabsTrigger>
 *   </CodeBlockTabsList>
 *   <CodeBlockTab value="npm">{npmCodeBlock}</CodeBlockTab>
 *   <CodeBlockTab value="pnpm">{pnpmCodeBlock}</CodeBlockTab>
 * </CodeBlockTabs>
 */
export function CodeBlockTabs({
  defaultValue,
  className,
  ...props
}: CodeBlockTabsProps): ReactElement {
  return (
    <DocsTabsRoot
      {...props}
      className={cx('contour-docs-code-tabs', className)}
      defaultValue={defaultValue ?? null}
    />
  );
}

export type CodeBlockTabsListProps = StyledTabs.ListProps;

/** The row of triggers of `CodeBlockTabs`, at the top of the block. */
export function CodeBlockTabsList({ className, ...props }: CodeBlockTabsListProps): ReactElement {
  return <DocsTabsList {...props} className={cx('contour-docs-code-tabs__list', className)} />;
}

export type CodeBlockTabsTriggerProps = StyledTabs.TriggerProps;

/** A trigger of `CodeBlockTabs`: selects the code of its `value`. */
export function CodeBlockTabsTrigger({
  className,
  ...props
}: CodeBlockTabsTriggerProps): ReactElement {
  return (
    <DocsTabsTrigger {...props} className={cx('contour-docs-code-tabs__trigger', className)} />
  );
}

export type CodeBlockTabProps = StyledTabs.ContentProps;

/**
 * The code of one tab of `CodeBlockTabs`, a code block. Out of the Tab order: the code area of
 * the block, which scrolls, follows the trigger.
 */
export function CodeBlockTab({ className, ...props }: CodeBlockTabProps): ReactElement {
  return (
    <DocsTabsContent
      tabIndex={-1}
      {...props}
      className={cx('contour-docs-code-tabs__content', className)}
    />
  );
}
