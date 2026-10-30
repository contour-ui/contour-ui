import { vars } from '@contour-ui/tokens';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';

import { CodeBlock } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';
import {
  PANEL,
  RADIUS_CHANGE,
  RENDER_ROOT,
  SAVE_BUTTON,
  ShikiPre,
  STYLESHEETS,
  THEME_ATTRIBUTE,
  THEME_SWITCH,
  TRANSITION,
} from './shiki-markup.tsx';

/**
 * Stands in for `navigator.clipboard.writeText`: the states never touch the real clipboard, whose
 * permissions a test browser does not grant.
 */
const writeText = (_text: string): Promise<void> => Promise.resolve();

/** How long a copied state shows its check mark: past the screenshot, however slow the run. */
const COPIED_FOR = 60_000;

beforeEach(() => {
  // An own property hides the browser's getter on `Navigator.prototype` until the cleanup.
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return () => {
    Reflect.deleteProperty(navigator, 'clipboard');
  };
});

/**
 * Copies as the story's play did, from the keyboard: its click focused the copy button with a
 * ring. Resolves once the button shows the copy.
 */
async function copy(): Promise<void> {
  await userEvent.tab();
  await userEvent.keyboard('{Enter}');
  await vi.waitFor(() => {
    const trigger = document.activeElement;
    if (!(trigger instanceof HTMLElement) || trigger.dataset['copied'] === undefined) {
      throw new Error('The copy button shows no copy yet.');
    }
  });
}

/** The scrolling area of the code, which has no role without a name. */
function content(): Locator {
  const area = document.querySelector('.contour-code-block__content');
  if (area === null) {
    throw new Error('The state renders no content.');
  }
  return page.elementLocator(area);
}

interface ExampleProps {
  /** Shown in the header; without it the block has no header. */
  readonly title?: string | undefined;
  readonly children: ReactNode;
}

/** A code block as the docs render a fenced block: a header when it has a title. */
function Example({ title, children }: ExampleProps): ReactElement {
  return (
    <CodeBlock.Root>
      {title === undefined ? null : (
        <CodeBlock.Header>
          <CodeBlock.Title>{title}</CodeBlock.Title>
        </CodeBlock.Header>
      )}
      <CodeBlock.Content>{children}</CodeBlock.Content>
    </CodeBlock.Root>
  );
}

/** Story layout: two columns, as wide as a docs page column each. */
function Columns({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        alignItems: 'start',
        gap: vars.space['section-gap'],
      }}
    >
      {children}
    </div>
  );
}

visualStates({
  // With and without a title: the header is the `figcaption` of the figure.
  basic: {
    render: () => (
      <Columns>
        <Example title="save-button.tsx">
          <ShikiPre lines={SAVE_BUTTON} />
        </Example>
        <Example>
          <ShikiPre lines={PANEL} />
        </Example>
      </Columns>
    ),
  },
  // `// [!code highlight]`: the line is tinted and marked with a bar at its start.
  'highlighted-lines': {
    render: () => (
      <Columns>
        <Example title="main.tsx">
          <ShikiPre lines={STYLESHEETS} lineClasses={{ 2: 'highlighted' }} />
        </Example>
      </Columns>
    ),
  },
  // `// [!code --]` and `// [!code ++]`: removed and added lines, tinted and signed.
  diff: {
    render: () => (
      <Columns>
        <Example title="button.css">
          <ShikiPre lines={RADIUS_CHANGE} lineClasses={{ 1: 'diff remove', 2: 'diff add' }} />
        </Example>
      </Columns>
    ),
  },
  // `// [!code focus]`: the other lines lose their colors.
  focus: {
    render: () => (
      <Columns>
        <Example>
          <ShikiPre lines={RENDER_ROOT} lineClasses={{ 2: 'focused' }} />
        </Example>
      </Columns>
    ),
  },
  // `// [!code word:themeAttribute]`: the word, wherever it occurs.
  'highlighted-words': {
    render: () => (
      <Columns>
        <Example>
          <ShikiPre lines={THEME_ATTRIBUTE} />
        </Example>
      </Columns>
    ),
  },
  // `lineNumbers`: the second block starts at 98, so three-digit numbers show next to a diff.
  'line-numbers': {
    render: () => (
      <Columns>
        <Example title="theme-switch.tsx">
          <ShikiPre lines={THEME_SWITCH} data-line-numbers lineClasses={{ 4: 'highlighted' }} />
        </Example>
        <Example title="button.css">
          <ShikiPre
            lines={RADIUS_CHANGE}
            data-line-numbers
            style={{ counterReset: 'contour-code-block-line 97' }}
            lineClasses={{ 1: 'diff remove', 2: 'diff add' }}
          />
        </Example>
      </Columns>
    ),
  },
  // A line longer than the block scrolls inside the content, focused with Tab as in the story:
  // the focus ring shows.
  'long-line': {
    render: () => (
      <div style={{ maxInlineSize: '24rem' }}>
        <Example title="transition.ts">
          <ShikiPre lines={TRANSITION} />
        </Example>
      </div>
    ),
    ready: () => userEvent.tab(),
    focused: content,
  },
  // A copy button in the header, after the title, once it has copied: a check mark, and a status
  // that announces the copy, which axe checks too.
  'copy-with-title': {
    render: () => (
      <Columns>
        <CodeBlock.Root>
          <CodeBlock.Header>
            <CodeBlock.Title>save-button.tsx</CodeBlock.Title>
            <CodeBlock.CopyTrigger timeout={COPIED_FOR} />
          </CodeBlock.Header>
          <CodeBlock.Content>
            <ShikiPre lines={SAVE_BUTTON} />
          </CodeBlock.Content>
        </CodeBlock.Root>
      </Columns>
    ),
    ready: copy,
    focused: () => page.getByRole('button', { name: 'Copy code' }),
  },
  // Without a title, no header: the copy button sits at the top end, above the code; copied.
  'copy-without-title': {
    render: () => (
      <div style={{ maxInlineSize: '24rem' }}>
        <CodeBlock.Root>
          <CodeBlock.CopyTrigger timeout={COPIED_FOR} />
          <CodeBlock.Content>
            <ShikiPre lines={[...TRANSITION, ...STYLESHEETS]} />
          </CodeBlock.Content>
        </CodeBlock.Root>
      </div>
    ),
    ready: copy,
    focused: () => page.getByRole('button', { name: 'Copy code' }),
  },
});
