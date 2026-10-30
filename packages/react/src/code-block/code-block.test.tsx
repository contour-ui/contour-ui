import type { IconData } from '@contour-ui/icons';
import { checkIcon, copyIcon } from '@contour-ui/icons';
import { themes, vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { CodeBlock } from '../index.ts';
import {
  RADIUS_CHANGE,
  RENDER_ROOT,
  SAVE_BUTTON,
  ShikiPre,
  sourceOf,
  STYLESHEETS,
  THEME_ATTRIBUTE,
  TRANSITION,
} from './shiki-markup.tsx';
import type { ShikiColor, ShikiLine } from './shiki-markup.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` inside `parent` (resolves `var(--ct-…)`). */
function computed(property: string, value: string, parent: Element = document.body): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  parent.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** A length in pixels, e.g. `8px`, computed inside `parent` (so `ch` uses its font). */
const px = (value: string, parent?: Element): string => computed('padding-top', value, parent);

/** A color token as the browser computes it inside `parent`. */
const color = (value: string, parent?: Element): string => computed('color', value, parent);

/** A background color token as the browser computes it. */
const background = (value: string): string => computed('background-color', value);

/** Computed style of the element a locator finds. */
const styleOf = (locator: Locator): CSSStyleDeclaration => getComputedStyle(locator.element());

/** The element `selector` finds in `container`; the test fails without one. */
function find(container: Element, selector: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Nothing matches ${selector}.`);
  }
  return element;
}

/** The lines of Shiki's output in `container`. */
const linesOf = (container: Element): HTMLElement[] => [
  ...container.querySelectorAll<HTMLElement>('.line'),
];

/** The line at `index` in `container`; the test fails without one. */
function lineAt(container: Element, index: number): HTMLElement {
  const line = linesOf(container)[index];
  if (line === undefined) {
    throw new Error(`There is no line ${index}.`);
  }
  return line;
}

/** The token at `index` in a line. */
function tokenAt(line: Element, index: number): HTMLElement {
  const token = line.children.item(index);
  if (!(token instanceof HTMLElement)) {
    throw new TypeError(`The line has no token ${index}.`);
  }
  return token;
}

/** Computed style of an element's `::before` or `::after`. */
const pseudo = (element: Element, which: '::before' | '::after'): CSSStyleDeclaration =>
  getComputedStyle(element, which);

/** The differences between consecutive values. */
const steps = (values: readonly number[]): number[] =>
  values.slice(1).map((value, index) => value - (values[index] ?? Number.NaN));

/** The height of one line of text inside `parent`, as the browser lays it out. */
function lineHeightIn(parent: Element): number {
  const probe = document.createElement('div');
  probe.style.blockSize = '1lh';
  parent.append(probe);
  const { height } = probe.getBoundingClientRect();
  probe.remove();
  return height;
}

interface BlockProps {
  readonly title?: string | undefined;
  /** Adds a copy trigger: in the header, or in the root of a block without a title. */
  readonly copy?: boolean | undefined;
  /** The `value` of the root. */
  readonly value?: string | undefined;
  readonly children: ReactNode;
}

/** A code block as the docs render one: a header when it has a title. */
function Block({ title, copy = false, value, children }: BlockProps): ReactElement {
  const trigger = copy ? <CodeBlock.CopyTrigger /> : null;
  return (
    <CodeBlock.Root value={value}>
      {title === undefined ? (
        trigger
      ) : (
        <CodeBlock.Header>
          <CodeBlock.Title>{title}</CodeBlock.Title>
          {trigger}
        </CodeBlock.Header>
      )}
      <CodeBlock.Content>{children}</CodeBlock.Content>
    </CodeBlock.Root>
  );
}

type WriteText = (text: string) => Promise<void>;

/**
 * Replace `navigator.clipboard` for one test: the real one needs permissions that headless
 * Chromium does not grant. Returns the spy of its `writeText`.
 */
function stubClipboard(write: WriteText = () => Promise.resolve()) {
  const writeText = vi.fn<WriteText>(write);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return writeText;
}

/** The icon a button shows, by the path data of its `<svg>`. */
function iconOf(button: Element): string | null | undefined {
  return button.querySelector('svg path')?.getAttribute('d');
}

/** The path data an icon starts with. */
const firstPath = (icon: IconData): string | undefined => icon.paths[0]?.d;

afterEach(() => {
  // The own property hid the browser's getter on `Navigator.prototype`.
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.useRealTimers();
});

/** Every `--shiki-*` color and the token role CodeBlock gives it. */
const MAPPING: ReadonlyArray<readonly [ShikiColor, string]> = [
  ['foreground', vars.color.fg.default],
  ['constant', vars.color.syntax.constant],
  ['string', vars.color.syntax.string],
  ['comment', vars.color.syntax.comment],
  ['keyword', vars.color.syntax.keyword],
  ['parameter', vars.color.syntax.parameter],
  ['function', vars.color.syntax.function],
  ['string-expression', vars.color.syntax['string-expression']],
  ['punctuation', vars.color.syntax.punctuation],
  ['link', vars.color.syntax.link],
  ['inserted', vars.color.success.fg],
  ['deleted', vars.color.danger.fg],
  ['changed', vars.color.warning.fg],
];

/** One line with a token of every color, named after it. */
const PALETTE: ShikiLine = MAPPING.map(([shikiColor]) => [shikiColor, shikiColor]);

describe('CodeBlock', () => {
  test('renders each part as its element, with its class and part attributes', async () => {
    const screen = await render(
      <Block title="save-button.tsx">
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    const elements = screen.container.querySelectorAll<HTMLElement>('[data-scope="code-block"]');
    const parts = [...elements].map(
      (element) =>
        `${element.dataset['part']} ${element.tagName.toLowerCase()} ${element.className}`,
    );

    expect(parts).toStrictEqual([
      'root figure contour-code-block',
      'header figcaption contour-code-block__header',
      'title span contour-code-block__title',
      'content div contour-code-block__content',
    ]);
  });

  test('is a figure named by its title', async () => {
    const screen = await render(
      <>
        <Block title="save-button.tsx">
          <ShikiPre lines={SAVE_BUTTON} />
        </Block>
        <Block>
          <ShikiPre lines={STYLESHEETS} />
        </Block>
      </>,
    );

    expect(screen.getByRole('figure').elements()).toHaveLength(2);
    await expect.element(screen.getByRole('figure', { name: 'save-button.tsx' })).toBeVisible();
  });

  test('starts the figure with the header of a title, and has none without a title', async () => {
    const screen = await render(
      <>
        <Block title="save-button.tsx">
          <ShikiPre lines={SAVE_BUTTON} />
        </Block>
        <Block>
          <ShikiPre lines={STYLESHEETS} />
        </Block>
      </>,
    );
    const [titled, untitled] = screen.getByRole('figure').elements();
    const caption = titled?.firstElementChild;

    expect(caption?.tagName).toBe('FIGCAPTION');
    expect(caption).toHaveTextContent('save-button.tsx');
    expect(untitled?.querySelector('figcaption')).toBeNull();
  });

  test('merges class names and passes other props and the refs through', async () => {
    const root = createRef<HTMLElement>();
    const header = createRef<HTMLElement>();
    const title = createRef<HTMLSpanElement>();
    const content = createRef<HTMLDivElement>();
    await render(
      <CodeBlock.Root ref={root} className="mine" id="block">
        <CodeBlock.Header ref={header} className="mine">
          <CodeBlock.Title ref={title} className="mine">
            save-button.tsx
          </CodeBlock.Title>
        </CodeBlock.Header>
        <CodeBlock.Content ref={content} className="mine" data-testid="content">
          <ShikiPre lines={SAVE_BUTTON} />
        </CodeBlock.Content>
      </CodeBlock.Root>,
    );

    expect(root.current).toHaveClass('contour-code-block mine', { exact: true });
    expect(root.current).toHaveAttribute('id', 'block');
    expect(header.current).toHaveClass('contour-code-block__header mine', { exact: true });
    expect(title.current).toHaveClass('contour-code-block__title mine', { exact: true });
    expect(content.current).toHaveClass('contour-code-block__content mine', { exact: true });
    expect(content.current).toHaveAttribute('data-testid', 'content');
  });

  test.each(themes)('colors Shiki tokens with the token roles in the %s theme', async (theme) => {
    const other = themes.find((name) => name !== theme);
    const screen = await render(
      <>
        <div data-theme={theme}>
          <Block>
            <ShikiPre lines={[PALETTE]} />
          </Block>
        </div>
        <div data-theme={other} />
      </>,
    );
    const themed = find(screen.container, `[data-theme="${theme}"]`);

    // The roles resolve to real colors (tokens.css is loaded), and the theme changes them.
    expect(color(vars.color.syntax.keyword, themed)).toMatch(/^oklch\(/u);
    expect(color(vars.color.syntax.keyword, themed)).not.toBe(
      color(vars.color.syntax.keyword, find(screen.container, `[data-theme="${other}"]`)),
    );
    for (const [shikiColor, role] of MAPPING) {
      const token = screen.getByText(shikiColor, { exact: true });
      expect.soft(styleOf(token).color, shikiColor).toBe(color(role, themed));
    }
    expect(getComputedStyle(find(themed, 'pre')).backgroundColor).toBe(
      computed('background-color', vars.color.bg.inset, themed),
    );
  });

  test('is styled with semantic tokens', async () => {
    const screen = await render(
      <Block title="save-button.tsx">
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    const root = styleOf(screen.getByRole('figure'));
    const header = getComputedStyle(find(screen.container, '.contour-code-block__header'));
    const title = styleOf(screen.getByText('save-button.tsx'));
    const area = find(screen.container, '.contour-code-block__content');
    const content = getComputedStyle(area);
    const pre = getComputedStyle(find(screen.container, 'pre'));

    expect(root.backgroundColor).toBe(background(vars.color.bg.inset));
    expect(root.borderTopColor).toBe(color(vars.color.border.default));
    expect(root.borderTopWidth).toBe(px(vars['border-width'].default));
    expect(root.borderTopLeftRadius).toBe(px(vars.radius.panel));

    expect(header.borderBottomColor).toBe(color(vars.color.border.default));
    expect(header.borderBottomStyle).toBe('solid');
    expect(header.paddingLeft).toBe(px(vars.space['panel-inset']));
    expect(header.marginTop).toBe('0px');

    expect(title.color).toBe(color(vars.color.fg.muted));
    expect(title.fontSize).toBe(computed('font-size', vars.text.label.fontSize));
    expect(title.fontWeight).toBe(computed('font-weight', vars.text.label.fontWeight));

    expect(content.fontFamily).toBe(computed('font-family', vars.text.code.fontFamily));
    expect(content.fontSize).toBe(computed('font-size', vars.text.code.fontSize));
    // A unitless line height: computed inside the area, against the code's font size.
    expect(content.lineHeight).toBe(computed('line-height', vars.text.code.lineHeight, area));
    // Code reads literally: no ligature turns `!==` into one glyph.
    expect(content.fontVariantLigatures).toBe('none');
    // Under a header, the content's top corners are square.
    expect(content.borderTopLeftRadius).toBe('0px');
    expect(content.borderBottomLeftRadius).not.toBe('0px');

    expect(pre.fontFamily).toBe(content.fontFamily);
    expect(pre.fontVariantLigatures).toBe('none');
    expect(pre.marginTop).toBe('0px');
    expect(pre.paddingTop).toBe(px(vars.space['panel-inset']));
  });

  test('drops the inline margins of a figure and leaves the block margins to the container', async () => {
    const screen = await render(
      <Block>
        <ShikiPre lines={STYLESHEETS} />
      </Block>,
    );
    const root = styleOf(screen.getByRole('figure'));

    expect(root.marginLeft).toBe('0px');
    expect(root.marginRight).toBe('0px');
    // The browser's default for a figure: the code block sets no block margin, so a container can.
    expect(root.marginTop).toBe(root.fontSize);
  });

  test('hides its header with `hidden`, though the header sets its display', async () => {
    const screen = await render(
      <CodeBlock.Root>
        <CodeBlock.Header hidden>
          <CodeBlock.Title>save-button.tsx</CodeBlock.Title>
        </CodeBlock.Header>
        <CodeBlock.Content>
          <ShikiPre lines={SAVE_BUTTON} />
        </CodeBlock.Content>
      </CodeBlock.Root>,
    );

    expect(getComputedStyle(find(screen.container, 'figcaption')).display).toBe('none');
  });

  test('keeps its header styles under a container rule for figcaptions in a lower layer', async () => {
    // As the docs' Prose does: a layer declared before `contour`, styling `figure > figcaption`.
    const containerStyles = document.createElement('style');
    containerStyles.textContent = `
      @layer container, contour;
      @layer container {
        .container figure > figcaption {
          margin-block: 30px;
          color: rgb(255, 0, 0);
          font: italic 30px / 3 serif;
          letter-spacing: 5px;
        }
      }`;
    document.head.prepend(containerStyles);
    try {
      const screen = await render(
        <div className="container">
          <Block title="save-button.tsx">
            <ShikiPre lines={SAVE_BUTTON} />
          </Block>
        </div>,
      );
      const header = getComputedStyle(find(screen.container, 'figcaption'));

      expect(header.marginTop).toBe('0px');
      expect(header.marginBottom).toBe('0px');
      expect(header.color).toBe(color(vars.color.fg.muted));
      expect(header.fontSize).toBe(computed('font-size', vars.text.label.fontSize));
      expect(header.fontStyle).toBe('normal');
      expect(header.fontFamily).toBe(computed('font-family', vars.text.label.fontFamily));
      expect(header.letterSpacing).toBe(computed('letter-spacing', vars.text.label.letterSpacing));
    } finally {
      containerStyles.remove();
    }
  });

  test('keeps every line, empty ones too, one line tall', async () => {
    const screen = await render(
      <Block>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    const lines = linesOf(screen.container);
    const height = lineHeightIn(find(screen.container, 'code'));
    const tops = lines.map((line) => line.getBoundingClientRect().top);

    expect(lines).toHaveLength(SAVE_BUTTON.length);
    // The second line is empty.
    expect(lineAt(screen.container, 1).childElementCount).toBe(0);
    for (const line of lines) {
      expect(line.getBoundingClientRect().height).toBeCloseTo(height, 1);
    }
    for (const step of steps(tops)) {
      expect(step).toBeCloseTo(height, 1);
    }
  });

  test('reads and copies as the source code, empty lines included', async () => {
    const screen = await render(
      <Block>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    const content = find(screen.container, '.contour-code-block__content');

    expect(content.textContent).toBe(sourceOf(SAVE_BUTTON));
    // What a selection copies: the rendered text.
    expect(content.innerText).toBe(sourceOf(SAVE_BUTTON));
  });

  test('tints highlighted lines and words with the accent', async () => {
    const screen = await render(
      <Block>
        <ShikiPre lines={THEME_ATTRIBUTE} lineClasses={{ 0: 'highlighted' }} />
      </Block>,
    );
    const highlighted = getComputedStyle(lineAt(screen.container, 0));
    const words = [...screen.container.querySelectorAll<HTMLElement>('.highlighted-word')];

    expect(highlighted.backgroundColor).toBe(background(vars.color.accent.bg));
    expect(highlighted.boxShadow).toContain(color(vars.color.accent.fill));
    expect(getComputedStyle(lineAt(screen.container, 2)).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(words).toHaveLength(2);
    for (const word of words) {
      expect(getComputedStyle(word).backgroundColor).toBe(background(vars.color.accent.bg));
      // No padding: the columns of monospace code stay aligned.
      expect(getComputedStyle(word).paddingLeft).toBe('0px');
    }
  });

  test('tints added and removed lines and signs them before the code', async () => {
    const screen = await render(
      <Block>
        <ShikiPre lines={RADIUS_CHANGE} lineClasses={{ 1: 'diff remove', 2: 'diff add' }} />
      </Block>,
    );
    const lines = [0, 1, 2].map((index) => lineAt(screen.container, index));

    expect(lines.map((line) => pseudo(line, '::after').content)).toStrictEqual([
      'none',
      '"-"',
      '"+"',
    ]);
    expect(lines.map((line) => getComputedStyle(line).backgroundColor)).toStrictEqual([
      'rgba(0, 0, 0, 0)',
      background(vars.color.danger.bg),
      background(vars.color.success.bg),
    ]);
    expect(lines.slice(1).map((line) => pseudo(line, '::after').color)).toStrictEqual([
      color(vars.color.danger.fg),
      color(vars.color.success.fg),
    ]);
    // Every line of a diff makes room for the sign, so the code stays aligned.
    const starts = new Set(lines.map((line) => getComputedStyle(line).paddingLeft));
    expect(starts.size).toBe(1);
    expect(starts.has(px(vars.space['panel-inset']))).toBe(false);
  });

  test('gives the lines outside the focus the comment color', async () => {
    const screen = await render(
      <Block>
        <ShikiPre lines={RENDER_ROOT} lineClasses={{ 2: 'focused' }} />
      </Block>,
    );
    const keyword = tokenAt(lineAt(screen.container, 0), 0);
    const call = tokenAt(lineAt(screen.container, 2), 1);

    expect(keyword).toHaveTextContent('const');
    expect(getComputedStyle(keyword).color).toBe(color(vars.color.syntax.comment));
    expect(call).toHaveTextContent('createRoot');
    expect(getComputedStyle(call).color).toBe(color(vars.color.syntax.function));
  });

  test('numbers the lines of a pre with data-line-numbers', async () => {
    const screen = await render(
      <>
        <div data-testid="numbered">
          <Block>
            <ShikiPre lines={STYLESHEETS} data-line-numbers />
          </Block>
        </div>
        <div data-testid="plain">
          <Block>
            <ShikiPre lines={STYLESHEETS} />
          </Block>
        </div>
      </>,
    );
    const numbered = screen.getByTestId('numbered').element();
    const plain = screen.getByTestId('plain').element();

    expect(linesOf(numbered).map((line) => pseudo(line, '::before').content)).toStrictEqual(
      STYLESHEETS.map(() => 'counter(contour-code-block-line) / ""'),
    );
    expect(pseudo(lineAt(numbered, 0), '::before').color).toBe(color(vars.color.syntax.comment));
    expect(pseudo(lineAt(plain, 0), '::before').content).toBe('none');
    // The code moves over by the number column: two digits and a gap.
    expect(getComputedStyle(lineAt(numbered, 0)).paddingLeft).toBe(
      px(
        `calc(${vars.space['panel-inset']} + 2ch + ${vars.space['group-gap']})`,
        find(numbered, 'pre'),
      ),
    );
    expect(getComputedStyle(lineAt(plain, 0)).paddingLeft).toBe(px(vars.space['panel-inset']));
  });
});

describe('CodeBlock.Content', () => {
  test('is in the tab order, and a region only when it has a name', async () => {
    const screen = await render(
      <>
        <span id="content-label">Labelled code</span>
        <CodeBlock.Content />
        <CodeBlock.Content aria-label="Named code" />
        <CodeBlock.Content aria-labelledby="content-label" />
        <CodeBlock.Content aria-label="" />
      </>,
    );
    const areas = [...screen.container.querySelectorAll('.contour-code-block__content')];

    expect(areas.map((area) => area.getAttribute('tabindex'))).toStrictEqual(['0', '0', '0', '0']);
    expect(areas.map((area) => area.getAttribute('role'))).toStrictEqual([
      null,
      'region',
      'region',
      null,
    ]);
    await expect.element(screen.getByRole('region', { name: 'Named code' })).toBeInTheDocument();
    await expect.element(screen.getByRole('region', { name: 'Labelled code' })).toBeInTheDocument();
  });

  test('scrolls a long line with the arrow keys', async () => {
    const screen = await render(
      <div style={{ inlineSize: '240px' }}>
        <Block>
          <ShikiPre lines={TRANSITION} />
        </Block>
      </div>,
    );
    const area = find(screen.container, '.contour-code-block__content');

    expect(area.scrollWidth).toBeGreaterThan(area.clientWidth);
    expect(area.scrollLeft).toBe(0);

    await userEvent.tab();
    expect(document.activeElement).toBe(area);
    await userEvent.keyboard('{ArrowRight}');

    await expect.poll(() => area.scrollLeft).toBeGreaterThan(0);
  });

  test('keeps the block as wide as a grid column, scrolling instead of widening it', async () => {
    const screen = await render(
      <div style={{ display: 'grid', inlineSize: '240px' }}>
        <Block>
          <ShikiPre lines={TRANSITION} />
        </Block>
      </div>,
    );

    expect(screen.getByRole('figure').element().getBoundingClientRect().width).toBe(240);
  });

  test('spans the background of every line across the scroll width', async () => {
    const screen = await render(
      <div style={{ inlineSize: '240px' }}>
        <Block>
          <ShikiPre lines={[...TRANSITION, ...STYLESHEETS]} lineClasses={{ 1: 'highlighted' }} />
        </Block>
      </div>,
    );
    const area = find(screen.container, '.contour-code-block__content');
    const widths = linesOf(screen.container).map((line) => line.getBoundingClientRect().width);

    expect(new Set(widths).size).toBe(1);
    // `scrollWidth` is rounded to whole pixels.
    expect(widths[0]).toBeCloseTo(area.scrollWidth, 0);
  });

  test('shows the focus ring inside the area when focused from the keyboard', async () => {
    const screen = await render(
      <Block>
        <ShikiPre lines={STYLESHEETS} />
      </Block>,
    );
    const area = find(screen.container, '.contour-code-block__content');

    await userEvent.tab();
    expect(document.activeElement).toBe(area);
    const ring = getComputedStyle(area);

    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineColor).toBe(color(vars.color.border.focus));
    expect(ring.outlineWidth).toBe(px(vars['border-width'].focus));
    expect(ring.outlineOffset).toBe(`-${px(vars['border-width'].focus)}`);
  });
});

describe('CodeBlock.CopyTrigger', () => {
  test('is a small ghost icon button named "Copy code", next to an empty status', async () => {
    stubClipboard();
    const screen = await render(
      <Block title="save-button.tsx" copy>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy code', exact: true });
    const status = screen.getByRole('status');

    await expect
      .element(trigger)
      .toHaveClass('contour-button contour-icon-button contour-code-block__copy-trigger', {
        exact: true,
      });
    await expect.element(trigger).toHaveAttribute('type', 'button');
    await expect.element(trigger).toHaveAttribute('data-scope', 'code-block');
    await expect.element(trigger).toHaveAttribute('data-part', 'copy-trigger');
    await expect.element(trigger).toHaveAttribute('data-variant', 'ghost');
    await expect.element(trigger).toHaveAttribute('data-size', 'sm');
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    expect(iconOf(trigger.element())).toBe(firstPath(copyIcon));
    await expect.element(status).toHaveAttribute('data-part', 'copy-status');
    await expect.element(status).toBeEmptyDOMElement();
  });

  test('copies the text of the content as it is when clicked', async () => {
    const writeText = stubClipboard();
    const screen = await render(
      <Block title="save-button.tsx" copy>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    await screen.rerender(
      <Block title="save-button.tsx" copy>
        <ShikiPre lines={STYLESHEETS} />
      </Block>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));

    expect(writeText).toHaveBeenCalledExactlyOnceWith(sourceOf(STYLESHEETS));
  });

  test('copies the value of the root, or its own value first', async () => {
    const writeText = stubClipboard();
    const screen = await render(
      <>
        <Block title="install.sh" value="pnpm add @contour-ui/react" copy>
          <ShikiPre lines={STYLESHEETS} />
        </Block>
        <CodeBlock.Root value="pnpm add @contour-ui/react">
          <CodeBlock.CopyTrigger value="npm install @contour-ui/react" label="Copy with npm" />
          <CodeBlock.Content>
            <ShikiPre lines={STYLESHEETS} />
          </CodeBlock.Content>
        </CodeBlock.Root>
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy with npm' }));

    expect(writeText.mock.calls).toStrictEqual([
      ['pnpm add @contour-ui/react'],
      ['npm install @contour-ui/react'],
    ]);
  });

  test('shows a check mark and announces the copy until the timeout', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    stubClipboard();
    const onStatusChange = vi.fn<(details: { copied: boolean }) => void>();
    const screen = await render(
      <CodeBlock.Root>
        <CodeBlock.CopyTrigger timeout={1000} onStatusChange={onStatusChange} />
        <CodeBlock.Content>
          <ShikiPre lines={STYLESHEETS} />
        </CodeBlock.Content>
      </CodeBlock.Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy code' });
    const status = screen.getByRole('status');

    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('data-copied', '');
    expect(iconOf(trigger.element())).toBe(firstPath(checkIcon));
    await expect.element(status).toHaveTextContent('Copied to clipboard');
    // The name stays: the icon is for the eyes, the status speaks.
    await expect.element(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }]]);

    vi.advanceTimersByTime(1000);
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    expect(iconOf(trigger.element())).toBe(firstPath(copyIcon));
    await expect.element(status).toBeEmptyDOMElement();
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }], [{ copied: false }]]);
  });

  test('shows and announces nothing when the browser refuses to write', async () => {
    const writeText = stubClipboard(() => Promise.reject(new Error('Not allowed')));
    const screen = await render(
      <Block copy>
        <ShikiPre lines={STYLESHEETS} />
      </Block>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy code' });

    await userEvent.click(trigger);

    await expect.poll(() => writeText.mock.results[0]?.type).toBe('return');
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    await expect.element(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  test('copies nothing when the owner cancels the click', async () => {
    const writeText = stubClipboard();
    const screen = await render(
      <CodeBlock.Root>
        <CodeBlock.CopyTrigger
          onClick={(event) => {
            event.preventDefault();
          }}
        />
        <CodeBlock.Content>
          <ShikiPre lines={STYLESHEETS} />
        </CodeBlock.Content>
      </CodeBlock.Root>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));

    expect(writeText).not.toHaveBeenCalled();
  });

  test('keeps the name of the figure the title, before and after a copy', async () => {
    stubClipboard();
    const screen = await render(
      <Block title="save-button.tsx" copy>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    const figure = screen.getByRole('figure', { name: 'save-button.tsx', exact: true });
    const title = screen.getByText('save-button.tsx');

    await expect.element(figure).toBeInTheDocument();
    await expect.element(figure).toHaveAttribute('aria-labelledby', title.element().id);

    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await expect.element(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');

    await expect
      .element(screen.getByRole('figure', { name: 'save-button.tsx', exact: true }))
      .toBeInTheDocument();
  });

  test('names the figure by a title only while one is mounted, and never over a name of its own', async () => {
    stubClipboard();
    const screen = await render(
      <Block title="save-button.tsx" copy>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    const figure = screen.getByRole('figure');
    await expect.element(figure).toHaveAttribute('aria-labelledby');

    await screen.rerender(
      <Block copy>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>,
    );
    await expect.element(figure).not.toHaveAttribute('aria-labelledby');

    await screen.rerender(
      <CodeBlock.Root aria-label="Save button">
        <CodeBlock.Header>
          <CodeBlock.Title>save-button.tsx</CodeBlock.Title>
        </CodeBlock.Header>
      </CodeBlock.Root>,
    );
    await expect.element(figure).not.toHaveAttribute('aria-labelledby');
    await expect.element(screen.getByRole('figure', { name: 'Save button' })).toBeInTheDocument();
  });

  test('renders no name on the server and hydrates to the title without a mismatch', async () => {
    stubClipboard();
    const block = (
      <Block title="save-button.tsx" copy>
        <ShikiPre lines={SAVE_BUTTON} />
      </Block>
    );
    const html = renderToString(block);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const errors: unknown[] = [];
    const root = hydrateRoot(container, block, {
      onRecoverableError: (error) => {
        errors.push(error);
      },
    });

    try {
      expect(html).not.toContain('aria-labelledby');
      await expect
        .poll(() => container.querySelector('figure')?.getAttribute('aria-labelledby'))
        .toBe(find(container, '.contour-code-block__title').id);
      expect(errors).toStrictEqual([]);
    } finally {
      root.unmount();
      container.remove();
    }
  });

  test('sits at the top end of a block without a title, above the code, on a phone too', async () => {
    stubClipboard();
    const screen = await render(
      <div style={{ inlineSize: '358px' }}>
        <Block copy>
          <ShikiPre lines={[...TRANSITION, ...STYLESHEETS]} />
        </Block>
      </div>,
    );
    const figure = screen.getByRole('figure').element().getBoundingClientRect();
    const trigger = screen.getByRole('button', { name: 'Copy code' }).element();
    const button = trigger.getBoundingClientRect();
    const firstLine = lineAt(screen.container, 0).getBoundingClientRect();

    // Not in a caption: a caption with only a button would name the figure after it.
    expect(screen.container.querySelector('figcaption')).toBeNull();
    expect(trigger.parentElement).toHaveClass('contour-code-block', { exact: true });
    await expect.element(screen.getByRole('figure')).not.toHaveAttribute('aria-labelledby');
    expect(button.right).toBeLessThanOrEqual(figure.right);
    expect(button.top).toBeGreaterThanOrEqual(figure.top);
    // Above the first line, however long it is: it covers no code.
    expect(button.bottom).toBeLessThanOrEqual(firstLine.top);
  });
});
