import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement, ReactNode } from 'react';
import { expect, userEvent } from 'storybook/test';

import { CodeBlock } from '../index.ts';
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

/** The lines of Shiki's output in a story. */
const linesOf = (element: HTMLElement): HTMLElement[] => [
  ...element.querySelectorAll<HTMLElement>('.line'),
];

const meta: Meta<typeof CodeBlock.Root> = {
  title: 'Kit/CodeBlock',
  component: CodeBlock.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * With and without a title. The header is the `figcaption` of the figure, its first child, so it
 * names the block.
 */
export const Basic: Story = {
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
  play: async ({ canvas }) => {
    const [titled, untitled] = canvas.getAllByRole('figure');
    const caption = titled?.firstElementChild;

    await expect(caption?.tagName).toBe('FIGCAPTION');
    await expect(caption).toHaveTextContent('save-button.tsx');
    await expect(untitled?.querySelector('figcaption')).toBeNull();
  },
};

/** `// [!code highlight]`: the line is tinted and marked with a bar at its start. */
export const HighlightedLines: Story = {
  render: () => (
    <Columns>
      <Example title="main.tsx">
        <ShikiPre lines={STYLESHEETS} lineClasses={{ 2: 'highlighted' }} />
      </Example>
    </Columns>
  ),
  play: async ({ canvasElement }) => {
    const highlighted = linesOf(canvasElement).map((line) =>
      line.classList.contains('highlighted'),
    );
    await expect(highlighted).toEqual([false, false, true, false]);
  },
};

/** `// [!code --]` and `// [!code ++]`: removed and added lines, tinted and signed. */
export const Diff: Story = {
  render: () => (
    <Columns>
      <Example title="button.css">
        <ShikiPre lines={RADIUS_CHANGE} lineClasses={{ 1: 'diff remove', 2: 'diff add' }} />
      </Example>
    </Columns>
  ),
  play: async ({ canvasElement }) => {
    const signs = linesOf(canvasElement).map((line) => getComputedStyle(line, '::after').content);
    await expect(signs).toEqual(['none', '"-"', '"+"', 'none']);
  },
};

/** `// [!code focus]`: the other lines lose their colors. */
export const Focus: Story = {
  render: () => (
    <Columns>
      <Example>
        <ShikiPre lines={RENDER_ROOT} lineClasses={{ 2: 'focused' }} />
      </Example>
    </Columns>
  ),
  play: async ({ canvasElement }) => {
    const [first, , focused] = linesOf(canvasElement);
    const keyword = first?.firstElementChild;
    const call = focused?.children.item(1);
    if (!(keyword instanceof HTMLElement) || !(call instanceof HTMLElement)) {
      throw new TypeError('The story renders its lines.');
    }
    await expect(getComputedStyle(keyword).color).not.toBe(getComputedStyle(call).color);
  },
};

/** `// [!code word:themeAttribute]`: the word, wherever it occurs. */
export const HighlightedWords: Story = {
  render: () => (
    <Columns>
      <Example>
        <ShikiPre lines={THEME_ATTRIBUTE} />
      </Example>
    </Columns>
  ),
  play: async ({ canvasElement }) => {
    const words = [...canvasElement.querySelectorAll('.highlighted-word')];
    await expect(words.map((word) => word.textContent)).toEqual([
      'themeAttribute',
      'themeAttribute',
    ]);
  },
};

/**
 * `lineNumbers`: the `pre` has `data-line-numbers`. The second block starts at 98 (a
 * `counter-reset` on the `pre`), so three-digit numbers show next to a diff.
 */
export const LineNumbers: Story = {
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
  play: async ({ canvasElement }) => {
    const numbered = linesOf(canvasElement).every((line) =>
      getComputedStyle(line, '::before').content.startsWith('counter(contour-code-block-line)'),
    );
    await expect(numbered).toBe(true);
  },
};

/**
 * A line longer than the block scrolls inside `CodeBlock.Content`. The area is in the tab
 * order, so the arrow keys scroll it; the play function focuses it with Tab, so the story shows
 * the focus ring.
 */
export const LongLine: Story = {
  render: () => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Example title="transition.ts">
        <ShikiPre lines={TRANSITION} />
      </Example>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const area = canvasElement.querySelector<HTMLElement>('.contour-code-block__content');
    if (area === null) {
      throw new TypeError('The story renders the content.');
    }
    await expect(area.scrollWidth).toBeGreaterThan(area.clientWidth);
    await expect(area).toHaveAttribute('tabindex', '0');

    await userEvent.tab();

    await expect(area).toHaveFocus();
  },
};
